import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchOrdersByCustomer } from "../redux/slice/orderSlice";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
  Dimensions,
  RefreshControl,
  SafeAreaView,
  Modal,
  ScrollView,
  Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import moment from "moment";
import noOrders from "../assets/noOrders.avif";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialIcons";
import OrderModal from "../components/OrderDetailsModal";

const { width } = Dimensions.get('window');

const OrderHistoryScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  
  const orders = useSelector((state) => state.order.orders || []);
  const loading = useSelector((state) => state.order.loading?.orders || false);
  const error = useSelector((state) => state.order.error?.orders || null);

  const defaultFromDate = moment("2000-01-01");
  const defaultToDate = moment().add(1, 'day').endOf('day');

  const [dateRange, setDateRange] = useState([defaultFromDate, defaultToDate]);
  const [tempDateRange, setTempDateRange] = useState([defaultFromDate, defaultToDate]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState("from");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedOrderCode, setSelectedOrderCode] = useState(null);
  const [customerId, setCustomerId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('All Time');
  const [isApplyingFilter, setIsApplyingFilter] = useState(false);
  const [hasFetchedInitial, setHasFetchedInitial] = useState(false);

  const datePresets = [
    { label: 'All Time', fromDate: moment("2000-01-01"), toDate: moment().add(1, 'day'), icon: 'all-inclusive' },
    { label: 'Last 7 Days', days: 7, icon: 'today' },
    { label: 'Last 30 Days', days: 30, icon: 'date-range' },
    { label: 'Last 3 Months', days: 90, icon: 'calendar-today' },
    { label: 'Last 6 Months', days: 180, icon: 'event' },
    { label: 'This Year', fromDate: moment().startOf('year'), toDate: moment().add(1, 'day'), icon: 'event-note' },
    { label: 'Custom', days: null, icon: 'edit-calendar' },
  ];

  useEffect(() => {
    const initializeCustomer = async () => {
      try {
        const customerData = await AsyncStorage.getItem("customer");
    
        
        if (customerData) {
          const customerObject = JSON.parse(customerData);
    
          
          const accountNumber = customerObject?.customerAccountNumber;
          
          if (accountNumber) {
            setCustomerId(accountNumber);
          } else {
            console.error("No customer account number found");
          }
        } else {
          console.error("No customer data found in AsyncStorage");
        }
      } catch (error) {
        console.error("Error initializing customer data:", error);
      }
    };

    initializeCustomer();
  }, []);

  useEffect(() => {
    if (customerId && !hasFetchedInitial) {
    
      fetchOrders();
      setHasFetchedInitial(true);
    }
  }, [customerId]);

  const fetchOrders = async () => {
    if (!customerId) {
      console.error("Cannot fetch orders: customerId is null");
      return;
    }

    try {
      const [from, to] = dateRange.map((date) => date.format("MM/DD/YYYY"));
      await dispatch(fetchOrdersByCustomer({ from, to, customerId })).unwrap();
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const updatedDateRange = [...tempDateRange];
      updatedDateRange[datePickerMode === "from" ? 0 : 1] = moment(selectedDate);
      setTempDateRange(updatedDateRange);
    }
  };

  const handlePresetFilter = async (preset) => {
    setIsApplyingFilter(true);
    setSelectedPreset(preset.label);
    
    if (preset.days === null && !preset.fromDate) {
      setTempDateRange([...dateRange]);
      setShowDateRangeModal(true);
      setIsApplyingFilter(false);
    } else {
      let fromDate, toDate;
      
      if (preset.fromDate && preset.toDate) {
        fromDate = preset.fromDate.clone();
        toDate = preset.toDate.clone().endOf('day');
      } else {
        fromDate = moment().subtract(preset.days, 'days').startOf('day');
        toDate = moment().add(1, 'day').endOf('day');
      }
      
      setDateRange([fromDate, toDate]);
      
      setTimeout(async () => {
        if (customerId) {
          const [from, to] = [fromDate, toDate].map((date) => date.format("MM/DD/YYYY"));
          
          try {
            await dispatch(fetchOrdersByCustomer({ from, to, customerId })).unwrap();
          } catch (error) {
           
          }
        }
        setIsApplyingFilter(false);
      }, 300);
    }
  };

  const applyCustomDateRange = async () => {
    setIsApplyingFilter(true);
    setDateRange([...tempDateRange]);
    setShowDateRangeModal(false);
    setSelectedPreset('Custom');
    
    setTimeout(async () => {
      if (customerId) {
        const [from, to] = tempDateRange.map((date) => date.format("MM/DD/YYYY"));
        console.log("Applying custom date range:", { from, to, customerId });
        try {
          await dispatch(fetchOrdersByCustomer({ from, to, customerId })).unwrap();
        } catch (error) {
          console.error("Error fetching orders with custom range:", error);
        }
      }
      setIsApplyingFilter(false);
    }, 300);
  };

  const handleViewOrder = useCallback((order) => {
   
    
    // Try multiple possible field names for order code
    const orderCode = order?.orderCode || 
                      order?.OrderCode || 
                      order?.id || 
                      order?.orderId ||
                      order?.orderNumber ||
                      order?.salesOrderId ||
                      order?.code;
    
   
    
    if (!orderCode) {
    
      console.log("Available keys in order:", Object.keys(order || {}));
      Alert.alert(
        "Error",
        "Unable to open order details. Order code not found.",
        [{ text: "OK" }]
      );
      return;
    }
    
    // Ensure orderCode is a string and set state
    const orderCodeString = String(orderCode).trim();
    
    setSelectedOrderCode(orderCodeString);
    setIsModalVisible(true);
  }, []);

  const handleModalClose = useCallback(() => {
  
    setIsModalVisible(false);
    // Delay clearing orderCode to prevent flash
    setTimeout(() => {
      setSelectedOrderCode(null);
    }, 300);
  }, []);

  const getStatusColor = (status) => {
    const statusLower = String(status || '').toLowerCase();
    switch (statusLower) {
      case "Order Placement":
      case "multiple orders":
        return "#3B82F6";
      case "delivered":
      case "delivery":
      case "completed":
        return "#10B981";
      case "pending":
      case "processing":
        return "#F59E0B";
      case "cancelled":
      case "canceled":
        return "#EF4444";
      case "Delivery":
      case "shipping":
        return "#059669";
      case "wrong number":
      case "unreachable":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const getOrderStatus = (item) => {
    try {
      if (typeof item?.orderCycle === 'string') {
        return item.orderCycle;
      }
      if (typeof item?.orderCycle === 'object' && item?.orderCycle !== null) {
        return item.orderCycle.status || item.orderCycle.name || "Pending";
      }
      if (item?.status) {
        return item.status;
      }
      return "Pending";
    } catch (error) {
      console.error("Error getting order status:", error);
      return "Unknown";
    }
  };

  const getOrderDate = (item) => {
    try {
      if (item?.orderDate) {
        return moment(item.orderDate).format("MMM DD, YYYY");
      }
      if (item?.createdAt) {
        return moment(item.createdAt).format("MMM DD, YYYY");
      }
      if (item?.date) {
        return moment(item.date).format("MMM DD, YYYY");
      }
      return "Date not available";
    } catch (error) {
     
      return "Date not available";
    }
  };

  const getOrderCode = (item) => {
    return item?.orderCode || 
           item?.OrderCode || 
           item?.id || 
           item?.orderId ||
           item?.orderNumber || 
           "N/A";
  };

  const renderOrderItem = useCallback(({ item, index }) => {
    const orderStatus = getOrderStatus(item);
    const orderDate = getOrderDate(item);
    const orderCode = getOrderCode(item);

    return (
      <TouchableOpacity 
        style={[styles.orderCard, { marginTop: index === 0 ? 0 : 12 }]}
        onPress={() => {
          
          handleViewOrder(item);
        }}
        activeOpacity={0.95}
      >
        <View style={styles.orderCardContent}>
          <View style={styles.orderHeader}>
            <View style={styles.orderIdContainer}>
              <View style={styles.receiptIconContainer}>
                <Icon name="receipt-long" size={18} color="#10B981" />
              </View>
              <View>
                <Text style={styles.orderIdLabel}>Order</Text>
                <Text style={styles.orderId}>{orderCode}</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.viewOrderButton}
              onPress={(e) => {
                e.stopPropagation();
              
                handleViewOrder(item);
              }}
            >
              <Icon name="visibility" size={16} color="#10B981" />
              <Text style={styles.viewOrderText}>View</Text>
              <Icon name="chevron-right" size={16} color="#10B981" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.orderDetails}>
            <View style={styles.detailRow}>
              <Icon name="calendar-today" size={14} color="#6B7280" />
              <Text style={styles.orderDate}>{orderDate}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(orderStatus) }]} />
              <Text style={[styles.orderStatus, { color: getStatusColor(orderStatus) }]}>
                {orderStatus}
              </Text>
            
            </View>
          </View>
        
        </View>
      </TouchableOpacity>
    );
  }, [handleViewOrder]);

  const getDisplayDateRange = () => {
    if (selectedPreset === 'All Time') {
      return 'All Orders';
    }
    return `${dateRange[0].format("MMM DD, YYYY")} - ${dateRange[1].format("MMM DD, YYYY")}`;
  };

  const renderDateFilter = () => (
    <View style={styles.dateFilterContainer}>
      <View style={styles.filterHeader}>
        <View style={styles.filterTitleRow}>
          <Icon name="tune" size={20} color="#065f46" />
          <Text style={styles.filterTitle}>Filter Period</Text>
        </View>
        <View style={styles.dateRangeBadge}>
          <Icon name="event" size={12} color="#059669" />
          <Text style={styles.dateRangeBadgeText}>
            {getDisplayDateRange()}
          </Text>
        </View>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.presetsScroll}
      >
        {datePresets.map((preset, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.presetChip,
              selectedPreset === preset.label && styles.presetChipActive
            ]}
            onPress={() => handlePresetFilter(preset)}
            activeOpacity={0.7}
          >
            <Icon 
              name={preset.icon} 
              size={16} 
              color={selectedPreset === preset.label ? "#FFFFFF" : "#059669"} 
            />
            <Text style={[
              styles.presetChipText,
              selectedPreset === preset.label && styles.presetChipTextActive
            ]}>
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
      transparent={true}
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
                activeOpacity={0.7}
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
                activeOpacity={0.7}
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

            <View style={styles.durationBadge}>
              <Icon name="schedule" size={16} color="#059669" />
              <Text style={styles.durationText}>
                {tempDateRange[1].diff(tempDateRange[0], 'days') + 1} days selected
              </Text>
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
              onPress={applyCustomDateRange}
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

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <View style={styles.emptyStateImageContainer}>
        <Image source={noOrders} style={styles.emptyStateImage} />
      </View>
      <Text style={styles.emptyStateTitle}>No Orders Found</Text>
      <Text style={styles.emptyStateSubtitle}>
        No orders in this date range.{'\n'}Try adjusting your filter or start shopping!
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

  const transformedOrders = useMemo(() => {
    try {
      if (!Array.isArray(orders)) {
    
        return [];
      }
  
      const result = orders
        .filter(order => order != null)
        .map((order, index) => {
          const orderCode = order?.orderCode || 
                           order?.OrderCode || 
                           order?.id || 
                           order?.orderId ||
                           order?.orderNumber || 
                           index;
          
          return {
            ...order,
            key: `${orderCode}-${order.orderDate || Date.now()}-${index}`,
          };
        })
        .sort((a, b) => {
          const dateA = moment(a.orderDate || a.createdAt || 0);
          const dateB = moment(b.orderDate || b.createdAt || 0);
          return dateB.diff(dateA);
        });
  
      return result;
    } catch (error) {
      console.error("Error transforming orders:", error);
      return [];
    }
  }, [orders]);

  // Log modal state changes
  useEffect(() => {
   
  }, [isModalVisible, selectedOrderCode]);

  return (
    <SafeAreaView style={styles.container}>    
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.title}>Order History</Text>
            <Text style={styles.subtitle}>
              {orders.length} order{orders.length !== 1 ? 's' : ''} found
            </Text>
          </View>
        </View>
      </View>

      {renderDateFilter()}

      {(loading || isApplyingFilter) && !refreshing ? (
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
      ) : transformedOrders?.length > 0 ? (
        <FlatList 
          data={transformedOrders} 
          renderItem={renderOrderItem} 
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#10B981']}
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
          maximumDate={datePickerMode === "to" ? moment().add(1, 'day').toDate() : tempDateRange[1].toDate()}
          minimumDate={datePickerMode === "to" ? tempDateRange[0].toDate() : moment("2000-01-01").toDate()}
        />
      )}

      {renderDateRangeModal()}

      {/* Always render OrderModal when we have an orderCode */}
      {selectedOrderCode && (
        <OrderModal
          orderCode={selectedOrderCode}
          isModalVisible={isModalVisible}
          onClose={handleModalClose}
        />
      )}
    </SafeAreaView>
  );
};



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  dateFilterContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065f46',
  },
  dateRangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dateRangeBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#059669',
  },
  presetsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
    marginRight: 8,
  },
  presetChipActive: {
    backgroundColor: '#059669',
  },
  presetChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#059669',
  },
  presetChipTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  orderCardContent: {
    gap: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  receiptIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderIdLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  viewOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#D1FAE5',
  },
  viewOrderText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#10B981',
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  orderStatus: {
    fontSize: 14,
    fontWeight: '500',
  },
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  amountLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#EF4444',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateImageContainer: {
    width: 200,
    height: 200,
    marginBottom: 24,
  },
  emptyStateImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  startShoppingButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: "#10B981",
    gap: 8,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  startShoppingText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: width * 0.9,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalBody: {
    marginBottom: 20,
  },
  dateInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  dateInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateInputLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    fontWeight: '500',
  },
  dateInputValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateInputText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  dateArrow: {
    marginTop: 20,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'center',
  },
  durationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#059669',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  applyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 12,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default OrderHistoryScreen;