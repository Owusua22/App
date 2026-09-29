import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
  RefreshControl,
  SafeAreaView,
  Modal,
  ScrollView,
  Alert,
  Dimensions,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import moment from "moment";
import DateTimePicker from "@react-native-community/datetimepicker";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";

import noOrders from "../assets/noOrders.avif";
import OrderModal from "../components/OrderDetailsModal";
import {
  cancelOrder,
  fetchOrdersByCustomer,
  selectOrders,
  selectOrdersError,
  selectOrdersLoading,
} from "../redux/slice/orderSlice";
import {
  selectCurrentCustomer,
  selectIsAuthenticated,
} from "../redux/slice/customerSlice";

const { width } = Dimensions.get("window");

const DEFAULT_FROM = moment("2000-01-01").startOf("day");
const DEFAULT_TO = moment().add(1, "day").endOf("day");

const datePresets = [
  { label: "All Time", fromDate: DEFAULT_FROM, toDate: DEFAULT_TO, icon: "all-inclusive" },
  { label: "Last 7 Days", days: 7, icon: "today" },
  { label: "Last 30 Days", days: 30, icon: "date-range" },
  { label: "Last 3 Months", days: 90, icon: "calendar-today" },
  { label: "Last 6 Months", days: 180, icon: "event" },
  { label: "This Year", fromDate: moment().startOf("year"), toDate: DEFAULT_TO, icon: "event-note" },
  { label: "Custom", days: null, icon: "edit-calendar" },
];

function normalizeOrderCode(order, fallback) {
  const code =
    order?.orderCode ??
    order?.OrderCode ??
    order?.orderId ??
    order?.id ??
    order?.orderNumber ??
    order?.salesOrderId ??
    order?.code;

  return code != null ? String(code).trim() : String(fallback);
}

function normalizeOrderStatus(order) {
  const cycle = order?.orderCycle ?? order?.OrderCycle;
  const status =
    (typeof cycle === "string" && cycle) ||
    cycle?.status ||
    cycle?.name ||
    cycle?.cycleName ||
    cycle?.CycleName ||
    order?.status ||
    order?.Status ||
    order?.orderStatus ||
    order?.OrderStatus ||
    "Pending";

  return String(status).trim();
}

function isOrderPlacementStatus(order) {
  return normalizeOrderStatus(order).trim().toLowerCase() === "order placement";
}

function normalizeOrderDate(order) {
  const raw = order?.orderDate || order?.createdAt || order?.date;
  if (!raw) return "Date not available";
  return moment(raw).format("MMM DD, YYYY");
}

function getStatusColor(status) {
  const s = String(status || "").toLowerCase();
  if (["delivered", "delivery", "completed"].includes(s)) return "#10B981";
  if (["pending", "processing", "order placement"].includes(s)) return "#F59E0B";
  if (["cancelled", "canceled", "wrong number", "unreachable"].includes(s)) return "#EF4444";
  if (["multiple orders", "testing"].includes(s)) return "#9CA3AF";
  return "#6B7280";
}

