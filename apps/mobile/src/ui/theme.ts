import { useMemo } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { useAppearance } from '../platform/appearance';
import { lightColors, darkColors, type Palette } from './palette';
export { type Palette } from './palette';
export const colors = lightColors;
export const radius = { control: 10, card: 12, sheet: 20 };
const createStyles = (colors: Palette) => StyleSheet.create({
  page: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 14,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.8,
    fontWeight: "700",
    color: colors.ink,
  },
  h2: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.4,
    fontWeight: "700",
    color: colors.ink,
  },
  text: { fontSize: 15, lineHeight: 22, color: colors.ink },
  muted: { fontSize: 13, lineHeight: 20, color: colors.muted },
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
    padding: 14,
    borderRadius: radius.card,
    boxShadow: `0px 1px 2px ${colors.shadow}`,
    gap: 10,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.input,
    backgroundColor: colors.card,
    borderRadius: radius.control,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.ink,
    fontSize: 15,
  },
  dock: {
    paddingHorizontal: 16,
    paddingVertical: 10,
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
