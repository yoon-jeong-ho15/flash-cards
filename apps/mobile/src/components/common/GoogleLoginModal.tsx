import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import type { UserProfile } from '@flashcards/types';
import { GOOGLE_OAUTH_CONFIG, googleAuthService } from '../../services/googleAuthService';
import { Input } from './Input';
import { Button } from './Button';

// WebBrowser 세션 완료 리스너 등록
WebBrowser.maybeCompleteAuthSession();

interface GoogleLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
}

export const GoogleLoginModal: React.FC<GoogleLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Google OAuth id_token 요청 훅
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: GOOGLE_OAUTH_CONFIG.iosClientId,
    androidClientId: GOOGLE_OAUTH_CONFIG.androidClientId,
    webClientId: GOOGLE_OAUTH_CONFIG.webClientId,
    selectAccount: true,
  });

  const processGoogleIdToken = async (idToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await googleAuthService.exchangeGoogleIdTokenWithFirebase(idToken);
      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Google 계정 정보를 가져오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params?.id_token;
      if (idToken) {
        processGoogleIdToken(idToken);
      }
    } else if (response?.type === 'error') {
      setError(response.error?.message || 'Google 로그인 중 오류가 발생했습니다.');
      setLoading(false);
    } else if (response?.type === 'cancel' || response?.type === 'dismiss') {
      setLoading(false);
    }
  }, [response]);

  const handleStartGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await promptAsync();
      if (result.type === 'success') {
        const idToken = result.params?.id_token;
        if (idToken) {
          await processGoogleIdToken(idToken);
        }
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        setLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Google 로그인 브라우저를 열 수 없습니다.');
      setLoading(false);
    }
  };

  const handleCustomLogin = async () => {
    if (!customEmail.trim() || !customEmail.includes('@')) {
      setError('올바른 Google 이메일 주소를 입력해 주세요.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await googleAuthService.signInWithCustomEmail(customEmail, customName);
      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err?.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
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
              {/* Google 브랜드 로고 및 타이틀 */}
              <View style={styles.header}>
                <View style={styles.googleLogoContainer}>
                  <Text style={styles.googleG}>G</Text>
                  <Text style={styles.googleO1}>o</Text>
                  <Text style={styles.googleO2}>o</Text>
                  <Text style={styles.googleG2}>g</Text>
                  <Text style={styles.googleL}>l</Text>
                  <Text style={styles.googleE}>e</Text>
                </View>
                <Text style={styles.headerTitle}>Google 계정으로 로그인</Text>
                <Text style={styles.headerSubtitle}>
                  Google 공식 로그인 창에서 원하는 계정을 선택하여 로그인하세요.
                </Text>
              </View>

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#4285F4" />
                  <Text style={styles.loadingText}>Google 인증 진행 중...</Text>
                  <Text style={styles.loadingSubtext}>브라우저 창이 열리면 계정을 선택해 주세요.</Text>
                </View>
              ) : (
                <View style={styles.content}>
                  {error && (
                    <View style={styles.errorBox}>
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}

                  {!showCustomInput ? (
                    <View style={styles.actionsContainer}>
                      {/* 실제 Google 공식 OAuth 로그인 버튼 */}
                      <TouchableOpacity
                        style={styles.googleMainButton}
                        onPress={handleStartGoogleSignIn}
                        activeOpacity={0.8}
                      >
                        <View style={styles.googleIconBox}>
                          <Text style={styles.googleGIcon}>G</Text>
                        </View>
                        <View style={styles.googleButtonTextBox}>
                          <Text style={styles.googleButtonMainText}>Google 계정으로 계속하기</Text>
                          <Text style={styles.googleButtonSubText}>Google 공식 브라우저 인증 창 열기</Text>
                        </View>
                        <Text style={styles.arrowIcon}>→</Text>
                      </TouchableOpacity>

                      {/* 구분선 */}
                      <View style={styles.dividerRow}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>또는</Text>
                        <View style={styles.dividerLine} />
                      </View>

                      {/* 이메일 직접 입력 옵션 */}
                      <TouchableOpacity
                        style={styles.secondaryOptionButton}
                        onPress={() => setShowCustomInput(true)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.secondaryOptionText}>
                          이메일 직접 입력으로 시작
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    /* 커스텀 이메일 직접 입력 폼 */
                    <View style={styles.customForm}>
                      <Input
                        label="Google 이메일 주소"
                        placeholder="example@gmail.com"
                        value={customEmail}
                        onChangeText={setCustomEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        autoFocus
                      />
                      <Input
                        label="이름 (선택)"
                        placeholder="이름 입력"
                        value={customName}
                        onChangeText={setCustomName}
                        containerStyle={{ marginTop: 8 }}
                      />

                      <View style={styles.customActionRow}>
                        <Button
                          variant="outline"
                          size="md"
                          onPress={() => setShowCustomInput(false)}
                          style={{ flex: 1 }}
                        >
                          뒤로
                        </Button>
                        <Button
                          variant="default"
                          size="md"
                          onPress={handleCustomLogin}
                          style={{ flex: 1 }}
                        >
                          로그인
                        </Button>
                      </View>
                    </View>
                  )}

                  {/* 개인정보 및 서비스 약관 안내 */}
                  <Text style={styles.footerNotice}>
                    로그인하면 FlashCards 서비스 약관 및 개인정보 보호정책에 동의하게 되며, 클라우드와 데이터가 안전하게 동기화됩니다.
                  </Text>
                </View>
              )}

              <View style={styles.footerCloseRow}>
                <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>닫기</Text>
                </TouchableOpacity>
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
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  googleLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  googleG: {
    fontSize: 26,
    fontWeight: '800',
    color: '#4285F4',
  },
  googleO1: {
    fontSize: 26,
    fontWeight: '800',
    color: '#EA4335',
  },
  googleO2: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FBBC05',
  },
  googleG2: {
    fontSize: 26,
    fontWeight: '800',
    color: '#4285F4',
  },
  googleL: {
    fontSize: 26,
    fontWeight: '800',
    color: '#34A853',
  },
  googleE: {
    fontSize: 26,
    fontWeight: '800',
    color: '#EA4335',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  loadingContainer: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  loadingSubtext: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  content: {
    marginBottom: 8,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 12,
    color: '#B91C1C',
    textAlign: 'center',
  },
  actionsContainer: {
    gap: 14,
    marginBottom: 14,
  },
  googleMainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    shadowColor: '#4285F4',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    gap: 14,
  },
  googleIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  googleGIcon: {
    fontSize: 20,
    fontWeight: '900',
    color: '#4285F4',
  },
  googleButtonTextBox: {
    flex: 1,
  },
  googleButtonMainText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  googleButtonSubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  arrowIcon: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    paddingHorizontal: 10,
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  secondaryOptionButton: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  secondaryOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  customForm: {
    marginBottom: 16,
  },
  customActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  footerNotice: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  footerCloseRow: {
    alignItems: 'center',
    marginTop: 6,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
});
