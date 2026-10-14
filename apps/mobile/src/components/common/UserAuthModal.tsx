import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
} from 'react-native';
import { useFlashcardStore } from '../../store/flashcardStore';
import { Button } from './Button';
import { Badge } from './Badge';
import { GoogleLoginModal } from './GoogleLoginModal';

interface UserAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserAuthModal: React.FC<UserAuthModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, syncStatus, lastSyncedAt, initCloudSync, logout, loginWithGoogle } = useFlashcardStore();
  const [loading, setLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  const handleSync = async () => {
    setLoading(true);
    await initCloudSync();
    setLoading(false);
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <>
      <Modal
        visible={isOpen && !showGoogleModal}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.dialog}>
                <View style={styles.header}>
                  <Text style={styles.title}>내 계정 및 클라우드 동기화</Text>
                  <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <Text style={styles.closeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {user ? (
                  <View style={styles.profileSection}>
                    <View style={styles.avatarRow}>
                      {user.photoURL ? (
                        <Image
                          source={{ uri: user.photoURL }}
                          style={styles.avatarImage}
                        />
                      ) : (
                        <View style={styles.avatarFallback}>
                          <Text style={styles.avatarText}>
                            {(user.displayName || user.email || 'U')[0].toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{user.displayName || '사용자'}</Text>
                        <Text style={styles.userEmail}>{user.email}</Text>
                        <View style={styles.badgeRow}>
                          <Badge variant="success">✓ 로그인됨</Badge>
                          <Badge variant="secondary">
                            {syncStatus === 'synced'
                              ? '🟢 동기화 완료'
                              : syncStatus === 'syncing'
                              ? '🔄 동기화 중...'
                              : '오프라인'}
                          </Badge>
                        </View>
                      </View>
                    </View>

                    <View style={styles.infoBox}>
                      <Text style={styles.infoText}>
                        • Firebase Firestore에 등록된 카드를 실시간으로 불러오고 있습니다.
                      </Text>
                      {lastSyncedAt && (
                        <Text style={styles.syncTimeText}>
                          마지막 동기화: {new Date(lastSyncedAt).toLocaleTimeString()}
                        </Text>
                      )}
                    </View>

                    <View style={styles.actionColumn}>
                      <Button
                        variant="default"
                        size="md"
                        onPress={handleSync}
                        loading={loading}
                        style={styles.btn}
                      >
                        지금 클라우드 새로고침 🔄
                      </Button>

                      <Button
                        variant="outline"
                        size="md"
                        onPress={handleLogout}
                        style={styles.btn}
                      >
                        로그아웃
                      </Button>
                    </View>
                  </View>
                ) : (
                  <View style={styles.guestSection}>
                    <Text style={styles.guestTitle}>로그인이 필요합니다</Text>
                    <Text style={styles.guestDesc}>
                      Google 계정으로 로그인하면 웹앱에서 작성한 모든 덱과 카드를 실시간으로 가져옵니다.
                    </Text>
                    <Button
                      variant="default"
                      size="lg"
                      onPress={() => setShowGoogleModal(true)}
                      style={styles.loginBtn}
                    >
                      Google 계정으로 로그인하기
                    </Button>
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* 구글 로그인 전용 다이얼로그 */}
      <GoogleLoginModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        onSuccess={(profile) => {
          loginWithGoogle(profile);
          setShowGoogleModal(false);
          onClose();
        }}
      />
    </>
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
  dialog: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  closeBtnText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '700',
  },
  profileSection: {
    gap: 16,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E2E8F0',
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4F46E5',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  userEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  infoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  syncTimeText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 6,
  },
  actionColumn: {
    gap: 10,
  },
  btn: {
    width: '100%',
  },
  guestSection: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  guestTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  guestDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  loginBtn: {
    width: '100%',
  },
});
