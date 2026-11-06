import React, { createContext, forwardRef, useContext } from 'react';
import { Text as NativeText, TextInput as NativeTextInput, StyleSheet, type TextProps, type TextInputProps } from 'react-native';
import { useUI } from './theme';

const NestedText = createContext(false);
export const Text = forwardRef<React.ComponentRef<typeof NativeText>, TextProps>(function Text({ style, ...props }, ref) {
  const { uiScale, colors } = useUI();
  const nested = useContext(NestedText);
  const flat = StyleSheet.flatten(style);
  const size = flat?.fontSize ?? (nested ? undefined : 14);
  return <NestedText.Provider value><NativeText ref={ref} {...props} style={[
    !nested && { color: colors.ink }, style,
    size !== undefined && { fontSize: size * uiScale },
    flat?.lineHeight !== undefined && { lineHeight: flat.lineHeight * uiScale },
  ]} /></NestedText.Provider>;
});
export const TextInput = forwardRef<React.ComponentRef<typeof NativeTextInput>, TextInputProps>(function TextInput({ style, ...props }, ref) {
  const { uiScale, dark, colors } = useUI();
  const flat = StyleSheet.flatten(style);
  return <NativeTextInput ref={ref} placeholderTextColor={colors.muted} selectionColor={colors.primary} keyboardAppearance={dark ? 'dark' : 'light'} {...props}
    style={[{ color: colors.ink }, style, { fontSize: (flat?.fontSize ?? 15) * uiScale }, flat?.lineHeight !== undefined && { lineHeight: flat.lineHeight * uiScale }]} />;
});
