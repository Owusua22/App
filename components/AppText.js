import React, { forwardRef } from 'react';
import { StyleSheet, Text as NativeText, TextInput as NativeTextInput } from 'react-native';

// One bundled type family across the app, with explicit weight files so bold
// headings and prices do not silently fall back to a platform-specific font.
const weightFamily = {
  '100': 'Inter_400Regular', '200': 'Inter_400Regular', '300': 'Inter_400Regular',
  '400': 'Inter_400Regular', '500': 'Inter_500Medium', '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold', '800': 'Inter_800ExtraBold', '900': 'Inter_900Black',
  normal: 'Inter_400Regular', bold: 'Inter_700Bold',
};

const AppText = forwardRef(({ style, ...props }, ref) => {
  const flat = StyleSheet.flatten(style);
  const family = weightFamily[flat?.fontWeight || '400'] || 'Inter_400Regular';
  return <NativeText ref={ref} {...props} style={[style, { fontFamily: family, fontWeight: 'normal' }]} />;
});
AppText.displayName = 'AppText';

export const AppTextInput = forwardRef(({ style, ...props }, ref) => (
  <NativeTextInput ref={ref} {...props} style={[style, { fontFamily: 'Inter_400Regular' }]} />
));
AppTextInput.displayName = 'AppTextInput';

export default AppText;
