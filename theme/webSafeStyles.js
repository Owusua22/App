import { Platform, StyleSheet } from 'react-native';

const toRGBA = (color, opacity) => {
  const hex = String(color || '#000').replace('#', '');
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    const [r, g, b] = [...hex].map((digit) => parseInt(digit + digit, 16));
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    const [r, g, b] = [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16));
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return color || '#000';
};

// RN Web deprecates shadow* styles. Convert only on web; keep precisely the
// original iOS/Android definitions. This also works for existing screen styles
// without changing their visual layout or their native elevation behavior.
export const createWebSafeStyles = (definitions) => {
  if (Platform.OS !== 'web') return StyleSheet.create(definitions);
  const converted = {};
  for (const [name, style] of Object.entries(definitions)) {
    if (!style || typeof style !== 'object' || !('shadowColor' in style || 'shadowOffset' in style || 'shadowOpacity' in style || 'shadowRadius' in style)) {
      converted[name] = style;
      continue;
    }
    const { shadowColor, shadowOffset, shadowOpacity, shadowRadius, ...rest } = style;
    const opacity = Number(shadowOpacity) || 0;
    converted[name] = {
      ...rest,
      ...(opacity > 0 && !rest.boxShadow ? {
        boxShadow: `${Number(shadowOffset?.width) || 0}px ${Number(shadowOffset?.height) || 0}px ${Math.max(1, (Number(shadowRadius) || 2) * 2)}px ${toRGBA(shadowColor, opacity)}`,
      } : {}),
    };
  }
  return StyleSheet.create(converted);
};
