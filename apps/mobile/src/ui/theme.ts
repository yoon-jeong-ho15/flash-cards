import { useMemo } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { useAppearance } from '../platform/appearance';
import { lightColors, darkColors, type Palette } from './palette';
export { type Palette } from './palette';
export const colors = lightColors;
const createStyles = (colors: Palette) => StyleSheet.create({
  page: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 20,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  title: {
    fontSize: 28,
    lineHeight: 38,
    letterSpacing: -0.8,
    fontWeight: "800",
    color: colors.ink,
  },
  h2: {
    fontSize: 19,
    lineHeight: 28,
    letterSpacing: -0.4,
    fontWeight: "700",
    color: colors.ink,
  },
  text: { fontSize: 15, lineHeight: 24, color: colors.ink },
  muted: { fontSize: 13, lineHeight: 21, color: colors.muted },
  label: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
    color: colors.muted,
  },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  box: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    padding: 20,
    borderRadius: 22,
    gap: 12,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.ink,
    fontSize: 15,
  },
  dock: {
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    gap: 10,
  },
  error: { color: colors.red, fontSize: 14, lineHeight: 22 },
});

export const s = createStyles(lightColors);
const lightStyles = s;
const darkStyles = createStyles(darkColors);
export function useUI() {
  const settings = useAppearance();
  const system = useColorScheme();
  const dark = settings.theme === 'dark' || (settings.theme === 'system' && system === 'dark');
  return { colors: dark ? darkColors : lightColors, s: dark ? darkStyles : lightStyles, dark, uiScale: settings.uiScale };
}
export function useThemedStyles<T>(factory: (colors: Palette) => T): T {
  const { colors } = useUI();
  return useMemo(() => factory(colors), [colors, factory]);
}
