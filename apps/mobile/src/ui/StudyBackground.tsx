import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useUI } from './theme';

export function StudyBackground() {
  const { colors } = useUI();
  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.studyBg }]}
    />
  );
}
