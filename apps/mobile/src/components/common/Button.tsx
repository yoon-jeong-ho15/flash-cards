import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';

export type ButtonVariant = 'default' | 'outline' | 'ghost' | 'destructive' | 'success' | 'warning';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  leftIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onPress,
  variant = 'default',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  leftIcon,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'default' || variant === 'destructive' ? '#FFFFFF' : '#4F46E5'}
        />
      ) : (
        <>
          {leftIcon && <>{leftIcon}</>}
          {typeof children === 'string' ? (
            <Text
              style={[
                styles.textBase,
                styles[`text_${variant}`],
                styles[`textSize_${size}`],
                textStyle,
              ]}
            >
              {children}
            </Text>
          ) : (
            children
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    gap: 6,
  },
  default: {
    backgroundColor: '#4F46E5',
    borderWidth: 1,
    borderColor: '#4F46E5',
  },
  outline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  destructive: {
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  success: {
    backgroundColor: '#10B981',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  warning: {
    backgroundColor: '#F59E0B',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  size_sm: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  size_md: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  size_lg: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  disabled: {
    opacity: 0.45,
  },
  textBase: {
    fontWeight: '600',
  },
  text_default: {
    color: '#FFFFFF',
  },
  text_outline: {
    color: '#334155',
  },
  text_ghost: {
    color: '#4F46E5',
  },
  text_destructive: {
    color: '#FFFFFF',
  },
  text_success: {
    color: '#FFFFFF',
  },
  text_warning: {
    color: '#FFFFFF',
  },
  textSize_sm: {
    fontSize: 12,
  },
  textSize_md: {
    fontSize: 14,
  },
  textSize_lg: {
    fontSize: 16,
  },
});