export default function OrderHistoryScreen() {
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const orders = useSelector(selectOrders);
  const loading = useSelector(selectOrdersLoading);
  const error = useSelector(selectOrdersError);
  const currentCustomer = useSelector(selectCurrentCustomer);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const [customerId, setCustomerId] = useState(null);
  const [dateRange, setDateRange] = useState([DEFAULT_FROM.clone(), DEFAULT_TO.clone()]);
  const [tempDateRange, setTempDateRange] = useState([DEFAULT_FROM.clone(), DEFAULT_TO.clone()]);
  const [selectedPreset, setSelectedPreset] = useState("All Time");
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingOrderCode, setCancellingOrderCode] = useState(null);
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState("from");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedOrderCode, setSelectedOrderCode] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setCustomerId(null);
      return;
    }
    setCustomerId(currentCustomer?.customerAccountNumber || null);
  }, [isAuthenticated, currentCustomer]);

  const fetchOrders = useCallback(async () => {
    if (!customerId) return;
    const [from, to] = dateRange.map((date) => date.format("MM/DD/YYYY"));
    await dispatch(fetchOrdersByCustomer({ from, to, customerId })).unwrap();
  }, [dispatch, customerId, dateRange]);

  useEffect(() => {
    if (!customerId) return;
    fetchOrders().catch((fetchError) =>
      console.error("Error fetching orders:", fetchError)
    );
  }, [customerId, fetchOrders]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchOrders();
    } catch (refreshError) {
      console.error("Error refreshing orders:", refreshError);
    } finally {
      setRefreshing(false);
    }
  }, [fetchOrders]);

  const transformedOrders = useMemo(() => {
    const list = Array.isArray(orders) ? orders : [];
    return list
      .filter(Boolean)
      .map((order, index) => {
        const code = normalizeOrderCode(order, index);
        const dateKey = order?.orderDate || order?.createdAt || Date.now();
        return { ...order, __key: `${code}-${dateKey}-${index}` };
      })
      .sort((a, b) => {
        const da = moment(a?.orderDate || a?.createdAt || 0);
        const db = moment(b?.orderDate || b?.createdAt || 0);
        return db.diff(da);
      });
  }, [orders]);

  const handleViewOrder = useCallback((order) => {
    const code = normalizeOrderCode(order, null);
    if (!code || code === "null" || code === "undefined") {
      Alert.alert("Error", "Unable to open order details. Order code not found.");
      return;
    }
    setSelectedOrderCode(code);
    setIsModalVisible(true);
  }, []);

  const handleCancelOrder = useCallback(
    (order) => {
      const code = normalizeOrderCode(order, null);
      if (!code || code === "null" || code === "undefined") {
        Alert.alert("Error", "Unable to cancel this order. Order code not found.");
        return;
      }
      if (!isOrderPlacementStatus(order)) return;

      Alert.alert(
        "Cancel Order",
        `Are you sure you want to cancel order ${code}? This action cannot be undone.`,
        [
          { text: "Keep Order", style: "cancel" },
          {
            text: "Cancel Order",
            style: "destructive",
            onPress: async () => {
              setCancellingOrderCode(code);
              try {
                await dispatch(cancelOrder(code)).unwrap();
                // cancelOrder updates the Redux list immediately; refetch to
                // make the server's final status the source of truth as well.
                try {
                  await fetchOrders();
                } catch (refreshError) {
                  console.warn("Order cancelled, but history refresh failed:", refreshError);
                }
                Alert.alert("Order Cancelled", `Order ${code} has been cancelled.`);
              } catch (cancelError) {
                const message =
                  cancelError?.message ||
                  (typeof cancelError === "string" ? cancelError : null) ||
                  "The order could not be cancelled. Please try again.";
                Alert.alert("Cancellation Failed", message);
              } finally {
                setCancellingOrderCode(null);
              }
            },
          },
        ]
      );
    },
    [dispatch, fetchOrders]
  );

  const handleModalClose = useCallback(() => {
    setIsModalVisible(false);
    setTimeout(() => setSelectedOrderCode(null), 250);
  }, []);

  const applyPreset = useCallback(
    (preset) => {
      setSelectedPreset(preset.label);

      if (preset.days === null && !preset.fromDate) {
        setTempDateRange([...dateRange]);
        setShowDateRangeModal(true);
        return;
      }

      let fromDate;
      let toDate;
      if (preset.fromDate && preset.toDate) {
        fromDate = preset.fromDate.clone().startOf("day");
        toDate = preset.toDate.clone().endOf("day");
      } else {
        fromDate = moment().subtract(preset.days, "days").startOf("day");
        toDate = moment().add(1, "day").endOf("day");
      }
      setDateRange([fromDate, toDate]);
    },
    [dateRange]
  );

  const applyCustomRange = useCallback(() => {
    if (tempDateRange[0].isAfter(tempDateRange[1], "day")) {
      Alert.alert("Invalid Date Range", "The start date must be before the end date.");
      return;
    }
    setSelectedPreset("Custom");
    setDateRange([...tempDateRange]);
    setShowDateRangeModal(false);
  }, [tempDateRange]);

  const handleDateChange = useCallback(
    (event, selectedDate) => {
      setShowDatePicker(false);
      if (!selectedDate) return;
      setTempDateRange((previous) => {
        const next = [...previous];
        next[datePickerMode === "from" ? 0 : 1] = moment(selectedDate);
        return next;
      });
    },
    [datePickerMode]
  );

  const displayRange = useMemo(() => {
    if (selectedPreset === "All Time") return "All Orders";
    return `${dateRange[0].format("MMM DD, YYYY")} - ${dateRange[1].format("MMM DD, YYYY")}`;
  }, [selectedPreset, dateRange]);

  const renderOrderItem = ({ item, index }) => {
    const status = normalizeOrderStatus(item);
    const date = normalizeOrderDate(item);
    const code = normalizeOrderCode(item, index);
    const canCancel = isOrderPlacementStatus(item);
    const isCancelling = cancellingOrderCode === code;

    return (
      <View style={[styles.orderCard, { marginTop: index === 0 ? 0 : 12 }]}>
        <TouchableOpacity
          style={styles.orderCardContent}
          onPress={() => handleViewOrder(item)}
          activeOpacity={0.92}
        >
          <View style={styles.orderHeader}>
            <View style={styles.orderIdContainer}>
              <View style={styles.receiptIconContainer}>
                <Icon name="receipt-long" size={18} color="#10B981" />
              </View>
              <View>
                <Text style={styles.orderIdLabel}>Order</Text>
                <Text style={styles.orderId}>{code}</Text>
              </View>
            </View>

            <View style={styles.viewOrderButton}>
              <Icon name="visibility" size={16} color="#10B981" />
              <Text style={styles.viewOrderText}>View</Text>
              <Icon name="chevron-right" size={16} color="#10B981" />
            </View>
          </View>

          <View style={styles.orderDetails}>
            <View style={styles.detailRow}>
              <Icon name="calendar-today" size={14} color="#6B7280" />
              <Text style={styles.orderDate}>{date}</Text>
            </View>

            <View style={styles.detailRow}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]} />
              <Text style={[styles.orderStatus, { color: getStatusColor(status) }]}>
                {status}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Only orders whose status is exactly "Order Placement" can be cancelled. */}
        {canCancel && (
          <TouchableOpacity
            style={[styles.cancelOrderButton, isCancelling && styles.cancelOrderButtonDisabled]}
            onPress={() => handleCancelOrder(item)}
            disabled={Boolean(cancellingOrderCode)}
            activeOpacity={0.8}
          >
            {isCancelling ? (
              <ActivityIndicator size="small" color="#B91C1C" />
            ) : (
              <Icon name="cancel" size={17} color="#B91C1C" />
            )}
            <Text style={styles.cancelOrderText}>
              {isCancelling ? "Cancelling…" : "Cancel Order"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <View style={styles.emptyStateImageContainer}>
        <Image source={noOrders} style={styles.emptyStateImage} />
      </View>
      <Text style={styles.emptyStateTitle}>No Orders Found</Text>
      <Text style={styles.emptyStateSubtitle}>
        No orders in this date range.{"\n"}Try adjusting your filter or start shopping!
      </Text>
      <TouchableOpacity
        style={styles.startShoppingButton}
        onPress={() => navigation.navigate("Home", { screen: "Products" })}
        activeOpacity={0.9}
      >
        <Icon name="shopping-bag" size={18} color="#FFFFFF" />
        <Text style={styles.startShoppingText}>Start Shopping</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDateFilter = () => (
    <View style={styles.dateFilterContainer}>
      <View style={styles.filterHeader}>
        <View style={styles.filterTitleRow}>
          <Icon name="tune" size={20} color="#065f46" />
          <Text style={styles.filterTitle}>Filter Period</Text>
        </View>
        <View style={styles.dateRangeBadge}>
          <Icon name="event" size={12} color="#059669" />
          <Text style={styles.dateRangeBadgeText}>{displayRange}</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.presetsScroll}
      >
        {datePresets.map((preset) => (
          <TouchableOpacity
            key={preset.label}
            style={[styles.presetChip, selectedPreset === preset.label && styles.presetChipActive]}
            onPress={() => applyPreset(preset)}
            activeOpacity={0.7}
          >
            <Icon
              name={preset.icon}
              size={16}
              color={selectedPreset === preset.label ? "#FFFFFF" : "#059669"}
            />
            <Text
              style={[
                styles.presetChipText,
                selectedPreset === preset.label && styles.presetChipTextActive,
              ]}
            >
              {preset.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderDateRangeModal = () => (
    <Modal
      visible={showDateRangeModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowDateRangeModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Custom Date Range</Text>
            <TouchableOpacity onPress={() => setShowDateRangeModal(false)}>
              <Icon name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.dateInputsRow}>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => {
                  setDatePickerMode("from");
                  setShowDatePicker(true);
                }}
              >
                <Text style={styles.dateInputLabel}>From Date</Text>
                <View style={styles.dateInputValue}>
                  <Icon name="event" size={18} color="#10B981" />
                  <Text style={styles.dateInputText}>
                    {tempDateRange[0].format("MMM DD, YYYY")}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.dateArrow}>
                <Icon name="arrow-forward" size={20} color="#10B981" />
              </View>

              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => {
                  setDatePickerMode("to");
                  setShowDatePicker(true);
                }}
              >
                <Text style={styles.dateInputLabel}>To Date</Text>
                <View style={styles.dateInputValue}>
                  <Icon name="event" size={18} color="#10B981" />
                  <Text style={styles.dateInputText}>
                    {tempDateRange[1].format("MMM DD, YYYY")}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowDateRangeModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={applyCustomRange}
              activeOpacity={0.7}
            >
              <Icon name="check" size={18} color="#FFFFFF" />
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const count = Array.isArray(orders) ? orders.length : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.title}>Order History</Text>
            <Text style={styles.subtitle}>
              {count} order{count !== 1 ? "s" : ""} found
            </Text>
          </View>
        </View>
      </View>

      {renderDateFilter()}

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>Failed to load orders</Text>
          <Text style={styles.errorSubtext}>{String(error)}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchOrders} activeOpacity={0.8}>
            <Icon name="refresh" size={18} color="#FFFFFF" />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : transformedOrders.length > 0 ? (
        <FlatList
          data={transformedOrders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.__key}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#10B981"]}
              tintColor="#10B981"
            />
          }
        />
      ) : (
        renderEmptyState()
      )}

      {showDatePicker && (
        <DateTimePicker
          value={tempDateRange[datePickerMode === "from" ? 0 : 1].toDate()}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={
            datePickerMode === "to"
              ? moment().add(1, "day").toDate()
              : tempDateRange[1].toDate()
          }
          minimumDate={
            datePickerMode === "to"
              ? tempDateRange[0].toDate()
              : moment("2000-01-01").toDate()
          }
        />
      )}

      {renderDateRangeModal()}

      {selectedOrderCode && (
        <OrderModal
          orderCode={selectedOrderCode}
          isModalVisible={isModalVisible}
          onClose={handleModalClose}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 14, color: "#6B7280", marginTop: 4 },
  dateFilterContainer: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  filterTitle: { fontSize: 16, fontWeight: "600", color: "#065f46" },
  dateRangeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dateRangeBadgeText: { fontSize: 12, fontWeight: "500", color: "#059669" },
  presetsScroll: { paddingHorizontal: 16, gap: 8 },
  presetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#D1FAE5",
    marginRight: 8,
  },
  presetChipActive: { backgroundColor: "#059669" },
  presetChipText: { fontSize: 14, fontWeight: "500", color: "#059669" },
  presetChipTextActive: { color: "#FFFFFF" },
  listContainer: { padding: 16 },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  orderCardContent: { gap: 12 },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderIdContainer: { flexDirection: "row", alignItems: "center", gap: 12 },
  receiptIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#D1FAE5",
    justifyContent: "center",
    alignItems: "center",
  },
  orderIdLabel: { fontSize: 12, color: "#6B7280" },
  orderId: { fontSize: 16, fontWeight: "600", color: "#111827" },
  viewOrderButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#D1FAE5",
  },
  viewOrderText: { fontSize: 14, fontWeight: "500", color: "#10B981" },
  orderDetails: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  orderDate: { fontSize: 14, color: "#6B7280" },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  orderStatus: { fontSize: 14, fontWeight: "500" },
  cancelOrderButton: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    minWidth: 132,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  cancelOrderButtonDisabled: { opacity: 0.6 },
  cancelOrderText: { color: "#B91C1C", fontSize: 13, fontWeight: "700" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  loadingText: { fontSize: 16, color: "#6B7280" },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16, padding: 32 },
  errorText: { fontSize: 18, fontWeight: "600", color: "#EF4444" },
  errorSubtext: { fontSize: 14, color: "#6B7280", textAlign: "center" },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#10B981",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  emptyStateContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  emptyStateImageContainer: { width: 200, height: 200, marginBottom: 24 },
  emptyStateImage: { width: "100%", height: "100%", resizeMode: "contain" },
  emptyStateTitle: { fontSize: 20, fontWeight: "700", color: "#111827", marginBottom: 8 },
  emptyStateSubtitle: { fontSize: 14, color: "#6B7280", textAlign: "center", marginBottom: 24 },
  startShoppingButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: "#10B981",
    gap: 8,
  },
  startShoppingText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, width: width * 0.9, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  modalBody: { marginBottom: 20 },
  dateInputsRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  dateInput: { flex: 1, backgroundColor: "#F9FAFB", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB" },
  dateInputLabel: { fontSize: 12, color: "#6B7280", marginBottom: 8, fontWeight: "500" },
  dateInputValue: { flexDirection: "row", alignItems: "center", gap: 8 },
  dateInputText: { fontSize: 14, color: "#111827", fontWeight: "600" },
  dateArrow: { marginTop: 20 },
  modalFooter: { flexDirection: "row", gap: 12 },
  cancelButton: { flex: 1, backgroundColor: "#F3F4F6", paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  cancelButtonText: { fontSize: 16, fontWeight: "600", color: "#6B7280" },
  applyButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#10B981", paddingVertical: 12, borderRadius: 12 },
  applyButtonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
});
