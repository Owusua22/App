// OrderModal.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSalesOrderById, fetchOrderDeliveryAddress } from '../redux/slice/orderSlice';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');
const backendBaseURL = 'https://fte002n1.salesmate.app';

const OrderModal = ({ orderCode, isModalVisible, onClose }) => {
  const dispatch = useDispatch();

  // --- Redux state (normalized) ---
  const orderState = useSelector((state) => state.order || {});
  const {
    salesOrder = [],
    deliveryAddress = [],
    loading: rawLoading,
    error: rawError,
  } = orderState;

  // Ensure loading/error are always objects so `.salesOrder` / `.deliveryAddress` are safe
  const loading =
    rawLoading && typeof rawLoading === 'object' ? rawLoading : {};
  const error =
    rawError && typeof rawError === 'object' ? rawError : {};

  // Local UI state
  const [imagePreview, setImagePreview] = useState({ visible: false, url: null });
  const [localLoading, setLocalLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // --- Fetch data when modal opens ---
  useEffect(() => {
    if (!isModalVisible || !orderCode) return;

    const fetchData = async () => {
      setLocalLoading(true);
      setFetchError(null);

      try {
        const orderCodeString = String(orderCode).trim();

        await Promise.all([
          dispatch(fetchSalesOrderById(orderCodeString)).unwrap(),
          dispatch(fetchOrderDeliveryAddress(orderCodeString)).unwrap(),
        ]);
      } catch (err) {
        console.error('Error fetching order data:', err);
        const errorMessage = err?.message || err?.error || String(err);
        setFetchError(errorMessage);
      } finally {
        setLocalLoading(false);
      }
    };

    fetchData();
  }, [dispatch, orderCode, isModalVisible]);

  // --- Helpers ---
  const formatPrice = (amount) => {
    const num = parseFloat(amount || 0);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date not available';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';

      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (err) {
      console.error('Error formatting date:', err);
      return 'Invalid date';
    }
  };

  const orderItems = Array.isArray(salesOrder) ? salesOrder : [];
  const totalAmount = orderItems.reduce((acc, item) => {
    const price = parseFloat(item?.price || 0);
    const quantity = parseInt(item?.quantity || 0, 10);
    return acc + price * quantity;
  }, 0);

  const totalItems = orderItems.reduce((acc, item) => {
    const quantity = parseInt(item?.quantity || 0, 10);
    return acc + quantity;
  }, 0);

  const address =
    Array.isArray(deliveryAddress) && deliveryAddress.length > 0
      ? deliveryAddress[0]
      : {};

  const orderData = orderItems[0];
  const displayOrderDate = orderData?.orderDate;

  // --- Derived UI state flags ---
  const storeLoading =
    !!loading.salesOrder || !!loading.deliveryAddress;
  const isLoading = localLoading || storeLoading;

  const storeError =
    error.salesOrder || error.deliveryAddress;
  const hasError = !!(fetchError || storeError);

  const renderProductImage = (item) => {
    const imagePath = item?.imagePath;
    const imageFileName = imagePath ? imagePath.split('\\').pop() : null;
    const imageUrl = imageFileName
      ? `${backendBaseURL}/Media/Products_Images/${imageFileName}`
      : null;

    return (
      <TouchableOpacity
        style={styles.productImageContainer}
        onPress={() =>
          imageUrl && setImagePreview({ visible: true, url: imageUrl })
        }
        activeOpacity={0.8}
      >
        <View style={styles.imageWrapper}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.productImage}
              onError={(e) =>
                console.log('Image failed to load:', e.nativeEvent.error)
              }
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Icon name="inventory-2" size={32} color="#a7f3d0" />
            </View>
          )}

          <View style={styles.quantityBadge}>
            <Text style={styles.quantityBadgeText}>
              {item?.quantity || 0}
            </Text>
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

  const handleRetry = () => {
    setFetchError(null);

    if (!orderCode) return;

    const orderCodeString = String(orderCode).trim();
    setLocalLoading(true);

    Promise.all([
      dispatch(fetchSalesOrderById(orderCodeString)),
      dispatch(fetchOrderDeliveryAddress(orderCodeString)),
    ])
      .catch((err) => {
        console.error('Retry error:', err);
        setFetchError(
          err?.message || err?.error || 'Failed to reload order data'
        );
      })
      .finally(() => setLocalLoading(false));
  };

  // --- Early exits (visibility / params) ---
  if (!isModalVisible) return null;
  if (!orderCode) return null;

  // --- Loading state ---
  if (isLoading) {
    return (
      <Modal visible transparent animationType="slide">
        <View style={styles.loaderContainer}>
          <View style={styles.loaderCard}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={styles.loaderText}>Loading order details...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  // --- Error state ---
  if (hasError) {
    const errorMessage =
      fetchError ||
      storeError ||
      'An unexpected error occurred while loading the order.';

    return (
      <Modal visible transparent animationType="slide">
        <View style={styles.errorContainer}>
          <View style={styles.errorCard}>
            <View style={styles.errorIcon}>
              <Icon name="error-outline" size={48} color="#ef4444" />
            </View>
            <Text style={styles.errorTitle}>Unable to load order</Text>
            <Text style={styles.errorText}>{String(errorMessage)}</Text>
            <Text style={styles.errorSubtext}>Order: {orderCode}</Text>
            <View style={styles.errorActions}>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRetry}
              >
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

  // --- Empty state ---
  if (!orderItems || orderItems.length === 0) {
    return (
      <Modal visible transparent animationType="slide">
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

  // --- Main content ---
  return (
    <>
      <Modal visible transparent animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* Header */}
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
                    name="check-circle"
                    size={16}
                    color="white"
                    style={styles.statusIcon}
                  />
                  <Text style={styles.statusBadgeText}>Active</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.closeIconButton}
                onPress={onClose}
              >
                <Icon name="close" size={28} color="white" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Content */}
            <ScrollView
              style={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContentContainer}
            >
              {/* Summary Cards */}
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
                  <View
                    style={[styles.summaryCardIcon, styles.itemsCardIcon]}
                  >
                    <Icon name="shopping-cart" size={22} color="white" />
                  </View>
                  <View style={styles.summaryCardContent}>
                    <Text style={styles.summaryCardLabel}>Total Items</Text>
                    <Text
                      style={[styles.summaryCardValue, styles.itemsValue]}
                    >
                      {totalItems}
                    </Text>
                  </View>
                </View>

                <View style={[styles.summaryCard, styles.amountCard]}>
                  <View
                    style={[styles.summaryCardIcon, styles.amountCardIcon]}
                  >
                    <Icon
                      name="account-balance-wallet"
                      size={22}
                      color="white"
                    />
                  </View>
                  <View style={styles.summaryCardContent}>
                    <Text style={styles.summaryCardLabel}>Amount</Text>
                    <Text
                      style={[styles.summaryCardValue, styles.amountValue]}
                    >
                      ₵{formatPrice(totalAmount)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Delivery Information */}
              <View style={styles.deliveryCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={styles.cardHeaderIcon}>
                      <Icon name="local-shipping" size={22} color="white" />
                    </View>
                    <Text style={styles.cardHeaderTitle}>
                      Delivery Information
                    </Text>
                  </View>
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.deliveryInfoGrid}>
                    <View style={styles.deliveryInfoSection}>
                      <View style={styles.infoRow}>
                        <View
                          style={[styles.infoIconWrapper, styles.personIcon]}
                        >
                          <Icon name="person" size={20} color="#10b981" />
                        </View>
                        <View style={styles.infoTextContainer}>
                          <Text style={styles.infoLabel}>Recipient Name</Text>
                          <Text style={styles.infoValue}>
                            {address?.recipientName || 'Not provided'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.infoRow}>
                        <View
                          style={[styles.infoIconWrapper, styles.phoneIcon]}
                        >
                          <Icon name="phone" size={20} color="#10b981" />
                        </View>
                        <View style={styles.infoTextContainer}>
                          <Text style={styles.infoLabel}>
                            Contact Number
                          </Text>
                          <Text style={styles.infoValue}>
                            {address?.recipientContactNumber ||
                              'Not provided'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.deliveryInfoSection}>
                      <View style={styles.infoRow}>
                        <View
                          style={[styles.infoIconWrapper, styles.locationIcon]}
                        >
                          <Icon name="location-on" size={20} color="#10b981" />
                        </View>
                        <View style={styles.infoTextContainer}>
                          <Text style={styles.infoLabel}>
                            Delivery Address
                          </Text>
                          <Text style={styles.infoValue}>
                            {address?.address || 'Not provided'}
                          </Text>
                        </View>
                      </View>

                      {!!address?.orderNote && (
                        <View style={styles.infoRow}>
                          <View
                            style={[styles.infoIconWrapper, styles.noteIcon]}
                          >
                            <Icon name="note" size={20} color="#10b981" />
                          </View>
                          <View style={styles.infoTextContainer}>
                            <Text style={styles.infoLabel}>Special Notes</Text>
                            <Text
                              style={[styles.infoValue, styles.noteText]}
                            >
                              {address.orderNote}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>

              {/* Order Items */}
              <View style={styles.orderItemsCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View
                      style={[
                        styles.cardHeaderIcon,
                        styles.orderItemsIcon,
                      ]}
                    >
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
                    const quantity = parseInt(item?.quantity || 0, 10);
                    const price = parseFloat(item?.price || 0);
                    const subtotal = quantity * price;

                    return (
                      <View key={index} style={styles.productItem}>
                        {renderProductImage(item)}

                        <View style={styles.productDetails}>
                          <View style={styles.productHeader}>
                            <Text style={styles.productName}>
                              {item?.productName ||
                                'Product Name Not Available'}
                            </Text>
                            <Text style={styles.productItemNumber}>
                              Item #{index + 1}
                            </Text>
                          </View>

                          <View style={styles.productInfoGrid}>
                            <View style={styles.productInfoItem}>
                              <Text style={styles.productInfoLabel}>
                                Quantity
                              </Text>
                              <View style={styles.quantityContainer}>
                                <Text
                                  style={[
                                    styles.productInfoValue,
                                    styles.quantityValue,
                                  ]}
                                >
                                  {quantity}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.productInfoItem}>
                              <Text style={styles.productInfoLabel}>
                                Unit Price
                              </Text>
                              <View style={styles.priceContainer}>
                                <Text
                                  style={[
                                    styles.productInfoValue,
                                    styles.priceValue,
                                  ]}
                                >
                                  ₵{formatPrice(price)}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.productInfoItem}>
                              <Text style={styles.productInfoLabel}>
                                Subtotal
                              </Text>
                              <View style={styles.subtotalContainer}>
                                <Text
                                  style={[
                                    styles.productInfoValue,
                                    styles.subtotalValue,
                                  ]}
                                >
                                  ₵{formatPrice(subtotal)}
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

            {/* Footer */}
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
                      <Icon
                        name="account-balance-wallet"
                        size={16}
                        color="#10b981"
                      />
                    </View>
                    <View>
                      <Text style={styles.totalAmountLabel}>
                        Total Amount
                      </Text>
                      <Text style={styles.totalAmountValue}>
                        ₵{formatPrice(totalAmount)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Image Preview Modal */}
      <Modal visible={imagePreview.visible} transparent animationType="fade">
        <View style={styles.imagePreviewContainer}>
          <TouchableOpacity
            style={styles.imagePreviewBackdrop}
            onPress={() => setImagePreview({ visible: false, url: null })}
            activeOpacity={1}
          >
            <View style={styles.imagePreviewContent}>
              {imagePreview.url && (
                <Image
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
    backgroundColor: 'rgba(15,23,42,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#f9fafb',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 8,
  },
  header: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  closeIconButton: {
    marginLeft: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.3)',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  scrollContent: {
    maxHeight: '78%',
  },
  scrollContentContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  summaryCardsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 14,
    padding: 10,
    marginHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateCard: {
    backgroundColor: '#ecfdf5',
  },
  itemsCard: {
    backgroundColor: '#eff6ff',
  },
  amountCard: {
    backgroundColor: '#fef3c7',
  },
  summaryCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  itemsCardIcon: {
    backgroundColor: '#3b82f6',
  },
  amountCardIcon: {
    backgroundColor: '#f59e0b',
  },
  summaryCardContent: {
    flex: 1,
  },
  summaryCardLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 2,
  },
  summaryCardValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  itemsValue: {
    color: '#1d4ed8',
  },
  amountValue: {
    color: '#92400e',
  },
  deliveryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  cardContent: {
    marginTop: 4,
  },
  deliveryInfoGrid: {
    flexDirection: 'row',
  },
  deliveryInfoSection: {
    flex: 1,
    marginRight: 4,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  infoIconWrapper: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  personIcon: {},
  phoneIcon: {},
  locationIcon: {},
  noteIcon: {},
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
    marginTop: 1,
  },
  noteText: {
    color: '#374151',
  },
  orderItemsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  orderItemsIcon: {
    backgroundColor: '#3b82f6',
  },
  itemsCountBadge: {
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  itemsCountBadgeText: {
    fontSize: 11,
    color: '#1d4ed8',
    fontWeight: '600',
  },
  productItem: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  productImageContainer: {
    marginRight: 10,
  },
  imageWrapper: {
    width: 70,
    height: 70,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#f9fafb',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecfdf5',
  },
  quantityBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  quantityBadgeText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '700',
  },
  viewOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderRadius: 10,
    padding: 2,
  },
  productDetails: {
    flex: 1,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  productName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginRight: 6,
  },
  productItemNumber: {
    fontSize: 11,
    color: '#6b7280',
  },
  productInfoGrid: {
    flexDirection: 'row',
    marginTop: 4,
  },
  productInfoItem: {
    flex: 1,
    marginRight: 4,
  },
  productInfoLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  productInfoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  quantityContainer: {
    marginTop: 2,
    paddingVertical: 2,
  },
  priceContainer: {
    marginTop: 2,
    paddingVertical: 2,
  },
  subtotalContainer: {
    marginTop: 2,
    paddingVertical: 2,
  },
  quantityValue: {
    color: '#10b981',
  },
  priceValue: {
    color: '#1d4ed8',
  },
  subtotalValue: {
    color: '#b91c1c',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'white',
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerTotals: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalIconContainer: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  divider: {
    width: 1,
    height: 26,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 10,
  },
  totalItemsLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  totalItemsValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  totalAmountLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  totalAmountValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#b91c1c',
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    width: width * 0.7,
  },
  loaderText: {
    marginTop: 10,
    fontSize: 14,
    color: '#4b5563',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    width: width * 0.85,
    alignItems: 'center',
  },
  errorIcon: {
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 13,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 4,
  },
  errorSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  errorActions: {
    flexDirection: 'row',
    marginTop: 4,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  closeButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeButtonText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '500',
  },
  emptyIcon: {
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 12,
  },
  imagePreviewContainer: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewBackdrop: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewContent: {
    width: '90%',
    height: '70%',
    backgroundColor: 'black',
    borderRadius: 16,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  closePreviewButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(15,23,42,0.7)',
    borderRadius: 18,
    padding: 6,
  },
});