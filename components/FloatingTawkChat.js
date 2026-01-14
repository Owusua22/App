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
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

const WHATSAPP_NUMBER = '+233555939311';
const PHONE_NUMBER = '+233302225651';

const RED = '#EF4444';
const WHATSAPP_GREEN = '#25D366';

const FloatingTawkChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [animation] = useState(new Animated.Value(0));
  const [pulseAnimation] = useState(new Animated.Value(1));

  // Pulse animation for main FAB
  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.05,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (!isOpen) setTimeout(pulse, 1800);
      });
    };
    if (!isOpen) pulse();
  }, [isOpen, pulseAnimation]);

  const toggleMenu = () => {
    const toValue = isOpen ? 0 : 1;

    Animated.spring(animation, {
      toValue,
      useNativeDriver: true,
      tension: 170,
      friction: 14,
    }).start();

    setIsOpen(!isOpen);
  };

  const openWhatsApp = () => {
    const message =
      "Hello! I'm interested in your products at Franko Trading Enterprise.";
    const sanitized = WHATSAPP_NUMBER.replace(/[^0-9+]/g, '');
    const whatsappUrl = `whatsapp://send?phone=${sanitized}&text=${encodeURIComponent(
      message
    )}`;

    Linking.canOpenURL(whatsappUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(whatsappUrl);
        }
        const webUrl = `https://wa.me/${sanitized}?text=${encodeURIComponent(
          message
        )}`;
        return Linking.openURL(webUrl);
      })
      .catch((err) => {
        console.error('Error opening WhatsApp:', err);
        Alert.alert(
          'Unable to open WhatsApp',
          'Please make sure WhatsApp is installed or try again later.'
        );
      })
      .finally(() => toggleMenu());
  };

  const makeCall = async () => {
    const sanitized = PHONE_NUMBER.replace(/[^0-9+]/g, '');
    const scheme = Platform.OS === 'ios' ? 'telprompt:' : 'tel:';
    const url = `${scheme}${sanitized}`;
    const fallbackUrl = `tel:${sanitized}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(fallbackUrl);
      }
    } catch (err) {
      console.error('Error making call:', err);
      Alert.alert(
        'Unable to place call',
        'Please check that your device supports phone calls and try again.'
      );
    } finally {
      toggleMenu();
    }
  };

  const whatsappStyle = {
    opacity: animation,
    transform: [
      {
        scale: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0.7, 1],
        }),
      },
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -55],
        }),
      },
    ],
  };

  const callStyle = {
    opacity: animation,
    transform: [
      {
        scale: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0.7, 1],
        }),
      },
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -105],
        }),
      },
    ],
  };

  const rotation = {
    transform: [
      {
        rotate: animation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '45deg'],
        }),
      },
    ],
  };

  const backgroundOpacity = {
    opacity: animation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.18],
    }),
  };

  return (
    <>
      {isOpen && (
        <Animated.View style={[styles.overlay, backgroundOpacity]}>
          <TouchableOpacity
            style={styles.overlayTouch}
            onPress={toggleMenu}
            activeOpacity={1}
          />
        </Animated.View>
      )}

      <View style={styles.container}>
        {/* WhatsApp Button (green) */}
        <Animated.View style={[styles.actionButton, whatsappStyle]}>
          <TouchableOpacity
            onPress={openWhatsApp}
            style={[styles.actionButtonInner, styles.whatsappButton]}
            activeOpacity={0.9}
          >
            <View style={styles.iconContainer}>
              <FontAwesome name="whatsapp" size={14} color="#ffffff" />
            </View>
            <Text style={styles.actionButtonText}>WhatsApp</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Call Button (red) */}
        <Animated.View style={[styles.actionButton, callStyle]}>
          <TouchableOpacity
            onPress={makeCall}
            style={[styles.actionButtonInner, styles.callButton]}
            activeOpacity={0.9}
          >
            <View style={styles.iconContainer}>
              <Icon name="phone" size={14} color="#ffffff" />
            </View>
            <Text style={styles.actionButtonText}>Call us</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Main Floating Button (red) */}
        <Animated.View
          style={[
            styles.floatingButtonContainer,
            { transform: [{ scale: pulseAnimation }] },
          ]}
        >
          <TouchableOpacity
            style={styles.floatingButton}
            onPress={toggleMenu}
            activeOpacity={0.8}
          >
            <Animated.View style={rotation}>
              {isOpen ? (
                <Icon name="close" size={20} color="#ffffff" />
              ) : (
                <Icon name="chat" size={20} color="#ffffff" />
              )}
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.6)',
    zIndex: 999,
  },
  overlayTouch: { flex: 1 },
  container: {
    position: 'absolute',
    bottom: 90,
    right: 14,
    zIndex: 1000,
    alignItems: 'center',
  },
  floatingButtonContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: RED,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: RED,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  actionButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    zIndex: 2,
  },
  actionButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 18,
    minWidth: 100,
    elevation: 6,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  whatsappButton: {
    backgroundColor: WHATSAPP_GREEN,
    shadowColor: WHATSAPP_GREEN,
  },
  callButton: {
    backgroundColor: RED,
    shadowColor: RED,
  },
  iconContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
  },
});

export default FloatingTawkChat;