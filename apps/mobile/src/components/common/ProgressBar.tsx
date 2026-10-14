import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';

interface ProgressBarProps {
  value: number; // 0 to 100
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  size = 'md',
  color = '#4F46E5',
  style,
}) => {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <View style={[styles.container, styles[size], style]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clamped}%`,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#E2E8F0',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 9999,
  },
  sm: {
    height: 4,
  },
  md: {
    height: 8,
  },
  lg: {
    height: 12,
  },
});
