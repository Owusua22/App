import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import CachedImage from "./CachedImage";
import { useDispatch, useSelector } from "react-redux";
import Icon from "react-native-vector-icons/MaterialIcons";
import * as FileSystem from "expo-file-system/legacy";
import { generateOrderInvoiceBase64 } from "../utils/Invoicepdf";
import { collectApiRecords, resolveDeliveryDetails } from "../utils/orderDeliveryDetails";

import {
  fetchSalesOrderById,
  fetchOrderDeliveryAddress,
  selectOrderSlice,
} from "../redux/slice/orderSlice";

const { width } = Dimensions.get("window");
const backendBaseURL = "https://testing.frankotrading.com";

async function saveInvoicePdfToDevice(filename, pdfBase64) {
  if (Platform.OS === "android") {
    const storage = FileSystem.StorageAccessFramework;
    if (!storage) {
      throw new Error(
        "This Expo FileSystem version does not expose Android's Storage Access Framework."
      );
    }
    const downloadsUri = storage.getUriForDirectoryInRoot("Download");
    const permission = await storage.requestDirectoryPermissionsAsync(downloadsUri);
    if (!permission.granted || !permission.directoryUri) {
      return { cancelled: true };
    }

    // Storage Access Framework adds the PDF extension from the MIME type.
    const baseName = filename.replace(/\.pdf$/i, "");
    const fileUri = await storage.createFileAsync(
      permission.directoryUri,
      baseName,
      "application/pdf"
    );
    await FileSystem.writeAsStringAsync(fileUri, pdfBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const inDownloads = permission.directoryUri.toLowerCase().includes("download");
    return {
      fileUri,
      destination: inDownloads ? "the selected Downloads folder" : "the selected folder",
    };
  }

  // iOS has no public Downloads directory. Save into Documents so the PDF can
  // be exposed through the Files app when expo-file-system file sharing is enabled.
  const documentsDirectory = FileSystem.documentDirectory;
  if (!documentsDirectory) {
    throw new Error("The device did not provide a writable Documents folder.");
  }
  const invoicesDirectory = `${documentsDirectory}Invoices/`;
  const directoryInfo = await FileSystem.getInfoAsync(invoicesDirectory);
  if (!directoryInfo.exists) {
    await FileSystem.makeDirectoryAsync(invoicesDirectory, { intermediates: true });
  }

  const fileUri = `${invoicesDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, pdfBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  if (!fileInfo.exists || fileInfo.size === 0) {
    throw new Error("The invoice PDF was not written to the app's Documents folder.");
  }

  return {
    fileUri,
    destination: "Files app > On My iPhone > this app > Invoices",
  };
}

const OrderModal = ({ orderCode, isModalVisible, onClose }) => {
  const dispatch = useDispatch();
  const orderState = useSelector(selectOrderSlice);
  const {
    salesOrder = [],
    deliveryAddress = [],
    loading: rawLoading,
    error: rawError,
  } = orderState;

  const loading = rawLoading && typeof rawLoading === "object" ? rawLoading : {};
  const error = rawError && typeof rawError === "object" ? rawError : {};

  const [imagePreview, setImagePreview] = useState({ visible: false, url: null });
  const [localLoading, setLocalLoading] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    if (!isModalVisible || !orderCode) return;

    let active = true;
    const fetchData = async () => {
      setLocalLoading(true);
      setFetchError(null);

      try {
        const code = String(orderCode).trim();
        await Promise.all([
          dispatch(fetchSalesOrderById(code)).unwrap(),
          dispatch(fetchOrderDeliveryAddress(code)).unwrap(),
        ]);
      } catch (fetchErr) {
        console.error("Error fetching order data:", fetchErr);
        if (active) {
          setFetchError(
            fetchErr?.message || fetchErr?.error || String(fetchErr)
          );
        }
      } finally {
        if (active) setLocalLoading(false);
      }
    };

    fetchData();
    return () => {
      active = false;
    };
  }, [dispatch, orderCode, isModalVisible]);

  const formatPrice = (amount) => {
    const number = parseFloat(amount ?? 0);
    return Number.isFinite(number) ? number.toFixed(2) : "0.00";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Date not available";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "Invalid date";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const orderItems = Array.isArray(salesOrder)
    ? salesOrder
    : salesOrder
    ? [salesOrder]
    : [];

  const getQuantity = (item) => parseInt(item?.quantity ?? 0, 10) || 0;
  const getUnitPrice = (item) =>
    parseFloat(item?.price ?? item?.unitPrice ?? 0) || 0;
  const getLineTotal = (item) => {
    const amount = Number(item?.amount ?? item?.total);
    return Number.isFinite(amount) && amount > 0
      ? amount
      : getUnitPrice(item) * getQuantity(item);
  };

  const totalAmount = orderItems.reduce(
    (total, item) => total + getLineTotal(item),
    0
  );
  const totalItems = orderItems.reduce(
    (total, item) => total + getQuantity(item),
    0
  );

  const orderData = orderItems[0] || {};
  const deliveryDetails = resolveDeliveryDetails(orderItems, deliveryAddress);
  const displayOrderDate =
    orderData?.orderDate || orderData?.createdAt || orderData?.date;
  const orderStatus = String(
    orderData?.orderCycle?.status ||
      orderData?.orderCycle?.name ||
      orderData?.orderCycle ||
      orderData?.status ||
      orderData?.Status ||
      "Order details"
  );
  const storeLoading = Boolean(loading.salesOrder || loading.deliveryAddress);
  const isLoading = localLoading || storeLoading;
  const storeError = error.salesOrder || error.deliveryAddress;
  const hasError = Boolean(fetchError || storeError);

  const handleRetry = () => {
    setFetchError(null);
    if (!orderCode) return;

    const code = String(orderCode).trim();
    setLocalLoading(true);
    Promise.all([
      dispatch(fetchSalesOrderById(code)).unwrap(),
      dispatch(fetchOrderDeliveryAddress(code)).unwrap(),
    ])
      .catch((retryError) => {
        console.error("Retry error:", retryError);
        setFetchError(
          retryError?.message || retryError?.error || "Failed to reload order data"
        );
      })
      .finally(() => setLocalLoading(false));
  };

  const handleDownloadInvoice = async () => {
    if (!orderItems.length) {
      Alert.alert("Invoice unavailable", "No order items are available to include.");
      return;
    }

    setInvoiceLoading(true);
    let fileUri = null;
    try {
      const code = String(orderCode).trim();
      const missingDeliveryFields = [
        !deliveryDetails.recipientName && "recipient name",
        !deliveryDetails.recipientContactNumber && "contact number",
        !deliveryDetails.address && "delivery address",
      ].filter(Boolean);
      if (missingDeliveryFields.length) {
        console.warn("[Invoice] Delivery fields were not found in the API payload", {
          missing: missingDeliveryFields,
          deliveryKeys: [
            ...new Set(
              collectApiRecords(deliveryAddress).flatMap((record) => Object.keys(record))
            ),
          ],
          orderKeys: [
            ...new Set(collectApiRecords(orderItems).flatMap((record) => Object.keys(record))),
          ],
        });
      }

      const safeCode = code.replace(/[^a-zA-Z0-9_-]/g, "_") || "order";
      const filename = `invoice-${safeCode}-${Date.now()}.pdf`;
      const pdfBase64 = await generateOrderInvoiceBase64({
        orderCode: code,
        orderDate: formatDate(displayOrderDate),
        invoiceDate: new Date().toLocaleDateString("en-GH"),
        recipientName: deliveryDetails.recipientName || "Not provided",
        recipientContactNumber:
          deliveryDetails.recipientContactNumber || "Not provided",
        deliveryAddress: deliveryDetails.address || "Not provided",
        items: orderItems.map((item) => ({
          name: item?.productName || "Product",
          quantity: getQuantity(item),
          unitPrice: getUnitPrice(item),
          lineTotal: getLineTotal(item),
        })),
        totalAmount,
      });

      const savedFile = await saveInvoicePdfToDevice(filename, pdfBase64);
      if (savedFile.cancelled) {
        Alert.alert("Download cancelled", "Choose a folder to save the invoice PDF.");
        return;
      }

      fileUri = savedFile.fileUri;
      console.info("Invoice PDF downloaded", {
        platform: Platform.OS,
        uri: fileUri,
        filename,
      });
      Alert.alert(
        "Invoice downloaded",
        `Saved ${filename} to ${savedFile.destination}.`
      );
    } catch (invoiceError) {
      console.error("Invoice download failed:", {
        platform: Platform.OS,
        uri: fileUri,
        error: invoiceError,
      });
      Alert.alert(
        "Invoice Download Failed",
        invoiceError?.message || "Could not save the invoice PDF. Please try again."
      );
    } finally {
      setInvoiceLoading(false);
    }
  };

  const renderProductImage = (item) => {
    const imagePath = item?.imagePath;
    const imageFileName = imagePath ? imagePath.split("\\").pop() : null;
    const imageUrl = imageFileName
      ? `${backendBaseURL}/Media/Products_Images/${imageFileName}`
      : null;

    return (
      <TouchableOpacity
        style={styles.productImageContainer}
        onPress={() => imageUrl && setImagePreview({ visible: true, url: imageUrl })}
        activeOpacity={0.8}
      >
        <View style={styles.imageWrapper}>
          {imageUrl ? (
            <CachedImage
              source={{ uri: imageUrl }}
              style={styles.productImage}
              recyclingKey={item?.productId ?? item?.productID}
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Icon name="inventory-2" size={32} color="#a7f3d0" />
            </View>
          )}

          <View style={styles.quantityBadge}>
            <Text style={styles.quantityBadgeText}>{item?.quantity || 0}</Text>
          </View>

          {imageUrl && (
            <View style={styles.viewOverlay}>
              <Icon name="visibility" size={16} color="white" />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (!isModalVisible || !orderCode) return null;

  if (isLoading) {
    return (
      <Modal visible transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.loaderContainer}>
          <View style={styles.loaderCard}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={styles.loaderText}>Loading order details...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  if (hasError) {
    const errorMessage =
      fetchError || storeError || "An unexpected error occurred while loading the order.";

    return (
      <Modal visible transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.errorContainer}>
          <View style={styles.errorCard}>
            <View style={styles.errorIcon}>
              <Icon name="error-outline" size={48} color="#ef4444" />
            </View>
            <Text style={styles.errorTitle}>Unable to load order</Text>
            <Text style={styles.errorText}>{String(errorMessage)}</Text>
            <Text style={styles.errorSubtext}>Order: {orderCode}</Text>
            <View style={styles.errorActions}>
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                <Icon name="refresh" size={18} color="#FFFFFF" />
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  if (!orderItems.length) {
    return (
      <Modal visible transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.errorContainer}>
          <View style={styles.errorCard}>
            <View style={styles.emptyIcon}>
              <Icon name="inbox" size={64} color="#9ca3af" />
            </View>
            <Text style={styles.emptyTitle}>No order details found</Text>
            <Text style={styles.emptyText}>
              Order #{orderCode} has no items or couldn't be loaded.
            </Text>
            <View style={styles.errorActions}>
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                <Icon name="refresh" size={18} color="#FFFFFF" />
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <>
      <Modal visible transparent animationType="slide" onRequestClose={onClose}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <View style={styles.headerLeft}>
                  <View style={styles.headerIcon}>
                    <Icon name="receipt-long" size={28} color="white" />
                  </View>
                  <View>
                    <Text style={styles.headerTitle}>Order Details</Text>
                    <Text style={styles.headerSubtitle}>#{orderCode}</Text>
                  </View>
                </View>
                <View style={styles.statusBadge}>
                  <Icon
                    name="info"
                    size={16}
                    color="white"
                    style={styles.statusIcon}
                  />
                  <Text style={styles.statusBadgeText} numberOfLines={1}>
                    {orderStatus}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.closeIconButton} onPress={onClose}>
                <Icon name="close" size={28} color="white" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContentContainer}
            >
              <View style={styles.summaryCardsRow}>
                <View style={[styles.summaryCard, styles.dateCard]}>
                  <View style={styles.summaryCardIcon}>
                    <Icon name="event" size={22} color="white" />
                  </View>
                  <View style={styles.summaryCardContent}>
                    <Text style={styles.summaryCardLabel}>Order Date</Text>
                    <Text style={styles.summaryCardValue}>
                      {formatDate(displayOrderDate)}
                    </Text>
                  </View>
                </View>

                <View style={[styles.summaryCard, styles.itemsCard]}>
                  <View style={[styles.summaryCardIcon, styles.itemsCardIcon]}>
                    <Icon name="shopping-cart" size={22} color="white" />
                  </View>
                  <View style={styles.summaryCardContent}>
                    <Text style={styles.summaryCardLabel}>Total Items</Text>
                    <Text style={[styles.summaryCardValue, styles.itemsValue]}>
                      {totalItems}
                    </Text>
                  </View>
                </View>

                <View style={[styles.summaryCard, styles.amountCard]}>
                  <View style={[styles.summaryCardIcon, styles.amountCardIcon]}>
                    <Icon name="account-balance-wallet" size={22} color="white" />
                  </View>
                  <View style={styles.summaryCardContent}>
                    <Text style={styles.summaryCardLabel}>Amount</Text>
                    <Text style={[styles.summaryCardValue, styles.amountValue]}>
                      GH₵ {formatPrice(totalAmount)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.deliveryCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={styles.cardHeaderIcon}>
                      <Icon name="local-shipping" size={22} color="white" />
                    </View>
                    <Text style={styles.cardHeaderTitle}>Delivery Information</Text>
                  </View>
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.deliveryInfoGrid}>
                    <View style={styles.deliveryInfoSection}>
                      <View style={styles.infoRow}>
                        <View style={[styles.infoIconWrapper, styles.personIcon]}>
                          <Icon name="person" size={20} color="#10b981" />
                        </View>
                        <View style={styles.infoTextContainer}>
                          <Text style={styles.infoLabel}>Recipient Name</Text>
                          <Text style={styles.infoValue}>
                            {deliveryDetails.recipientName || "Not provided"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.infoRow}>
                        <View style={[styles.infoIconWrapper, styles.phoneIcon]}>
                          <Icon name="phone" size={20} color="#10b981" />
                        </View>
                        <View style={styles.infoTextContainer}>
                          <Text style={styles.infoLabel}>Contact Number</Text>
                          <Text style={styles.infoValue}>
                            {deliveryDetails.recipientContactNumber || "Not provided"}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.deliveryInfoSection}>
                      <View style={styles.infoRow}>
                        <View style={[styles.infoIconWrapper, styles.locationIcon]}>
                          <Icon name="location-on" size={20} color="#10b981" />
                        </View>
                        <View style={styles.infoTextContainer}>
                          <Text style={styles.infoLabel}>Delivery Address</Text>
                          <Text style={styles.infoValue}>
                            {deliveryDetails.address || "Not provided"}
                          </Text>
                        </View>
                      </View>

                      {!!deliveryDetails.orderNote && (
                        <View style={styles.infoRow}>
                          <View style={[styles.infoIconWrapper, styles.noteIcon]}>
                            <Icon name="note" size={20} color="#10b981" />
                          </View>
                          <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabel}>Special Notes</Text>
                            <Text style={[styles.infoValue, styles.noteText]}>
                              {deliveryDetails.orderNote}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.orderItemsCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={[styles.cardHeaderIcon, styles.orderItemsIcon]}>
                      <Icon name="inventory" size={22} color="white" />
                    </View>
                    <Text style={styles.cardHeaderTitle}>Order Items</Text>
                  </View>
                  <View style={styles.itemsCountBadge}>
                    <Text style={styles.itemsCountBadgeText}>
                      {orderItems.length} items
                    </Text>
                  </View>
                </View>

                <View style={styles.cardContent}>
                  {orderItems.map((item, index) => {
                    const quantity = getQuantity(item);
                    const price = getUnitPrice(item);
                    const subtotal = getLineTotal(item);

                    return (
                      <View key={`${item?.productId || item?.productName || "item"}-${index}`} style={styles.productItem}>
                        {renderProductImage(item)}
                        <View style={styles.productDetails}>
                          <View style={styles.productHeader}>
                            <Text style={styles.productName}>
                              {item?.productName || "Product Name Not Available"}
                            </Text>
                            <Text style={styles.productItemNumber}>Item #{index + 1}</Text>
                          </View>

                          <View style={styles.productInfoGrid}>
                            <View style={styles.productInfoItem}>
                              <Text style={styles.productInfoLabel}>Quantity</Text>
                              <View style={styles.quantityContainer}>
                                <Text style={[styles.productInfoValue, styles.quantityValue]}>
                                  {quantity}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.productInfoItem}>
                              <Text style={styles.productInfoLabel}>Unit Price</Text>
                              <View style={styles.priceContainer}>
                                <Text style={[styles.productInfoValue, styles.priceValue]}>
                                  GH₵ {formatPrice(price)}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.productInfoItem}>
                              <Text style={styles.productInfoLabel}>Subtotal</Text>
                              <View style={styles.subtotalContainer}>
                                <Text style={[styles.productInfoValue, styles.subtotalValue]}>
                                  GH₵ {formatPrice(subtotal)}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <View style={styles.footerContent}>
                <View style={styles.footerTotals}>
                  <View style={styles.totalSection}>
                    <View style={styles.totalIconContainer}>
                      <Icon name="shopping-cart" size={16} color="#10b981" />
                    </View>
                    <View>
                      <Text style={styles.totalItemsLabel}>Total Items</Text>
                      <Text style={styles.totalItemsValue}>{totalItems}</Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.totalSection}>
                    <View style={styles.totalIconContainer}>
                      <Icon name="account-balance-wallet" size={16} color="#10b981" />
                    </View>
                    <View>
                      <Text style={styles.totalAmountLabel}>Total Amount</Text>
                      <Text style={styles.totalAmountValue}>
                        GH₵ {formatPrice(totalAmount)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.invoiceButton, invoiceLoading && styles.invoiceButtonDisabled]}
                onPress={handleDownloadInvoice}
                disabled={invoiceLoading || !orderItems.length}
                activeOpacity={0.85}
              >
                {invoiceLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Icon name="file-download" size={19} color="#FFFFFF" />
                )}
                <Text style={styles.invoiceButtonText}>
                  {invoiceLoading ? "Preparing Invoice…" : "Download Invoice PDF"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={imagePreview.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setImagePreview({ visible: false, url: null })}
      >
        <View style={styles.imagePreviewContainer}>
          <TouchableOpacity
            style={styles.imagePreviewBackdrop}
            onPress={() => setImagePreview({ visible: false, url: null })}
            activeOpacity={1}
          >
            <View style={styles.imagePreviewContent}>
              {imagePreview.url && (
                <CachedImage
                  source={{ uri: imagePreview.url }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              )}
              <TouchableOpacity
                style={styles.closePreviewButton}
                onPress={() => setImagePreview({ visible: false, url: null })}
              >
                <Icon name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
};

export default OrderModal;

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.85)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#f9fafb",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingBottom: 8,
  },
  header: {
    backgroundColor: "#10b981",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flexDirection: "row",
    alignItems: "center",
  },
  headerContent: { flex: 1, flexDirection: "row", alignItems: "center" },
  headerLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  headerTitle: { color: "white", fontSize: 18, fontWeight: "700" },
  headerSubtitle: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 },
  closeIconButton: { marginLeft: 8 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16,185,129,0.3)",
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 130,
  },
  statusIcon: { marginRight: 4 },
  statusBadgeText: { color: "white", fontSize: 11, fontWeight: "600", flexShrink: 1 },
  scrollContent: { maxHeight: "78%" },
  scrollContentContainer: { padding: 16, paddingBottom: 24 },
  summaryCardsRow: { flexDirection: "row", marginBottom: 16 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 10, marginHorizontal: 4, flexDirection: "row", alignItems: "center" },
  dateCard: { backgroundColor: "#ecfdf5" },
  itemsCard: { backgroundColor: "#eff6ff" },
  amountCard: { backgroundColor: "#fef3c7" },
  summaryCardIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#10b981", alignItems: "center", justifyContent: "center", marginRight: 8 },
  itemsCardIcon: { backgroundColor: "#3b82f6" },
  amountCardIcon: { backgroundColor: "#f59e0b" },
  summaryCardContent: { flex: 1 },
  summaryCardLabel: { fontSize: 11, color: "#6b7280", marginBottom: 2 },
  summaryCardValue: { fontSize: 13, color: "#111827", fontWeight: "600" },
  itemsValue: { color: "#1d4ed8" },
  amountValue: { color: "#92400e" },
  deliveryCard: { backgroundColor: "white", borderRadius: 16, padding: 12, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center" },
  cardHeaderIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#10b981", alignItems: "center", justifyContent: "center", marginRight: 8 },
  cardHeaderTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  cardContent: { marginTop: 4 },
  deliveryInfoGrid: { flexDirection: "row" },
  deliveryInfoSection: { flex: 1, marginRight: 4 },
  infoRow: { flexDirection: "row", marginBottom: 10 },
  infoIconWrapper: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#ecfdf5", alignItems: "center", justifyContent: "center", marginRight: 8 },
  personIcon: {},
  phoneIcon: {},
  locationIcon: {},
  noteIcon: {},
  infoTextContainer: { flex: 1 },
  infoLabel: { fontSize: 11, color: "#6b7280" },
  infoValue: { fontSize: 13, color: "#111827", fontWeight: "500", marginTop: 1 },
  noteText: { color: "#374151" },
  orderItemsCard: { backgroundColor: "white", borderRadius: 16, padding: 12, marginBottom: 16 },
  orderItemsIcon: { backgroundColor: "#3b82f6" },
  itemsCountBadge: { borderRadius: 12, backgroundColor: "#eff6ff", paddingHorizontal: 8, paddingVertical: 4 },
  itemsCountBadgeText: { fontSize: 11, color: "#1d4ed8", fontWeight: "600" },
  productItem: { flexDirection: "row", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e5e7eb" },
  productImageContainer: { marginRight: 10 },
  imageWrapper: { width: 70, height: 70, borderRadius: 14, overflow: "hidden", backgroundColor: "#f9fafb", borderWidth: StyleSheet.hairlineWidth, borderColor: "#e5e7eb" },
  productImage: { width: "100%", height: "100%" },
  placeholderImage: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#ecfdf5" },
  quantityBadge: { position: "absolute", bottom: 4, right: 4, backgroundColor: "#10b981", borderRadius: 10, paddingHorizontal: 5, paddingVertical: 2 },
  quantityBadgeText: { fontSize: 10, color: "white", fontWeight: "700" },
  viewOverlay: { position: "absolute", top: 4, right: 4, backgroundColor: "rgba(15,23,42,0.6)", borderRadius: 10, padding: 2 },
  productDetails: { flex: 1 },
  productHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  productName: { flex: 1, fontSize: 13, fontWeight: "600", color: "#111827", marginRight: 6 },
  productItemNumber: { fontSize: 11, color: "#6b7280" },
  productInfoGrid: { flexDirection: "row", marginTop: 4 },
  productInfoItem: { flex: 1, marginRight: 4 },
  productInfoLabel: { fontSize: 11, color: "#6b7280" },
  productInfoValue: { fontSize: 13, fontWeight: "600", color: "#111827" },
  quantityContainer: { marginTop: 2, paddingVertical: 2 },
  priceContainer: { marginTop: 2, paddingVertical: 2 },
  subtotalContainer: { marginTop: 2, paddingVertical: 2 },
  quantityValue: { color: "#10b981" },
  priceValue: { color: "#1d4ed8" },
  subtotalValue: { color: "#b91c1c" },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#e5e7eb", paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "white" },
  footerContent: { flexDirection: "row", justifyContent: "space-between" },
  footerTotals: { flexDirection: "row", alignItems: "center" },
  totalSection: { flexDirection: "row", alignItems: "center" },
  totalIconContainer: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#ecfdf5", alignItems: "center", justifyContent: "center", marginRight: 6 },
  divider: { width: 1, height: 26, backgroundColor: "#e5e7eb", marginHorizontal: 10 },
  totalItemsLabel: { fontSize: 11, color: "#6b7280" },
  totalItemsValue: { fontSize: 13, fontWeight: "700", color: "#111827" },
  totalAmountLabel: { fontSize: 11, color: "#6b7280" },
  totalAmountValue: { fontSize: 14, fontWeight: "700", color: "#b91c1c" },
  invoiceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#059669",
  },
  invoiceButtonDisabled: { opacity: 0.6 },
  invoiceButtonText: { color: "white", fontSize: 14, fontWeight: "700" },
  loaderContainer: { flex: 1, backgroundColor: "rgba(15,23,42,0.7)", justifyContent: "center", alignItems: "center" },
  loaderCard: { backgroundColor: "white", padding: 20, borderRadius: 16, alignItems: "center", width: width * 0.7 },
  loaderText: { marginTop: 10, fontSize: 14, color: "#4b5563" },
  errorContainer: { flex: 1, backgroundColor: "rgba(15,23,42,0.7)", justifyContent: "center", alignItems: "center" },
  errorCard: { backgroundColor: "white", padding: 20, borderRadius: 20, width: width * 0.85, alignItems: "center" },
  errorIcon: { marginBottom: 8 },
  errorTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 4 },
  errorText: { fontSize: 13, color: "#4b5563", textAlign: "center", marginBottom: 4 },
  errorSubtext: { fontSize: 12, color: "#6b7280", marginBottom: 12 },
  errorActions: { flexDirection: "row", marginTop: 4 },
  retryButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#10b981", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, marginRight: 8 },
  retryButtonText: { color: "white", fontSize: 13, fontWeight: "600", marginLeft: 4 },
  closeButton: { borderRadius: 999, borderWidth: 1, borderColor: "#d1d5db", paddingHorizontal: 16, paddingVertical: 8 },
  closeButtonText: { color: "#374151", fontSize: 13, fontWeight: "500" },
  emptyIcon: { marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 4 },
  emptyText: { fontSize: 13, color: "#4b5563", textAlign: "center", marginBottom: 12 },
  imagePreviewContainer: { flex: 1, backgroundColor: "rgba(15,23,42,0.9)", justifyContent: "center", alignItems: "center" },
  imagePreviewBackdrop: { flex: 1, width: "100%", justifyContent: "center", alignItems: "center" },
  imagePreviewContent: { width: "90%", height: "70%", backgroundColor: "black", borderRadius: 16, overflow: "hidden" },
  previewImage: { width: "100%", height: "100%" },
  closePreviewButton: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(15,23,42,0.7)", borderRadius: 18, padding: 6 },
});
