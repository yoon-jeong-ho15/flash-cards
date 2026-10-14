import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { Folder } from '@flashcards/types';
import { Badge } from '../common/Badge';

interface FolderCardProps {
  folder: Folder;
  decksCount: number;
  onPress: () => void;
}

export const FolderCard: React.FC<FolderCardProps> = ({
  folder,
  decksCount,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.headerRow}>
        <View style={styles.iconBox}>
          <Text style={styles.folderIcon}>📁</Text>
        </View>
        <Badge variant="secondary">{decksCount}개 덱</Badge>
      </View>

      <Text style={styles.title} numberOfLines={1}>
        {folder.title}
      </Text>

      {folder.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {folder.description}
        </Text>
      ) : (
        <Text style={styles.emptyDesc}>설명이 없습니다</Text>
      )}

      <View style={styles.footer}>
        <Text style={styles.actionText}>폴더 열기 →</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderIcon: {
    fontSize: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 12,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    alignItems: 'flex-end',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
});
