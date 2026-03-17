// components/FloatingTawkChat.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Text,
  StyleSheet,
  Animated,
  Linking,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

/* ─── Config ─────────────────────────────────────────── */
const WHATSAPP_NUMBER = '+233503607980';
const PHONE_NUMBER    = '+233302225651';

/* ─── Palette ────────────────────────────────────────── */
const G = {
  primary:     '#059669',
  primaryDark: '#047857',
  primaryDeep: '#064E3B',
  primaryGlow: 'rgba(5,150,105,0.22)',
  primaryMist: '#D1FAE5',
  primaryGhost:'#ECFDF5',
  wa:          '#25D366',
  waDark:      '#128C7E',
  waGlow:      'rgba(37,211,102,0.25)',
  surface:     '#FFFFFF',
  overlay:     'rgba(6,25,16,0.45)',
  text:        '#0F2318',
  textSub:     '#4B7260',
  white:       '#FFFFFF',
};

/* ─── Shadow helpers ─────────────────────────────────── */
const fabShadow = Platform.select({
  ios: {
    shadowColor: G.primaryDeep,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
  },
  android: { elevation: 10 },
});

const sheetShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
  },
  android: { elevation: 16 },
});

/* ═══════════════════════════════════════════════════════
 *  Component
 * ═════════════════════════════════════════════════════*/
