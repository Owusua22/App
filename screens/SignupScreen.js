// screens/SignupScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Image,
  ScrollView, ActivityIndicator, Animated, Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  createCustomer, loginCustomer, setCurrentCustomer, getCustomerById,
  updateCustomerPassword, updateAccountStatus, selectCurrentCustomer,
} from '../redux/slice/customerSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

const { width, height } = Dimensions.get('window');

const PASSWORD_RULES = [
  { id: 'length', label: '8+ characters', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'Uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'Lowercase letter', test: (p) => /[a-z]/.test(p) },
  { id: 'number', label: 'Number', test: (p) => /\d/.test(p) },
  { id: 'symbol', label: 'Special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

const getStrength = (password) => {
  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
  if (passed <= 1) return { score: passed, label: 'Very weak', color: '#ef4444' };
  if (passed === 2) return { score: passed, label: 'Weak', color: '#f97316' };
  if (passed === 3) return { score: passed, label: 'Fair', color: '#eab308' };
  if (passed === 4) return { score: passed, label: 'Strong', color: '#22c55e' };
  return { score: passed, label: 'Very strong', color: '#15803d' };
};

const isStrongPassword = (p) => PASSWORD_RULES.every((r) => r.test(p));
const normalizePhone = (v = '') => v.replace(/\D/g, '');

/* ─── Notification ─── */
const Notification = ({ message, type, isVisible, onClose }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isVisible && message) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
      timerRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: -100, duration: 300, useNativeDriver: true }),
        ]).start(() => onClose());
      }, 4500);
    } else if (!isVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -100, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [isVisible, message, onClose, fadeAnim, slideAnim]);

  if (!isVisible || !message) return null;

  return (
    <Animated.View style={[styles.notifWrap, {
      backgroundColor: type === 'success' ? '#10B981' : '#EF4444',
      opacity: fadeAnim, transform: [{ translateY: slideAnim }],
    }]}>
      <View style={styles.notifIcon}>
        <Text style={styles.notifIconText}>{type === 'success' ? '✓' : '!'}</Text>
      </View>
      <Text style={styles.notifText}>{message}</Text>
      <TouchableOpacity onPress={onClose} style={styles.notifClose}>
        <Text style={styles.notifCloseText}>×</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

/* ─── Field ─── */
const Field = ({
  icon, label, placeholder, name, value, onChangeText,
  isPassword, keyboardType = 'default', autoCapitalize = 'none', style,
}) => {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>{label || placeholder}</Text>
      <View style={[styles.fieldInner, focused && { borderColor: '#22C55E' }]}>
        {icon ? <Text style={styles.fieldIcon}>{icon}</Text> : null}
        <TextInput
          style={styles.fieldInput}
          placeholder={placeholder}
          value={value}
          onChangeText={(t) => onChangeText(name, t)}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={isPassword ? !show : false}
          placeholderTextColor="#9CA3AF"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {isPassword ? (
          <TouchableOpacity style={styles.fieldToggle} onPress={() => setShow((s) => !s)}>
            <Text style={styles.eyeText}>{show ? '👁️' : '👁️‍🗨️'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

/* ─── Strength Meter ─── */
const StrengthMeter = ({ password }) => {
  if (!password) return null;
  const { score, label, color } = getStrength(password);

  return (
    <View style={styles.meterWrap}>
      <View style={styles.meterHeader}>
        <View style={styles.meterBars}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={[styles.meterBar, { backgroundColor: i < score ? color : '#e5e7eb' }]} />
          ))}
        </View>
        <Text style={[styles.meterLabel, { color }]}>{label}</Text>
      </View>
      <View style={styles.meterRules}>
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <View key={rule.id} style={styles.meterRule}>
              <View style={[styles.meterCheck, { borderColor: ok ? color : '#d1d5db', backgroundColor: ok ? color : 'transparent' }]}>
                {ok ? <Text style={styles.meterCheckIcon}>✓</Text> : null}
              </View>
              <Text style={[styles.meterRuleText, ok && { color: '#374151' }]}>{rule.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

/* ─── Success Banner ─── */
const SuccessBanner = ({ title, message, isVisible }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: isVisible ? 1 : 0, duration: 300, useNativeDriver: true }).start();
  }, [isVisible, fadeAnim]);
  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.banner, { opacity: fadeAnim }]}>
      <Text style={styles.bannerIcon}>✓</Text>
      <View style={styles.bannerBody}>
        <Text style={styles.bannerTitle}>{title}</Text>
        <Text style={styles.bannerSub}>{message}</Text>
      </View>
      <ActivityIndicator size="small" color="#14532D" />
    </Animated.View>
  );
};

