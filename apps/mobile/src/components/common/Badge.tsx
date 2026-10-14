import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';

export type BadgeVariant = 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: StyleProp<ViewStyle>;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', style }) => {
  return (
    <View style={[styles.base, styles[variant], style]}>
      {typeof children === 'string' || typeof children === 'number' ? (
        <Text style={[styles.text, styles[`text_${variant}`]]}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
  },
  default: {
    backgroundColor: '#EEF2FF',
  },
  secondary: {
    backgroundColor: '#F1F5F9',
  },
  success: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  warning: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  destructive: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  outline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
  text_default: {
    color: '#4F46E5',
  },
  text_secondary: {
    color: '#475569',
  },
  text_success: {
    color: '#059669',
  },
  text_warning: {
    color: '#D97706',
  },
  text_destructive: {
    color: '#DC2626',
  },
  text_outline: {
    color: '#64748B',
  },
});
