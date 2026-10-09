import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Text from './AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient as SvgGradient, Path, Rect, Stop } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';

// Lightweight vector artwork is bundled with the app: the first screen never
// waits for a remote campaign image before it can be shown.
function TechArtwork() {
  return (
    <Svg width={185} height={235} viewBox="0 0 185 235" fill="none" accessible={false}>
      <Defs>
        <SvgGradient id="phone" x1="0" y1="0" x2="1" y2="1"><Stop stopColor="#D8FCE4"/><Stop offset="1" stopColor="#6BCC9C"/></SvgGradient>
        <SvgGradient id="screen" x1="0" y1="0" x2="1" y2="1"><Stop stopColor="#194F40"/><Stop offset="1" stopColor="#0B231F"/></SvgGradient>
      </Defs>
      <Circle cx="102" cy="114" r="86" fill="#FFFFFF" opacity="0.07" />
      <Circle cx="103" cy="114" r="65" stroke="#C6F2CC" opacity="0.28" />
      <Ellipse cx="98" cy="218" rx="77" ry="10" fill="#042B20" opacity="0.45" />
      <G rotation="-14" origin="80,117">
        <Rect x="20" y="38" width="105" height="168" rx="18" fill="#0B2A22" stroke="#A9E6BE" strokeWidth="3" />
        <Rect x="26" y="44" width="93" height="156" rx="14" fill="url(#screen)" />
        <Path d="M26 138C55 65 94 60 119 60V200H26V138Z" fill="#086942" />
        <Path d="M26 170C65 98 87 86 119 86V200H26V170Z" fill="url(#phone)" />
        <Path d="M26 188C62 143 82 128 119 116V200H26V188Z" fill="#E8FFE8" opacity="0.82" />
        <Rect x="60" y="49" width="27" height="5" rx="2.5" fill="#0B2A22" />
      </G>
      <G rotation="14" origin="132,132">
        <Rect x="103" y="83" width="62" height="113" rx="12" fill="#E7F5E5" stroke="#086942" strokeWidth="3" />
        <Circle cx="118" cy="103" r="7" fill="#6CAC88" stroke="#086942" strokeWidth="2" />
        <Circle cx="138" cy="103" r="7" fill="#6CAC88" stroke="#086942" strokeWidth="2" />
        <Circle cx="118" cy="123" r="7" fill="#6CAC88" stroke="#086942" strokeWidth="2" />
        <Path d="M123 178h19" stroke="#9ACBAA" strokeWidth="2" strokeLinecap="round" />
      </G>
      <Circle cx="158" cy="51" r="5" fill="#D9FF85" /><Circle cx="27" cy="29" r="3" fill="#D9FF85" />
      <Path d="M159 30v-11m-5 6h10M12 96V86m-5 5h10" stroke="#D9FF85" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export default function HomeHero() {
  const navigation = useNavigation();
  return (
    <View style={styles.outer}>
      <LinearGradient colors={['#086942', '#086942', '#086942']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.art}><TechArtwork /></View>
        <View style={styles.copy}>
          <View style={styles.eyebrow}><View style={styles.dot} /><Text style={styles.eyebrowText}>FRANKO TRADING</Text></View>
          <Text style={styles.title}>Phones.{"\n"}<Text style={styles.titleAccent}>Laptops. Appliances.</Text></Text>
          <Text style={styles.description}>Shop by category</Text>
          <Pressable style={styles.cta} onPress={() => navigation.navigate('Category')} accessibilityRole="button" accessibilityLabel="Shop categories">
            <Text style={styles.ctaText}>Shop now</Text><Feather name="arrow-up-right" size={17} color="#086942" />
          </Pressable>
        </View>
        <View style={styles.counter}><Text style={styles.counterText}>FRANKO TRADING</Text></View>
      </LinearGradient>
      <View style={styles.benefits}>
        <View style={styles.benefit}><Feather name="truck" size={18} color="#086942"/><View><Text style={styles.benefitTitle}>Nationwide</Text><Text style={styles.benefitSub}>Delivery</Text></View></View>
        <View style={styles.divider} />
        <View style={styles.benefit}><Feather name="shield" size={18} color="#086942"/><View><Text style={styles.benefitTitle}>Quality</Text><Text style={styles.benefitSub}>You can trust</Text></View></View>
        <View style={styles.divider} />
        <View style={styles.benefit}><Feather name="headphones" size={18} color="#086942"/><View><Text style={styles.benefitTitle}>Support</Text><Text style={styles.benefitSub}>Here to help</Text></View></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  hero: { height: 250, borderRadius: 24, overflow: 'hidden', padding: 22, justifyContent: 'center' },
  art: { position: 'absolute', right: -1, bottom: 2 },
  copy: { width: '66%', zIndex: 1 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D8FF85', marginRight: 7 },
  eyebrowText: { color: '#D2F3DB', fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  title: { fontSize: 29, lineHeight: 33, fontWeight: '900', letterSpacing: -1.3, color: '#FFFFFF' },
  titleAccent: { color: '#D8FF85' },
  description: { color: '#D9F2E2', fontSize: 11, lineHeight: 16, maxWidth: 170, marginTop: 10 },
  cta: { alignSelf: 'flex-start', flexDirection: 'row', gap: 15, alignItems: 'center', marginTop: 20, paddingHorizontal: 16, height: 39, borderRadius: 11, backgroundColor: '#D8FF85' },
  ctaText: { color: '#086942', fontSize: 12, fontWeight: '800' },
  counter: { position: 'absolute', right: 18, bottom: 13 },
  counterText: { color: '#C4E7D0', fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  benefits: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 15, marginTop: 12, borderWidth: 1, borderColor: '#EDF2E9' },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  benefitTitle: { color: '#1E3E2F', fontSize: 10, fontWeight: '800' },
  benefitSub: { color: '#89988D', fontSize: 9, marginTop: 2 },
  divider: { width: 1, height: 25, backgroundColor: '#E7EEE8' },
});
