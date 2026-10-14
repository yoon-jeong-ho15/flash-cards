import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFlashcardStore } from '../../store/flashcardStore';
import { Input } from '../common/Input';
import { Button } from '../common/Button';

interface FolderModalProps {
  isOpen: boolean;
  folderId?: string;
  onClose: () => void;
  onSaved?: (folderId: string) => void;
}

export const FolderModal: React.FC<FolderModalProps> = ({
  isOpen,
  folderId,
  onClose,
  onSaved,
}) => {
  const { folders, addFolder, updateFolder } = useFlashcardStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (folderId) {
        const existing = folders.find((f) => f.id === folderId);
        if (existing) {
          setTitle(existing.title);
          setDescription(existing.description || '');
        }
      } else {
        setTitle('');
        setDescription('');
      }
      setError(null);
    }
  }, [isOpen, folderId, folders]);

  const handleSave = () => {
    if (!title.trim()) {
      setError('폴더 이름을 입력해 주세요.');
      return;
    }

    if (folderId) {
      updateFolder(folderId, {
        title: title.trim(),
        description: description.trim() || undefined,
      });
      onSaved?.(folderId);
    } else {
      const newId = addFolder(title.trim(), description.trim() || undefined);
      onSaved?.(newId);
    }

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
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardView}
          >
            <TouchableWithoutFeedback>
              <View style={styles.dialog}>
                <Text style={styles.title}>
                  {folderId ? '폴더 수정' : '새 폴더 생성'}
                </Text>

                <View style={styles.formGroup}>
                  <Input
                    label="폴더 이름"
                    required
                    placeholder="예: 💻 CS 전공지식, 🌏 토익 영단어"
                    value={title}
                    onChangeText={(val) => {
                      setTitle(val);
                      if (error) setError(null);
                    }}
                    error={error ?? undefined}
                    autoFocus
                  />
                </View>

                <View style={styles.formGroup}>
                  <Input
                    label="폴더 설명 (선택)"
                    placeholder="폴더에 대한 간단한 설명을 입력하세요"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                  />
                </View>

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
                    onPress={handleSave}
                    style={styles.btn}
                  >
                    {folderId ? '수정 완료' : '폴더 만들기'}
                  </Button>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
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
    padding: 20,
  },
  keyboardView: {
    width: '100%',
    alignItems: 'center',
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
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
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 14,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  btn: {
    flex: 1,
  },
});