const FloatingTawkChat = ({ scrollY }) => {
  const [sheetVisible, setSheetVisible] = useState(false);

  // FAB visibility driven by scroll
  const fabOpacity   = useRef(new Animated.Value(1)).current;
  const fabScale     = useRef(new Animated.Value(1)).current;
  const scrollTimer  = useRef(null);
  const isVisible    = useRef(true);

  // Pulse on idle
  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const pulseLoop    = useRef(null);

  // Sheet slide-up
  const sheetY       = useRef(new Animated.Value(300)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;

  /* ── Pulse ──────────────────────────────────────────── */
  const startPulse = useCallback(() => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseLoop.current?.stop();
    Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
  }, [pulseAnim]);

  useEffect(() => { startPulse(); }, []);

  /* ── Hide / show FAB on scroll ──────────────────────── */
  const hideFab = useCallback(() => {
    if (!isVisible.current) return;
    isVisible.current = false;
    stopPulse();
    Animated.parallel([
      Animated.timing(fabOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.spring(fabScale,   { toValue: 0.6, useNativeDriver: true }),
    ]).start();
  }, [fabOpacity, fabScale, stopPulse]);

  const showFab = useCallback(() => {
    if (isVisible.current) return;
    isVisible.current = true;
    Animated.parallel([
      Animated.timing(fabOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.spring(fabScale,   { toValue: 1, tension: 160, friction: 10, useNativeDriver: true }),
    ]).start(() => startPulse());
  }, [fabOpacity, fabScale, startPulse]);

  // Expose onScroll handler — parent ScrollView should call this
  // Usage: <ScrollView onScroll={onScroll} scrollEventThrottle={16} ...>
  const onScroll = useCallback(() => {
    hideFab();
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(showFab, 1200);
  }, [hideFab, showFab]);

  /* ── Sheet animation ────────────────────────────────── */
  const openSheet = () => {
    stopPulse();
    setSheetVisible(true);
    Animated.parallel([
      Animated.spring(sheetY, { toValue: 0, tension: 140, friction: 12, useNativeDriver: true }),
      Animated.timing(sheetOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  };

  const closeSheet = (cb) => {
    Animated.parallel([
      Animated.timing(sheetY, { toValue: 300, duration: 240, useNativeDriver: true }),
      Animated.timing(sheetOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setSheetVisible(false);
      sheetY.setValue(300);
      cb?.();
      startPulse();
    });
  };

  /* ── Actions ────────────────────────────────────────── */
  const openWhatsApp = () => {
    closeSheet(() => {
      const message = "Hello! I'm interested in your products at Franko Trading Enterprise.";
      const sanitized = WHATSAPP_NUMBER.replace(/[^0-9+]/g, '');
      const waUrl  = `whatsapp://send?phone=${sanitized}&text=${encodeURIComponent(message)}`;
      const webUrl = `https://wa.me/${sanitized}?text=${encodeURIComponent(message)}`;

      Linking.canOpenURL(waUrl)
        .then(ok => Linking.openURL(ok ? waUrl : webUrl))
        .catch(() =>
          Alert.alert('Unable to open WhatsApp', 'Make sure WhatsApp is installed and try again.')
        );
    });
  };

  const makeCall = () => {
    closeSheet(async () => {
      const sanitized = PHONE_NUMBER.replace(/[^0-9+]/g, '');
      const scheme   = Platform.OS === 'ios' ? 'telprompt:' : 'tel:';
      const url      = `${scheme}${sanitized}`;
      try {
        const ok = await Linking.canOpenURL(url);
        await Linking.openURL(ok ? url : `tel:${sanitized}`);
      } catch {
        Alert.alert('Unable to place call', 'Check that your device supports phone calls.');
      }
    });
  };

  /* ── Render ─────────────────────────────────────────── */
  return (
    <>
      {/* ════ BOTTOM SHEET MODAL ════ */}
      <Modal
        visible={sheetVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => closeSheet()}
      >
        <TouchableWithoutFeedback onPress={() => closeSheet()}>
          <Animated.View style={[s.overlay, { opacity: sheetOpacity }]} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            s.sheet,
            { transform: [{ translateY: sheetY }] },
          ]}
        >
          {/* Handle */}
          <View style={s.sheetHandle} />

          {/* Header */}
          <View style={s.sheetHeader}>
            <View style={s.sheetAvatarWrap}>
              <MaterialIcons name="support-agent" size={22} color={G.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.sheetTitle}>Contact Support</Text>
              <Text style={s.sheetSub}>Choose how you'd like to reach us</Text>
            </View>
            <TouchableOpacity style={s.sheetClose} onPress={() => closeSheet()} activeOpacity={0.7}>
              <MaterialIcons name="close" size={16} color={G.textSub} />
            </TouchableOpacity>
          </View>

          {/* Options */}
          <View style={s.optionList}>
            {/* WhatsApp */}
            <TouchableOpacity style={s.optionBtn} onPress={openWhatsApp} activeOpacity={0.82}>
              <View style={[s.optionIcon, { backgroundColor: '#E9FBF0' }]}>
                <FontAwesome name="whatsapp" size={22} color={G.wa} />
              </View>
              <View style={s.optionText}>
                <Text style={s.optionTitle}>WhatsApp</Text>
                <Text style={s.optionSub}>{WHATSAPP_NUMBER}</Text>
              </View>
              <View style={[s.optionArrow, { backgroundColor: '#E9FBF0' }]}>
                <MaterialIcons name="arrow-forward" size={14} color={G.wa} />
              </View>
            </TouchableOpacity>

            {/* Call */}
            <TouchableOpacity style={[s.optionBtn, { borderBottomWidth: 0 }]} onPress={makeCall} activeOpacity={0.82}>
              <View style={[s.optionIcon, { backgroundColor: G.primaryGhost }]}>
                <MaterialIcons name="phone" size={22} color={G.primary} />
              </View>
              <View style={s.optionText}>
                <Text style={s.optionTitle}>Call Us</Text>
                <Text style={s.optionSub}>{PHONE_NUMBER}</Text>
              </View>
              <View style={[s.optionArrow, { backgroundColor: G.primaryGhost }]}>
                <MaterialIcons name="arrow-forward" size={14} color={G.primary} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Footer note */}
          <Text style={s.sheetNote}>
            Available Mon – Sat, 8 AM – 6 PM
          </Text>
        </Animated.View>
      </Modal>

      {/* ════ FAB ════ */}
      <Animated.View
        style={[
          s.fabWrap,
          {
            opacity: fabOpacity,
            transform: [{ scale: Animated.multiply(fabScale, pulseAnim) }],
          },
        ]}
        pointerEvents={sheetVisible ? 'none' : 'box-none'}
      >
        <TouchableOpacity style={s.fab} onPress={openSheet} activeOpacity={0.85}>
          {/* Ring glow */}
          <View style={s.fabRing} pointerEvents="none" />
          <MaterialIcons name="support-agent" size={24} color={G.white} />
        </TouchableOpacity>

        {/* "Need help?" label */}
        <View style={s.fabLabel} pointerEvents="none">
          <Text style={s.fabLabelText}>Need help?</Text>
        </View>
      </Animated.View>
    </>
  );
};

/* ─── USAGE NOTE ─────────────────────────────────────────
 *
 *  To enable scroll-hide, attach the onScroll prop to your
 *  ScrollView (or FlatList) via a ref:
 *
 *    const fabRef = useRef();
 *    ...
 *    <ScrollView
 *      onScroll={fabRef.current?.onScroll}
 *      scrollEventThrottle={16}
 *    >
 *    <FloatingTawkChat ref={fabRef} />
 *
 *  Alternatively, wrap FloatingTawkChat in a forwardRef or
 *  pass onScroll as a prop callback.
 * ────────────────────────────────────────────────────── */

export { FloatingTawkChat as default };

/* ══════════════════════════════════════════════════════
 *  STYLES
 * ════════════════════════════════════════════════════*/
const s = StyleSheet.create({
  /* ── FAB ──────────────────────── */
  fabWrap: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    zIndex: 1000,
    alignItems: 'center',
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: G.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.55)',
    ...fabShadow,
  },
  fabRing: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: G.primaryGlow,
  },
  fabLabel: {
    marginTop: 6,
    backgroundColor: G.primaryDeep,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  fabLabelText: {
    color: G.white,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  /* ── Overlay ──────────────────── */
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: G.overlay,
  },

  /* ── Bottom Sheet ─────────────── */
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: G.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 38 : 22,
    ...sheetShadow,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDE5DF',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF3EF',
  },
  sheetAvatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: G.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: G.text,
    letterSpacing: -0.2,
  },
  sheetSub: {
    fontSize: 12,
    color: G.textSub,
    marginTop: 1,
  },
  sheetClose: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#F3F7F4',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Options ──────────────────── */
  optionList: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: '#F7F9F8',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E4EDE7',
    overflow: 'hidden',
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E4EDE7',
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { flex: 1 },
  optionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: G.text,
    letterSpacing: -0.1,
  },
  optionSub: {
    fontSize: 12,
    color: G.textSub,
    marginTop: 2,
    fontWeight: '500',
  },
  optionArrow: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Footer note ──────────────── */
  sheetNote: {
    textAlign: 'center',
    color: G.textSub,
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 14,
  },
});