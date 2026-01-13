// components/FloatingTawkChat.js
import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Linking,
  Alert,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

const FloatingTawkChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [animation] = useState(new Animated.Value(0));
  const [pulseAnimation] = useState(new Animated.Value(1));

  const WHATSAPP_NUMBER = '+233246422338';
  const PHONE_NUMBER = '+233302225651';

  // Pulse animation for main button
  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (!isOpen) setTimeout(pulse, 2000);
      });
    };
    if (!isOpen) pulse();
  }, [isOpen, pulseAnimation]);

  const toggleMenu = () => {
    const toValue = isOpen ? 0 : 1;

    Animated.spring(animation, {
      toValue,
      useNativeDriver: true,
      tension: 120,
      friction: 7,
    }).start();

    setIsOpen(!isOpen);
  };

  const openWhatsApp = () => {
    const message = "Hello! I'm interested in your products at Franko Trading Enterprise.";
    const whatsappUrl = `whatsapp://send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(message)}`;

    Linking.canOpenURL(whatsappUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(whatsappUrl);
        } else {
          const webUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
          Linking.openURL(webUrl);
        }
      })
      .catch((err) => {
        console.error('Error opening WhatsApp:', err);
        Alert.alert('Error', 'Could not open WhatsApp. Please make sure WhatsApp is installed.');
      });

    toggleMenu();
  };

  const makeCall = () => {
    const phoneUrl = `tel:${PHONE_NUMBER}`;
    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        if (supported) Linking.openURL(phoneUrl);
        else Alert.alert('Error', 'Phone calls are not supported on this device.');
      })
      .catch((err) => {
        console.error('Error making call:', err);
        Alert.alert('Error', 'Could not initiate call.');
      });

    toggleMenu();
  };

  const whatsappStyle = {
    opacity: animation,
    transform: [
      {
        scale: animation.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
      },
      {
        translateY: animation.interpolate({ inputRange: [0, 1], outputRange: [0, -80] }),
      },
    ],
  };

  const callStyle = {
    opacity: animation,
    transform: [
      {
        scale: animation.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
      },
      {
        translateY: animation.interpolate({ inputRange: [0, 1], outputRange: [0, -150] }),
      },
    ],
  };

  const rotation = {
    transform: [
      {
        rotate: animation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }),
      },
    ],
  };

  const backgroundOpacity = {
    opacity: animation.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] }),
  };

  return (
    <>
      {isOpen && (
        <Animated.View style={[styles.overlay, backgroundOpacity]}>
          <TouchableOpacity style={styles.overlayTouch} onPress={toggleMenu} activeOpacity={1} />
        </Animated.View>
      )}

      <View style={styles.container}>
        {/* WhatsApp Button */}
        <Animated.View style={[styles.actionButton, whatsappStyle]}>
          <TouchableOpacity
            onPress={openWhatsApp}
            style={[styles.actionButtonInner, styles.whatsappButton]}
            activeOpacity={0.9}
          >
            <View style={styles.iconContainer}>
              <FontAwesome name="whatsapp" size={18} color="white" />
            </View>
            <Text style={styles.actionButtonText}>WhatsApp</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Call Button */}
        <Animated.View style={[styles.actionButton, callStyle]}>
          <TouchableOpacity
            onPress={makeCall}
            style={[styles.actionButtonInner, styles.callButton]}
            activeOpacity={0.9}
          >
            <View style={styles.iconContainer}>
              <Icon name="phone" size={18} color="white" />
            </View>
            <Text style={styles.actionButtonText}>Call us</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Main Floating Button */}
        <Animated.View style={[styles.floatingButtonContainer, { transform: [{ scale: pulseAnimation }] }]}>
          <TouchableOpacity style={styles.floatingButton} onPress={toggleMenu} activeOpacity={0.8}>
            <Animated.View style={rotation}>
              {isOpen ? <Icon name="close" size={24} color="white" /> : <Icon name="chat" size={24} color="white" />}
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 999,
  },
  overlayTouch: { flex: 1 },
  container: {
    position: 'absolute',
    bottom: 110,
    right: 20,
    zIndex: 1000,
    alignItems: 'center',
  },
  floatingButtonContainer: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  floatingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    zIndex: 3,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  actionButton: { position: 'absolute', bottom: 0, right: 0, zIndex: 2 },
  actionButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 30,
    minWidth: 140,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  whatsappButton: { backgroundColor: '#25D366', shadowColor: '#25D366' },
  callButton: { backgroundColor: '#FF4757', shadowColor: '#FF4757' },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  actionButtonText: { color: 'white', fontWeight: '700', fontSize: 15, letterSpacing: 0.5 },
});

export default FloatingTawkChat;
