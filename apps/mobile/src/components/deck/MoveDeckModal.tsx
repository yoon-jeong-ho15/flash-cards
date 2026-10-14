import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { useFlashcardStore } from '../../store/flashcardStore';
import { Button } from '../common/Button';

interface MoveDeckModalProps {
  isOpen: boolean;
  deckId: string;
  currentFolderId?: string | null;
  onClose: () => void;
}

export const MoveDeckModal: React.FC<MoveDeckModalProps> = ({
  isOpen,
  deckId,
  currentFolderId,
  onClose,
}) => {
  const { folders, moveDeck } = useFlashcardStore();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(
    currentFolderId ?? null
  );

  const handleConfirm = () => {
    moveDeck(deckId, selectedFolderId);
    onClose();
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.dialog}>
              <Text style={styles.title}>폴더 이동</Text>
              <Text style={styles.subtitle}>이 덱을 이동할 폴더를 선택하세요.</Text>

              <ScrollView style={styles.folderList} showsVerticalScrollIndicator={false}>
                {/* 미분류 (루트) 옵션 */}
                <TouchableOpacity
                  style={[
                    styles.folderItem,
                    selectedFolderId === null && styles.folderItemSelected,
                  ]}
                  onPress={() => setSelectedFolderId(null)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.folderIcon}>📂</Text>
                  <View style={styles.folderTextContainer}>
                    <Text
                      style={[
                        styles.folderTitle,
                        selectedFolderId === null && styles.folderTitleSelected,
                      ]}
                    >
                      미분류 (루트 대시보드)
                    </Text>
                  </View>
                  {selectedFolderId === null && <Text style={styles.checkIcon}>✓</Text>}
                </TouchableOpacity>

                {/* 등록된 폴더 목록 */}
                {folders.map((folder) => {
                  const isSelected = selectedFolderId === folder.id;
                  return (
                    <TouchableOpacity
                      key={folder.id}
                      style={[styles.folderItem, isSelected && styles.folderItemSelected]}
                      onPress={() => setSelectedFolderId(folder.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.folderIcon}>📁</Text>
                      <View style={styles.folderTextContainer}>
                        <Text
                          style={[
                            styles.folderTitle,
                            isSelected && styles.folderTitleSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {folder.title}
                        </Text>
                      </View>
                      {isSelected && <Text style={styles.checkIcon}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.actionRow}>
                <Button
                  variant="outline"
                  size="md"
                  onPress={onClose}
                  style={styles.btn}
                >
                  취소
                </Button>
                <Button
                  variant="default"
                  size="md"
                  onPress={handleConfirm}
                  style={styles.btn}
                >
                  이동하기
                </Button>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16,
  },
  folderList: {
    maxHeight: 240,
    marginBottom: 16,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  folderItemSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  folderIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  folderTextContainer: {
    flex: 1,
  },
  folderTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  folderTitleSelected: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  checkIcon: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4F46E5',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
  },
});