/* ─── Update Password Modal ─── */
const UpdatePasswordModal = ({ customer, onSuccess, onClose }) => {
  const dispatch = useDispatch();
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handle = (name, value) => setForm((p) => ({ ...p, [name]: value }));

  const submit = async () => {
    setError('');
    if (!form.newPassword) return setError('Please enter a new password.');
    if (!isStrongPassword(form.newPassword)) return setError('Password does not meet strength requirements.');
    if (form.newPassword !== form.confirmPassword) return setError('Passwords do not match.');

    setLoading(true);
    try {
      const updatedCustomer = await dispatch(
        updateCustomerPassword({
          contactNumber: customer.contactNumber,
          newPassword: form.newPassword,
          customerData: {
            customerAccountNumber: customer.customerAccountNumber,
            firstName: customer.firstName,
            lastName: customer.lastName,
            contactNumber: customer.contactNumber,
            email: customer.email || '',
            address: customer.address || '',
            imagePath: customer.imagePath || '',
            accountType: customer.accountType || 'customer',
          },
        })
      ).unwrap();

      const completeCustomer = {
        ...updatedCustomer,
        accessToken: customer.accessToken || updatedCustomer.accessToken,
        refreshToken: customer.refreshToken || updatedCustomer.refreshToken,
        loginStatus: true,
      };

      await AsyncStorage.setItem('customer', JSON.stringify(completeCustomer));
      dispatch(setCurrentCustomer(completeCustomer));

      setDone(true);
      setTimeout(() => onSuccess(completeCustomer), 1800);
    } catch (err) {
      setError(typeof err === 'object' ? err?.message || 'Password update failed.' : err || 'Password update failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.pwOverlay}>
        <View style={styles.pwCard}>
          <View style={styles.pwStrip} />
          <ScrollView contentContainerStyle={styles.pwScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.pwHeader}>
              <View style={styles.pwShield}>
                <Text style={styles.pwShieldIcon}>🔐</Text>
              </View>
              <Text style={styles.pwTitle}>Password Update Required</Text>
              <Text style={styles.pwDesc}>
                Your account has been flagged for a password reset. Please create a new password to continue.
              </Text>
            </View>

            {done ? (
              <View style={styles.pwDone}>
                <View style={styles.pwDoneIconWrap}>
                  <Text style={styles.pwDoneIcon}>✓</Text>
                </View>
                <Text style={styles.pwDoneText}>Password updated successfully!</Text>
                <Text style={styles.pwDoneSub}>Logging you in...</Text>
              </View>
            ) : (
              <View style={styles.pwBody}>
                <View style={styles.pwCustomerCard}>
                  <Text style={styles.pwCustomerIcon}>👤</Text>
                  <View style={styles.pwCustomerInfo}>
                    <Text style={styles.pwCustomerName}>{customer?.firstName} {customer?.lastName}</Text>
                    <Text style={styles.pwCustomerPhone}>{customer?.contactNumber}</Text>
                  </View>
                </View>

                {error ? (
                  <View style={styles.pwError}>
                    <Text style={styles.pwErrorIcon}>⚠️</Text>
                    <Text style={styles.pwErrorText}>{error}</Text>
                  </View>
                ) : null}

                <Field icon="🔒" label="New Password" placeholder="Enter new password" name="newPassword" value={form.newPassword} onChangeText={handle} isPassword />
                <StrengthMeter password={form.newPassword} />
                <Field icon="🔒" label="Confirm Password" placeholder="Confirm new password" name="confirmPassword" value={form.confirmPassword} onChangeText={handle} isPassword />

                <TouchableOpacity style={[styles.btn, loading && styles.btnOff]} onPress={submit} disabled={loading}>
                  {loading ? <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} /> : null}
                  <Text style={styles.btnText}>{loading ? 'Updating Password...' : 'Update Password →'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

/* ─── Main SignupScreen ─── */
const SignupScreen = ({ visible = false, onClose = () => {}, onSuccess = () => {} }) => {
  const dispatch = useDispatch();
  const currentCustomer = useSelector(selectCurrentCustomer);

  const [authMode, setAuthMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [successRedirect, setSuccessRedirect] = useState({ show: false, title: '', message: '' });
  const [notification, setNotification] = useState({ message: '', type: 'success', isVisible: false });
  const [showPasswordUpdate, setShowPasswordUpdate] = useState(false);
  const [pendingCustomer, setPendingCustomer] = useState(null);

  const [signupData, setSignupData] = useState({
    customerAccountNumber: '', firstName: '', lastName: '', password: '',
    contactNumber: '', email: '', address: '', imagePath: '', accountType: 'customer',
  });
  const [loginData, setLoginData] = useState({ contactNumber: '', password: '' });
  const [guestData, setGuestData] = useState({ contactNumber: '' });

  const hideNotif = useCallback(() => setNotification((p) => ({ ...p, isVisible: false })), []);
  const showNotif = useCallback((msg, type = 'success') => {
    setNotification({ message: '', type, isVisible: false });
    setTimeout(() => setNotification({ message: msg, type, isVisible: true }), 50);
  }, []);

  const persistSession = async (data) => {
    try {
      const raw = await AsyncStorage.getItem('customer');
      const existing = raw ? JSON.parse(raw) : {};
      const token = data?.accessToken || existing?.accessToken || null;
      const merged = { ...existing, ...data, accessToken: token, loginStatus: true };
      await AsyncStorage.setItem('customer', JSON.stringify(merged));
      return merged;
    } catch (e) {
      return data;
    }
  };

  const handleClose = useCallback(() => {
    if (typeof onClose === 'function') onClose();
  }, [onClose]);

  // Reset on mode change
  useEffect(() => {
    hideNotif();
    setRedirecting(false);
    setSuccessRedirect({ show: false, title: '', message: '' });
  }, [authMode, hideNotif]);

  // Reset on modal close
  useEffect(() => {
    if (!visible) {
      hideNotif();
      setAuthMode('login');
      setRedirecting(false);
      setShowPasswordUpdate(false);
      setPendingCustomer(null);
      setSuccessRedirect({ show: false, title: '', message: '' });
      setSignupData({
        customerAccountNumber: '', firstName: '', lastName: '', password: '',
        contactNumber: '', email: '', address: '', imagePath: '', accountType: 'customer',
      });
      setLoginData({ contactNumber: '', password: '' });
      setGuestData({ contactNumber: '' });
    }
  }, [visible, hideNotif]);

  // Generate account number
  useEffect(() => {
    if (visible && authMode === 'signup') {
      setSignupData((p) => ({ ...p, customerAccountNumber: uuidv4() }));
    }
  }, [visible, authMode]);

  // Validation
  const validateSignup = () => {
    const { firstName, lastName, contactNumber, password } = signupData;
    const phone = normalizePhone(contactNumber);
    if (!firstName.trim()) { showNotif('First name is required.', 'error'); return false; }
    if (!lastName.trim()) { showNotif('Last name is required.', 'error'); return false; }
    if (!phone) { showNotif('Contact number is required.', 'error'); return false; }
    if (phone.length !== 10) { showNotif('Contact number must be 10 digits.', 'error'); return false; }
    if (!isStrongPassword(password)) { showNotif("Password doesn't meet requirements.", 'error'); return false; }
    return true;
  };

  const validateLogin = () => {
    const phone = normalizePhone(loginData.contactNumber);
    if (!phone) { showNotif('Contact number is required.', 'error'); return false; }
    if (phone.length !== 10) { showNotif('Contact number must be 10 digits.', 'error'); return false; }
    if (!loginData.password) { showNotif('Password is required.', 'error'); return false; }
    return true;
  };

  const validateGuest = () => {
    const phone = normalizePhone(guestData.contactNumber);
    if (!phone) { showNotif('Contact number is required.', 'error'); return false; }
    if (phone.length !== 10) { showNotif('Contact number must be 10 digits.', 'error'); return false; }
    return true;
  };

  // ─── Signup ───
  const handleSignup = async () => {
    if (!validateSignup()) return;
    setLoading(true);
    try {
      const payload = {
        customerAccountNumber: signupData.customerAccountNumber,
        firstName: signupData.firstName.trim(),
        lastName: signupData.lastName.trim(),
        password: signupData.password,
        contactNumber: normalizePhone(signupData.contactNumber),
        email: signupData.email.trim(),
        address: signupData.address.trim(),
        imagePath: '',
        accountType: 'customer',
      };

      const result = await dispatch(createCustomer(payload)).unwrap();

      if (result?.ResponseCode === '2') {
        showNotif((result.ResponseMessage || 'Account already exists.') + ' Please login.', 'error');
        setTimeout(() => {
          setLoginData((p) => ({ ...p, contactNumber: signupData.contactNumber }));
          setAuthMode('login');
        }, 2500);
        return;
      }

      if (result?.ResponseCode && result.ResponseCode !== '1' && result.ResponseCode !== '0') {
        showNotif(result.ResponseMessage || 'Registration failed.', 'error');
        return;
      }

      // Success - show banner then redirect to login
      setSuccessRedirect({ show: true, title: 'Account created!', message: 'Redirecting to sign in...' });
      setLoginData({
        contactNumber: normalizePhone(signupData.contactNumber),
        password: signupData.password,
      });
      setSignupData({
        customerAccountNumber: uuidv4(), firstName: '', lastName: '', password: '',
        contactNumber: '', email: '', address: '', imagePath: '', accountType: 'customer',
      });

      setTimeout(() => {
        setSuccessRedirect({ show: false, title: '', message: '' });
        setAuthMode('login');
        showNotif('Registration complete! Please sign in.', 'success');
      }, 2500);
    } catch (err) {
      showNotif(typeof err === 'object' ? err?.message || 'Registration failed.' : err || 'Registration failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─── Login ───
  const handleLogin = async () => {
    if (!validateLogin()) return;
    setLoading(true);
    const normalizedPhone = normalizePhone(loginData.contactNumber);

    try {
      const result = await dispatch(
        loginCustomer({ contactNumber: normalizedPhone, password: loginData.password })
      ).unwrap();

      // Account status "0" = needs password update
      if (String(result?.accountStatus) === '0') {
        setPendingCustomer(result);
        setShowPasswordUpdate(true);
        setLoading(false);
        return;
      }

      if (!result?.contactNumber) {
        showNotif('Login failed. Could not retrieve account details.', 'error');
        return;
      }

      const completeCustomer = await persistSession(result);
      dispatch(setCurrentCustomer(completeCustomer));
      showNotif('Welcome back!', 'success');

      // Auto close modal after successful login
      setTimeout(() => {
        handleClose();
      }, 1200);
    } catch (err) {
      let message = 'Login failed.';
      if (typeof err === 'string') message = err;
      else if (err?.ResponseMessage) message = err.ResponseMessage;
      else if (err?.message) message = err.message;

      const notFound =
        message.toLowerCase().includes('not found') ||
        message.toLowerCase().includes('no account') ||
        message.toLowerCase().includes('no customer');

      if (notFound) {
        setRedirecting(true);
        showNotif('No account found. Redirecting to register...', 'error');
        setSignupData((prev) => ({
          ...prev, contactNumber: loginData.contactNumber, customerAccountNumber: uuidv4(),
        }));
        setTimeout(() => { setRedirecting(false); setAuthMode('signup'); }, 2200);
        return;
      }

      showNotif(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─── Guest ───
  const handleGuest = async () => {
    if (!validateGuest()) return;
    setLoading(true);
    const phone = normalizePhone(guestData.contactNumber);

    try {
      const guestPayload = {
        customerAccountNumber: uuidv4(), firstName: 'Guest', lastName: phone.slice(-4),
        password: phone, contactNumber: phone, email: `guest${phone}@franko.com`,
        address: 'Guest Address', imagePath: '', accountType: 'customer',
      };

      const result = await dispatch(createCustomer(guestPayload)).unwrap();

      if (result?.ResponseCode === '2') {
        showNotif((result.ResponseMessage || 'Number already registered.') + ' Please login.', 'error');
        setTimeout(() => { setLoginData({ contactNumber: phone, password: phone }); setAuthMode('login'); }, 2500);
        return;
      }

      if (result?.ResponseCode && result.ResponseCode !== '1' && result.ResponseCode !== '0') {
        showNotif(result.ResponseMessage || 'Failed to create guest account.', 'error');
        return;
      }

      // Success - show banner then redirect to login
      setSuccessRedirect({ show: true, title: 'Guest account ready!', message: 'Redirecting to sign in...' });
      setLoginData({ contactNumber: phone, password: phone });
      setGuestData({ contactNumber: '' });

      setTimeout(() => {
        setSuccessRedirect({ show: false, title: '', message: '' });
        setAuthMode('login');
        showNotif('Guest account created! Please sign in.', 'success');
      }, 2500);
    } catch (err) {
      showNotif(typeof err === 'object' ? err?.message || 'Failed to create guest session.' : err || 'Failed to create guest session.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─── Password update success ───
  const handlePasswordUpdateSuccess = async (updatedCustomer) => {
    setShowPasswordUpdate(false);
    setPendingCustomer(null);

    const completeCustomer = await persistSession(updatedCustomer);
    dispatch(setCurrentCustomer(completeCustomer));
    showNotif("Password updated! You're now logged in.", 'success');

    // Auto close modal
    setTimeout(() => { handleClose(); }, 1500);
  };

  // Input handlers
  const onLogin = (n, v) => setLoginData((p) => ({ ...p, [n]: v }));
  const onSignup = (n, v) => setSignupData((p) => ({ ...p, [n]: v }));
  const onGuest = (n, v) => setGuestData((p) => ({ ...p, [n]: v }));

  const tabs = [
    { key: 'login', label: 'Sign In', icon: '👤' },
    { key: 'signup', label: 'Register', icon: '➕' },
    { key: 'guest', label: 'Guest', icon: '🤝' },
  ];

  const headings = {
    login: { title: 'Welcome back', sub: 'Sign in to continue shopping' },
    signup: { title: 'Create account', sub: 'Join Franko Trading today' },
    guest: { title: 'Quick checkout', sub: 'Continue as a guest' },
  };

  // ─── Render Content ───
  const renderContent = () => {
    switch (authMode) {
      case 'login':
        return (
          <View style={styles.form}>
            <SuccessBanner title={successRedirect.title} message={successRedirect.message} isVisible={successRedirect.show} />

            {redirecting ? (
              <View style={styles.warnBanner}>
                <Text style={styles.warnIcon}>⚠️</Text>
                <View style={styles.warnBody}>
                  <Text style={styles.warnTitle}>Account not found</Text>
                  <Text style={styles.warnSub}>Redirecting to register...</Text>
                </View>
                <ActivityIndicator size="small" color="#D97706" />
              </View>
            ) : null}

            <Field icon="📱" label="Phone Number" placeholder="Enter 10-digit number" name="contactNumber" value={loginData.contactNumber} onChangeText={onLogin} keyboardType="phone-pad" />
            <Field icon="🔒" label="Password" placeholder="Enter your password" name="password" value={loginData.password} onChangeText={onLogin} isPassword />

            <TouchableOpacity style={[styles.btn, (loading || redirecting) && styles.btnOff]} onPress={handleLogin} disabled={loading || redirecting}>
              {loading ? <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} /> : null}
              <Text style={styles.btnText}>{loading ? 'Signing in...' : 'Sign In →'}</Text>
            </TouchableOpacity>

            <View style={styles.links}>
              <Text style={styles.linkGray}>{"Don't have an account? "}</Text>
              <TouchableOpacity onPress={() => setAuthMode('signup')}><Text style={styles.linkBlue}>Register</Text></TouchableOpacity>
              <Text style={styles.linkDot}> · </Text>
              <TouchableOpacity onPress={() => setAuthMode('guest')}><Text style={styles.linkBlue}>Guest</Text></TouchableOpacity>
            </View>
          </View>
        );

      case 'signup':
        return (
          <View style={styles.form}>
            <SuccessBanner title={successRedirect.title} message={successRedirect.message} isVisible={successRedirect.show} />

            <View style={styles.row}>
              <Field icon="👤" label="First Name" placeholder="First name" name="firstName" value={signupData.firstName} onChangeText={onSignup} style={styles.half} />
              <Field icon="👤" label="Last Name" placeholder="Last name" name="lastName" value={signupData.lastName} onChangeText={onSignup} style={styles.half} />
            </View>
            <Field icon="📱" label="Phone Number" placeholder="10-digit number" name="contactNumber" value={signupData.contactNumber} onChangeText={onSignup} keyboardType="phone-pad" />
            <Field icon="📧" label="Email (optional)" placeholder="your@email.com" name="email" value={signupData.email} onChangeText={onSignup} keyboardType="email-address" />
            <Field icon="🏠" label="Address" placeholder="Your address" name="address" value={signupData.address} onChangeText={onSignup} />
            <Field icon="🔒" label="Password" placeholder="Create a strong password" name="password" value={signupData.password} onChangeText={onSignup} isPassword />
            <StrengthMeter password={signupData.password} />

            <TouchableOpacity style={[styles.btn, (loading || successRedirect.show) && styles.btnOff]} onPress={handleSignup} disabled={loading || successRedirect.show}>
              {loading ? <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} /> : null}
              <Text style={styles.btnText}>{loading ? 'Creating...' : 'Create Account →'}</Text>
            </TouchableOpacity>

            <View style={styles.links}>
              <Text style={styles.linkGray}>Already have an account? </Text>
              <TouchableOpacity onPress={() => setAuthMode('login')}><Text style={styles.linkBlue}>Sign in</Text></TouchableOpacity>
            </View>
          </View>
        );

      case 'guest':
        return (
          <View style={styles.form}>
            <SuccessBanner title={successRedirect.title} message={successRedirect.message} isVisible={successRedirect.show} />

            <View style={styles.guestBox}>
              <Text style={styles.guestBoxIcon}>🤝</Text>
              <View style={styles.guestBoxBody}>
                <Text style={styles.guestBoxTitle}>Quick Guest Access</Text>
                <Text style={styles.guestBoxDesc}>
                  {"Enter your phone number to create a temporary account. You'll sign in afterward to continue."}
                </Text>
              </View>
            </View>

            <Field icon="📱" label="Phone Number" placeholder="Enter 10-digit number" name="contactNumber" value={guestData.contactNumber} onChangeText={onGuest} keyboardType="phone-pad" />

            <TouchableOpacity style={[styles.btn, (loading || successRedirect.show) && styles.btnOff]} onPress={handleGuest} disabled={loading || successRedirect.show}>
              {loading ? <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} /> : null}
              <Text style={styles.btnText}>{loading ? 'Setting up...' : 'Create Guest Account →'}</Text>
            </TouchableOpacity>

            <View style={styles.links}>
              <TouchableOpacity onPress={() => setAuthMode('signup')}><Text style={styles.linkBlue}>Register instead</Text></TouchableOpacity>
              <Text style={styles.linkDot}> · </Text>
              <TouchableOpacity onPress={() => setAuthMode('login')}><Text style={styles.linkBlue}>Sign in</Text></TouchableOpacity>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Notification message={notification.message} type={notification.type} isVisible={notification.isVisible} onClose={hideNotif} />

        {showPasswordUpdate && pendingCustomer ? (
          <UpdatePasswordModal
            customer={pendingCustomer}
            onSuccess={handlePasswordUpdateSuccess}
            onClose={() => {
              setShowPasswordUpdate(false);
              setPendingCustomer(null);
              showNotif('Password update cancelled.', 'error');
            }}
          />
        ) : null}

        <View style={styles.modal}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
                <Text style={styles.closeBtnText}>×</Text>
              </TouchableOpacity>
              <Image source={require('../assets/frankoIcon.png')} style={styles.logo} resizeMode="contain" />
              <Text style={styles.title}>{headings[authMode].title}</Text>
              <Text style={styles.subtitle}>{headings[authMode].sub}</Text>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
              {tabs.map(({ key, label, icon }) => (
                <TouchableOpacity key={key} style={[styles.tab, authMode === key && styles.tabOn]} onPress={() => setAuthMode(key)}>
                  <Text style={styles.tabIcon}>{icon}</Text>
                  <Text style={[styles.tabLabel, authMode === key && styles.tabLabelOn]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Content */}
            <View style={styles.content}>{renderContent()}</View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

/* ─── Styles ─── */
const styles = StyleSheet.create({
  // Notification
  notifWrap: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, left: 20, right: 20, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 99999, elevation: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  notifIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  notifIconText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  notifText: { color: '#fff', fontSize: 13, fontWeight: '500', flex: 1, marginRight: 10, lineHeight: 18 },
  notifClose: { padding: 4, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.15)' },
  notifCloseText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modal: { width: '100%', maxHeight: height * 0.92, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.25, shadowRadius: 60, elevation: 20 },
  scroll: { flexGrow: 1 },

  // Header
  header: { alignItems: 'center', paddingTop: 28, paddingHorizontal: 28, position: 'relative' },
  closeBtn: { position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  closeBtnText: { fontSize: 18, color: '#6B7280', fontWeight: 'bold' },
  logo: { width: 72, height: 72, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 4 },

  // Tabs
  tabs: { flexDirection: 'row', marginHorizontal: 28, marginTop: 20, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 4, gap: 2 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 7, gap: 6 },
  tabOn: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 },
  tabIcon: { fontSize: 14 },
  tabLabel: { fontSize: 12.5, fontWeight: '600', color: '#9CA3AF' },
  tabLabelOn: { color: '#14532D' },

  // Content
  content: { padding: 20, paddingBottom: 28 },
  form: { gap: 0 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },

  // Field
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 12.5, fontWeight: '600', color: '#6B7280', marginBottom: 5, paddingLeft: 2 },
  fieldInner: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 8, height: 48, overflow: 'hidden' },
  fieldIcon: { width: 44, textAlign: 'center', fontSize: 16, color: '#9CA3AF' },
  fieldInput: { flex: 1, height: '100%', paddingRight: 12, fontSize: 14, color: '#111827' },
  fieldToggle: { width: 42, height: '100%', alignItems: 'center', justifyContent: 'center' },
  eyeText: { fontSize: 16 },

  // Strength
  meterWrap: { paddingVertical: 2, marginBottom: 14 },
  meterHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  meterBars: { flex: 1, flexDirection: 'row', gap: 3 },
  meterBar: { flex: 1, height: 4, borderRadius: 99 },
  meterLabel: { fontSize: 11, fontWeight: '700' },
  meterRules: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  meterRule: { flexDirection: 'row', alignItems: 'center', gap: 5, width: '48%' },
  meterCheck: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  meterCheckIcon: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  meterRuleText: { fontSize: 11, color: '#9CA3AF' },

  // Button
  btn: { backgroundColor: '#14532D', paddingVertical: 14, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 2, marginBottom: 16, shadowColor: '#14532D', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  btnOff: { backgroundColor: '#86EFAC', shadowOpacity: 0.1 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  cancelBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  cancelText: { fontSize: 13, color: '#6B7280', fontWeight: '500' },

  // Links
  links: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 6 },
  linkGray: { fontSize: 13, color: '#6B7280' },
  linkBlue: { fontSize: 13, color: '#3B82F6', fontWeight: '600' },
  linkDot: { fontSize: 13, color: '#9CA3AF' },

  // Banner
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', borderRadius: 8, padding: 14, marginBottom: 12, gap: 12 },
  bannerIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#14532D', color: '#fff', textAlign: 'center', lineHeight: 22, fontSize: 12, fontWeight: 'bold', overflow: 'hidden' },
  bannerBody: { flex: 1 },
  bannerTitle: { fontSize: 13, fontWeight: '700', color: '#14532D', marginBottom: 2 },
  bannerSub: { fontSize: 12, color: '#166534' },

  // Warning
  warnBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 8, padding: 14, marginBottom: 12, gap: 12 },
  warnIcon: { fontSize: 18 },
  warnBody: { flex: 1 },
  warnTitle: { fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: 2 },
  warnSub: { fontSize: 12, color: '#B45309' },

  // Guest
  guestBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', borderRadius: 8, padding: 16, marginBottom: 16, gap: 12 },
  guestBoxIcon: { fontSize: 20 },
  guestBoxBody: { flex: 1 },
  guestBoxTitle: { fontSize: 13, fontWeight: '700', color: '#14532D', marginBottom: 4 },
  guestBoxDesc: { fontSize: 12.5, color: '#166534', lineHeight: 18 },

  // Password Update Modal
  pwOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  pwCard: { backgroundColor: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, maxHeight: height * 0.9, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 40 }, shadowOpacity: 0.3, shadowRadius: 100, elevation: 20 },
  pwScroll: { flexGrow: 1 },
  pwStrip: { height: 4, backgroundColor: '#14532D' },
  pwHeader: { padding: 28, paddingBottom: 16, alignItems: 'center' },
  pwShield: { width: 64, height: 64, borderRadius: 16, backgroundColor: '#FEF2F2', borderWidth: 2, borderColor: '#FECACA', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  pwShieldIcon: { fontSize: 32 },
  pwTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8, textAlign: 'center' },
  pwDesc: { fontSize: 13.5, color: '#6B7280', textAlign: 'center', lineHeight: 20, paddingHorizontal: 8 },
  pwBody: { paddingHorizontal: 24, paddingBottom: 28 },
  pwDone: { alignItems: 'center', padding: 40, gap: 14 },
  pwDoneIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#BBF7D0' },
  pwDoneIcon: { fontSize: 32, color: '#22C55E' },
  pwDoneText: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' },
  pwDoneSub: { fontSize: 13, color: '#6B7280' },
  pwError: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 8, padding: 12, marginBottom: 14, gap: 8 },
  pwErrorIcon: { fontSize: 16 },
  pwErrorText: { fontSize: 13, color: '#DC2626', lineHeight: 18, flex: 1 },
  pwCustomerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 14, marginBottom: 16, gap: 12 },
  pwCustomerIcon: { fontSize: 24 },
  pwCustomerInfo: { flex: 1 },
  pwCustomerName: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  pwCustomerPhone: { fontSize: 12.5, color: '#6B7280' },
});

export default SignupScreen;