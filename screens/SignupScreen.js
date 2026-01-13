import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { createCustomer, loginCustomer, getCustomerById } from '../redux/slice/customerSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const { width, height } = Dimensions.get('window');

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Custom Notification Component
const Notification = ({ message, type, isVisible, onClose = () => {} }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (isVisible && message) {
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after 4 seconds
      timeoutRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onClose();
        });
      }, 4000);
    } else if (!isVisible) {
      // Animate out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, message, onClose, fadeAnim, slideAnim]);

  if (!isVisible || !message) return null;

  const backgroundColor = type === 'success' ? '#10B981' : '#EF4444';

  return (
    <Animated.View
      style={[
        styles.notificationContainer,
        {
          backgroundColor,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={styles.notificationText}>{message}</Text>
      <TouchableOpacity onPress={onClose} style={styles.notificationClose}>
        <Text style={styles.notificationCloseText}>×</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Enhanced Input Field Component
const InputField = ({ 
  label, 
  value, 
  onChangeText, 
  placeholder, 
  keyboardType = 'default',
  autoCapitalize = 'none',
  secureTextEntry = false,
  showPasswordToggle = false,
  onTogglePassword,
  showPassword,
  required = false,
  style,
  error = false
}) => {
  return (
    <View style={[styles.inputContainer, style]}>
      <Text style={styles.inputLabel}>
        {label}
        {required && <Text style={styles.requiredAsterisk}> *</Text>}
      </Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={[
            styles.input,
            showPasswordToggle && styles.passwordInput,
            error && styles.inputError
          ]}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          placeholderTextColor="#9CA3AF"
        />
        {showPasswordToggle && (
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={onTogglePassword}
          >
            <Text style={styles.eyeIconText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const SignupScreen = ({ visible = false, onClose = () => {} }) => {
  const dispatch = useDispatch();

  const [authMode, setAuthMode] = useState('signup'); // 'login', 'signup', 'guest'
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({
    message: '',
    type: 'success',
    isVisible: false
  });

  const [signupData, setSignupData] = useState({
    customerAccountNumber: "",
    firstName: "",
    lastName: "",
    contactNumber: "",
    address: "",
    password: "",
    accountType: "customer",
    email: "",
    accountStatus: "1",
  });

  const [loginData, setLoginData] = useState({
    contactNumber: "",
    password: "",
  });

  const [guestData, setGuestData] = useState({
    contactNumber: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // Generate customer account number for signup and guest
  const generateCustomerAccountNumber = () => {
    return uuidv4();
  };

  // Email validation function
  const isValidEmail = (email) => {
    if (!email || email.trim() === '') return true; // Optional field
    return EMAIL_REGEX.test(email.trim());
  };

  // Contact number validation function
  const isValidContactNumber = (contactNumber) => {
    const cleanedNumber = contactNumber.replace(/\D/g, '');
    return cleanedNumber.length >= 10;
  };

  // Notification handlers
  const hideNotification = useCallback(() => {
    setNotification(prev => ({ 
      ...prev, 
      isVisible: false 
    }));
  }, []);

  const showNotification = useCallback((message, type = 'success') => {
    // First hide any existing notification
    setNotification({ message: '', type: 'success', isVisible: false });
    
    // Then show new notification after a brief delay
    setTimeout(() => {
      setNotification({
        message,
        type,
        isVisible: true
      });
    }, 50);
  }, []);

  // Safe onClose handler
  const handleClose = useCallback(() => {
    if (typeof onClose === 'function') {
      onClose();
    } else {
      console.warn('onClose prop is not a function');
    }
  }, [onClose]);

  useEffect(() => {
    if (visible && authMode === 'signup') {
      setSignupData((prev) => ({
        ...prev,
        customerAccountNumber: generateCustomerAccountNumber(),
      }));
    }
  }, [visible, authMode]);

  const handleSignupChange = (name, value) => {
    setSignupData((prev) => ({ ...prev, [name]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: false }));
    }
  };

  const handleLoginChange = (name, value) => {
    setLoginData((prev) => ({ ...prev, [name]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: false }));
    }
  };

  const handleGuestChange = (name, value) => {
    setGuestData((prev) => ({ ...prev, [name]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: false }));
    }
  };

  const validateSignupForm = () => {
    const { firstName, lastName, contactNumber, password, email } = signupData;
    const errors = {};
    
    if (!firstName.trim()) {
      errors.firstName = true;
      showNotification("First name is required", "error");
      setFieldErrors(errors);
      return false;
    }
    
    if (!lastName.trim()) {
      errors.lastName = true;
      showNotification("Last name is required", "error");
      setFieldErrors(errors);
      return false;
    }
    
    if (!contactNumber.trim()) {
      errors.contactNumber = true;
      showNotification("Contact number is required", "error");
      setFieldErrors(errors);
      return false;
    }
    
    if (!isValidContactNumber(contactNumber)) {
      errors.contactNumber = true;
      showNotification("Contact number must be at least 10 digits", "error");
      setFieldErrors(errors);
      return false;
    }
    
    // Validate email if provided
    if (email.trim() !== '' && !isValidEmail(email)) {
      errors.email = true;
      showNotification("Please enter a valid email address", "error");
      setFieldErrors(errors);
      return false;
    }
    
    if (!password.trim()) {
      errors.password = true;
      showNotification("Password is required", "error");
      setFieldErrors(errors);
      return false;
    }
    
    if (password.length < 6) {
      errors.password = true;
      showNotification("Password must be at least 6 characters long", "error");
      setFieldErrors(errors);
      return false;
    }
    
    setFieldErrors({});
    return true;
  };

  const validateLoginForm = () => {
    const { contactNumber, password } = loginData;
    const errors = {};
    
    if (!contactNumber.trim()) {
      errors.contactNumber = true;
      showNotification("Contact number is required", "error");
      setFieldErrors(errors);
      return false;
    }
    
    if (!isValidContactNumber(contactNumber)) {
      errors.contactNumber = true;
      showNotification("Contact number must be at least 10 digits", "error");
      setFieldErrors(errors);
      return false;
    }
    
    if (!password.trim()) {
      errors.password = true;
      showNotification("Password is required", "error");
      setFieldErrors(errors);
      return false;
    }
    
    setFieldErrors({});
    return true;
  };

  const validateGuestForm = () => {
    const { contactNumber } = guestData;
    const errors = {};
    
    if (!contactNumber.trim()) {
      errors.contactNumber = true;
      showNotification("Contact number is required", "error");
      setFieldErrors(errors);
      return false;
    }
    
    if (!isValidContactNumber(contactNumber)) {
      errors.contactNumber = true;
      showNotification("Contact number must be at least 10 digits", "error");
      setFieldErrors(errors);
      return false;
    }
    
    setFieldErrors({});
    return true;
  };

  const handleSignup = async () => {
    if (!validateSignupForm()) return;
    
    setLoading(true);
    try {
      // Step 1: Create customer account
      const result = await dispatch(createCustomer(signupData)).unwrap();
      
      console.log("Signup result:", result);

      // Step 2: Check response code
      if (result?.ResponseCode === '2') {
        // Account already exists
        const message = result.ResponseMessage || 'An account with this contact number already exists';
        showNotification(message, "error");
        
        setTimeout(() => {
          setAuthMode('login');
          setLoginData(prev => ({
            ...prev,
            contactNumber: signupData.contactNumber
          }));
        }, 2500);
        
        return;
      }

      if (result?.ResponseCode !== '1' && result?.ResponseCode !== '0') {
        // Other error response codes
        const errorMessage = result.ResponseMessage || 'Registration failed';
        showNotification(errorMessage, "error");
        return;
      }

      // Step 3: Success - Fetch complete customer details using getCustomerById
      try {
        const customerDetails = await dispatch(getCustomerById(signupData.contactNumber)).unwrap();
        
        console.log("Fetched customer details:", customerDetails);

        // Step 4: Store complete customer details in AsyncStorage
        await AsyncStorage.setItem('customer', JSON.stringify(customerDetails));
        
        showNotification("Registration successful! Welcome aboard!", "success");
        
        setTimeout(() => {
          handleClose();
        }, 2000);
      } catch (fetchError) {
        console.error("Error fetching customer details after signup:", fetchError);
        
        // Fallback: Store signup data if fetch fails
        const fallbackCustomerData = {
          ...signupData,
          ...(result && typeof result === 'object' ? result : {}),
          isGuest: false,
          createdAt: new Date().toISOString(),
          registeredAt: new Date().toISOString(),
        };
        
        await AsyncStorage.setItem('customer', JSON.stringify(fallbackCustomerData));
        
        showNotification("Registration successful! Welcome aboard!", "success");
        
        setTimeout(() => {
          handleClose();
        }, 2000);
      }
      
    } catch (error) {
      console.log("Registration error:", error);
      
      let errorMessage = "Registration failed. Please try again.";
      
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.ResponseMessage) {
        errorMessage = error.ResponseMessage;
        
        // Check if error is about existing account
        if (errorMessage.toLowerCase().includes('already exists') || 
            errorMessage.toLowerCase().includes('user already exists')) {
          setTimeout(() => {
            setAuthMode('login');
            setLoginData(prev => ({
              ...prev,
              contactNumber: signupData.contactNumber
            }));
          }, 2500);
        }
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.ResponseMessage) {
        errorMessage = error.response.data.ResponseMessage;
      }
      
      showNotification(errorMessage, "error");
      
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!validateLoginForm()) return;
    
    setLoading(true);
    try {
      // loginCustomer already uses getCustomerById internally
      const result = await dispatch(loginCustomer(loginData)).unwrap();
      
      console.log("Login result:", result);
      
      showNotification("Login successful! Welcome back!", "success");
      
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (error) {
      console.error("Login error:", error);
      
      let errorMessage = "Login failed. Please check your credentials.";
      
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.ResponseMessage) {
        errorMessage = error.ResponseMessage;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      showNotification(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestContinue = async () => {
    if (!validateGuestForm()) return;
    
    setLoading(true);
    try {
      // Create guest customer account with generated data
      const guestCustomerData = {
        customerAccountNumber: generateCustomerAccountNumber(),
        firstName: "Guest",
        lastName: guestData.contactNumber.slice(-4),
        contactNumber: guestData.contactNumber,
        address: "Guest Address",
        password: guestData.contactNumber,
        accountType: "customer",
        email: `guest${guestData.contactNumber}@franko.com`,
        accountStatus: "1",
        isGuest: true,
        createdAt: new Date().toISOString(),
        guestCreatedAt: new Date().toISOString(),
      };

      // Step 1: Save to database via Redux action
      const dbResult = await dispatch(createCustomer(guestCustomerData)).unwrap();
      
      console.log('Guest customer saved to database:', dbResult);

      // Step 2: Check response code
      if (dbResult?.ResponseCode === '2') {
        // Account already exists
        const message = dbResult.ResponseMessage || 'An account with this contact number already exists';
        showNotification(message, "error");
        
        setTimeout(() => {
          setAuthMode('login');
          setLoginData(prev => ({
            ...prev,
            contactNumber: guestData.contactNumber
          }));
        }, 2500);
        
        return;
      }

      if (dbResult?.ResponseCode !== '1' && dbResult?.ResponseCode !== '0') {
        // Other error response codes
        const errorMessage = dbResult.ResponseMessage || 'Failed to create guest account';
        showNotification(errorMessage, "error");
        return;
      }

      // Step 3: Success - Fetch complete guest customer details
      try {
        const guestDetails = await dispatch(getCustomerById(guestData.contactNumber)).unwrap();
        
        console.log("Fetched guest details:", guestDetails);

        // Mark as guest account
        const guestDetailsWithFlag = {
          ...guestDetails,
          isGuest: true,
          guestCreatedAt: new Date().toISOString(),
        };

        // Step 4: Store complete guest details in AsyncStorage
        await AsyncStorage.setItem('customer', JSON.stringify(guestDetailsWithFlag));
        
        showNotification("Guest account created successfully! Welcome!", "success");
        
        setTimeout(() => {
          handleClose();
        }, 2000);
      } catch (fetchError) {
        console.error("Error fetching guest details after creation:", fetchError);
        
        // Fallback: Store guest data if fetch fails
        const fallbackGuestData = {
          ...guestCustomerData,
          ...(dbResult && typeof dbResult === 'object' ? dbResult : {}),
          isGuest: true,
        };
        
        await AsyncStorage.setItem('customer', JSON.stringify(fallbackGuestData));
        
        showNotification("Guest account created successfully! Welcome!", "success");
        
        setTimeout(() => {
          handleClose();
        }, 2000);
      }
      
    } catch (error) {
      console.error("Guest registration error:", error);
      
      let errorMessage = "Failed to create guest account. Please try again.";
      
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.ResponseMessage) {
        errorMessage = error.ResponseMessage;
        
        // Check if error is about existing account
        if (errorMessage.toLowerCase().includes('already exists') || 
            errorMessage.toLowerCase().includes('user already exists')) {
          setTimeout(() => {
            setAuthMode('login');
            setLoginData(prev => ({
              ...prev,
              contactNumber: guestData.contactNumber
            }));
          }, 2500);
        }
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.ResponseMessage) {
        errorMessage = error.response.data.ResponseMessage;
      }
      
      showNotification(errorMessage, "error");
      
    } finally {
      setLoading(false);
    }
  };

  // Reset notification when switching between modes
  useEffect(() => {
    hideNotification();
    setFieldErrors({});
  }, [authMode, hideNotification]);

  // Reset notification when modal closes
  useEffect(() => {
    if (!visible) {
      hideNotification();
      setAuthMode('signup');
      setFieldErrors({});
    }
  }, [visible, hideNotification]);

  const renderAuthContent = () => {
    switch (authMode) {
      case 'login':
        return (
          <View style={styles.formContainer}>
            <InputField
              label="Contact Number"
              placeholder="Enter your contact number"
              value={loginData.contactNumber}
              onChangeText={(value) => handleLoginChange('contactNumber', value)}
              keyboardType="phone-pad"
              required
              error={fieldErrors.contactNumber}
            />
            
            <InputField
              label="Password"
              placeholder="Enter your password"
              value={loginData.password}
              onChangeText={(value) => handleLoginChange('password', value)}
              secureTextEntry={!showPassword}
              showPasswordToggle
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
              required
              error={fieldErrors.password}
            />
          </View>
        );
      
      case 'signup':
        return (
          <View style={styles.formContainer}>
            <View style={styles.row}>
              <InputField
                label="First Name"
                placeholder="Enter first name"
                value={signupData.firstName}
                onChangeText={(value) => handleSignupChange('firstName', value)}
                autoCapitalize="words"
                style={styles.halfWidth}
                required
                error={fieldErrors.firstName}
              />
              
              <InputField
                label="Last Name"
                placeholder="Enter last name"
                value={signupData.lastName}
                onChangeText={(value) => handleSignupChange('lastName', value)}
                autoCapitalize="words"
                style={[styles.halfWidth, styles.marginLeft]}
                required
                error={fieldErrors.lastName}
              />
            </View>
            
            <InputField
              label="Email Address"
              placeholder="Enter your email address"
              value={signupData.email}
              onChangeText={(value) => handleSignupChange('email', value)}
              keyboardType="email-address"
              error={fieldErrors.email}
            />
            
            <InputField
              label="Contact Number"
              placeholder="Enter your contact number"
              value={signupData.contactNumber}
              onChangeText={(value) => handleSignupChange('contactNumber', value)}
              keyboardType="phone-pad"
              required
              error={fieldErrors.contactNumber}
            />
            
            <InputField
              label="Address"
              placeholder="Enter your address"
              value={signupData.address}
              onChangeText={(value) => handleSignupChange('address', value)}
              autoCapitalize="words"
              error={fieldErrors.address}
            />
            
            <InputField
              label="Password"
              placeholder="Create a secure password"
              value={signupData.password}
              onChangeText={(value) => handleSignupChange('password', value)}
              secureTextEntry={!showPassword}
              showPasswordToggle
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
              required
              error={fieldErrors.password}
            />
          </View>
        );
      
      case 'guest':
        return (
          <View style={styles.formContainer}>
            <InputField
              label="Contact Number"
              placeholder="Enter your contact number"
              value={guestData.contactNumber}
              onChangeText={(value) => handleGuestChange('contactNumber', value)}
              keyboardType="phone-pad"
              style={styles.guestInputField}
              required
              error={fieldErrors.contactNumber}
            />
          </View>
        );
      
      default:
        return null;
    }
  };

  const getButtonText = () => {
    if (loading) return "Processing...";
    switch (authMode) {
      case 'login':
        return "Sign In";
      case 'signup':
        return "Create Account";
      case 'guest':
        return "Continue as Guest";
      default:
        return "Continue";
    }
  };

  const handleMainAction = () => {
    switch (authMode) {
      case 'login':
        return handleLogin();
      case 'signup':
        return handleSignup();
      case 'guest':
        return handleGuestContinue();
      default:
        return;
    }
  };

  const getModalTitle = () => {
    switch (authMode) {
      case 'login':
        return "Welcome Back";
      case 'signup':
        return "Create Your Account";
      case 'guest':
        return "Continue as Guest";
      default:
        return "Welcome";
    }
  };

  const getModalSubtitle = () => {
    switch (authMode) {
      case 'login':
        return "Sign in to your account";
      case 'guest':
        return "Quick access without creating an account";
      default:
        return "";
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Notification - positioned absolutely within the modal */}
        <Notification
          message={notification.message}
          type={notification.type}
          isVisible={notification.isVisible}
          onClose={hideNotification}
        />
        
        <View style={styles.modalContainer}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                  <Text style={styles.closeButtonText}>×</Text>
                </TouchableOpacity>
                
                <Image
                  source={require('../assets/frankoIcon.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
                
                <Text style={styles.title}>{getModalTitle()}</Text>
                <Text style={styles.subtitle}>{getModalSubtitle()}</Text>
              </View>

              {/* Form Content */}
              {renderAuthContent()}

              {/* Main Action Button */}
              <TouchableOpacity
                style={[
                  styles.mainButton,
                  loading && styles.mainButtonDisabled
                ]}
                onPress={handleMainAction}
                disabled={loading}
              >
                {loading && <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />}
                <Text style={styles.mainButtonText}>{getButtonText()}</Text>
              </TouchableOpacity>

              {/* Guest Option for Login and Signup */}
              {authMode !== 'guest' && (
                <>
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OR</Text>
                    <View style={styles.dividerLine} />
                  </View>
                  
                  <TouchableOpacity
                    style={styles.guestButton}
                    onPress={() => setAuthMode('guest')}
                  >
                    <Text style={styles.guestButtonText}>Continue as Guest</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Mode Switch Links */}
              <View style={styles.switchModeContainer}>
                {authMode === 'login' ? (
                  <Text style={styles.switchModeText}>
                    Don't have an account?{" "}
                    <Text
                      style={styles.switchModeLink}
                      onPress={() => setAuthMode('signup')}
                    >
                      Sign up here
                    </Text>
                  </Text>
                ) : authMode === 'signup' ? (
                  <Text style={styles.switchModeText}>
                    Already have an account?{" "}
                    <Text
                      style={styles.switchModeLink}
                      onPress={() => setAuthMode('login')}
                    >
                      Sign in
                    </Text>
                  </Text>
                ) : (
                  <Text style={styles.switchModeText}>
                    Need a customer account?{" "}
                    <Text
                      style={styles.switchModeLink}
                      onPress={() => setAuthMode('signup')}
                    >
                      Sign up
                    </Text>
                    {" or "}
                    <Text
                      style={styles.switchModeLink}
                      onPress={() => setAuthMode('login')}
                    >
                      Sign in
                    </Text>
                  </Text>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Notification styles - absolutely positioned within modal
  notificationContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 99999,
    elevation: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  notificationText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
    lineHeight: 20,
  },
  notificationClose: {
    padding: 4,
    borderRadius: 12,
  },
  notificationCloseText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.92,
    maxHeight: height * 0.92,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  scrollContent: {
    flexGrow: 1,
  },
  modalContent: {
    padding: 24,
  },

  // Header styles
  header: {
    alignItems: 'center',
    marginBottom: 5,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    padding: 12,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    zIndex: 1,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  logo: {
    width: 72,
    height: 72,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '400',
  },

  // Form styles
  formContainer: {
    marginBottom: 4,
  },
  
  // Row layout for first name and last name
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    flex: 0.48,
  },
  marginLeft: {
    marginLeft: 8,
  },

  // Enhanced Input Field styles
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    lineHeight: 20,
  },
  requiredAsterisk: {
    color: '#EF4444',
    fontWeight: '600',
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#111827',
    fontWeight: '400',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 14,
    padding: 4,
    borderRadius: 8,
  },
  eyeIconText: {
    fontSize: 18,
  },

  // Guest form styles
  guestInputField: {
    marginBottom: 16,
  },

  // Button styles
  mainButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  mainButtonDisabled: {
    backgroundColor: '#86EFAC',
    shadowOpacity: 0.1,
  },
  mainButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Divider styles
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 4,
  },

  // Guest button styles
  guestButton: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  guestButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },

  // Switch mode styles
  switchModeContainer: {
    alignItems: 'center',
    paddingTop: 8,
  },
  switchModeText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  switchModeLink: {
    color: '#3B82F6',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

export default SignupScreen;