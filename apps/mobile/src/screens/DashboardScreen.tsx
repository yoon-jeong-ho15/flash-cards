import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useFlashcardStore } from '../store/flashcardStore';
import { DeckCard } from '../components/deck/DeckCard';
import { FolderCard } from '../components/folder/FolderCard';
import { EmptyState } from '../components/common/EmptyState';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Input } from '../components/common/Input';
import { ProgressBar } from '../components/common/ProgressBar';
import { UserAuthModal } from '../components/common/UserAuthModal';
import { GoogleLoginModal } from '../components/common/GoogleLoginModal';

interface DashboardScreenProps {
  onNavigateFolder: (folderId: string) => void;
  onNavigateDeck: (deckId: string) => void;
  onNavigateAllFolders: () => void;
  onNavigateAllDecks: () => void;
  onStartStudy: (deckId: string) => void;
  onCreateDeck: () => void;
  onCreateFolder: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNavigateFolder,
  onNavigateDeck,
  onNavigateAllFolders,
  onNavigateAllDecks,
  onStartStudy,
  onCreateDeck,
  onCreateFolder,
}) => {
  const { folders, decks, cards, user, syncStatus, initCloudSync, loginWithGoogle, logout } = useFlashcardStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'root'>('all');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  // 통계 계산
  const totalCards = cards.length;
  const masteredCards = cards.filter((c) => c.learned).length;
  const overallProgress = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;

  // 검색 및 탭 필터링
  const filteredDecks = useMemo(() => {
    let result = decks;

    if (activeTab === 'root') {
      result = result.filter((d) => !d.folderId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((d) => {
        const titleMatch = d.title.toLowerCase().includes(q);
        const descMatch = d.description?.toLowerCase().includes(q);
        const cardMatch = cards
          .filter((c) => c.deckId === d.id)
          .some(
            (c) =>
              c.termRichText.toLowerCase().includes(q) ||
              c.definitionRichText.toLowerCase().includes(q)
          );
        return titleMatch || descMatch || cardMatch;
      });
    }

    return result;
  }, [decks, cards, searchQuery, activeTab]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. 상단 로그인 바: 로그인 시 프로필 바, 비로그인 시 구글 로그인 배너 */}
      {user ? (
        <View style={styles.userBar}>
          <TouchableOpacity
            style={styles.userProfileBtn}
            onPress={() => setShowAuthModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.userAvatarMini}>
              <Text style={styles.userAvatarMiniText}>
                {(user.displayName || user.email || 'U')[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.userTextCol}>
              <Text style={styles.userNameMini} numberOfLines={1}>
                {user.displayName || user.email}
              </Text>
              <Text style={styles.userSyncMini}>
                {syncStatus === 'synced'
                  ? '🟢 클라우드 동기화 완료'
                  : syncStatus === 'syncing'
                  ? '🔄 동기화 중...'
                  : '클릭하여 계정 설정'}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.userBarRight}>
            <TouchableOpacity
              style={styles.refreshSyncBtn}
              onPress={() => initCloudSync()}
              activeOpacity={0.7}
              accessibilityLabel="동기화 새로고침"
            >
              <Text style={styles.refreshSyncIcon}>🔄</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutMiniBtn}
              onPress={logout}
              activeOpacity={0.7}
            >
              <Text style={styles.logoutMiniText}>로그아웃</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* 비로그인(게스트) 상태일 때 Google 로그인 유도 배너 */
        <View style={styles.googleBanner}>
          <View style={styles.googleBannerLeft}>
            <View style={styles.googleIconBadge}>
              <Text style={styles.googleGIcon}>G</Text>
            </View>
            <View style={styles.googleBannerTextCol}>
              <Text style={styles.googleBannerTitle}>Google 계정으로 로그인</Text>
              <Text style={styles.googleBannerSubtitle}>
                로그인하면 웹앱의 모든 덱과 카드를 실시간 동기화합니다.
              </Text>
            </View>
          </View>

          <Button
            variant="default"
            size="sm"
            onPress={() => setShowGoogleModal(true)}
            style={styles.googleLoginBtn}
          >
            Google 로그인
          </Button>
        </View>
      )}

      {/* 상단 헤더 & 액션 버튼 */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.mainTitle}>대시보드</Text>
          <Text style={styles.mainSubtitle}>
            {user ? `${user.displayName || '사용자'}님의 플래시카드 보관함` : '플래시카드 덱과 폴더 관리'}
          </Text>
        </View>

        <View style={styles.quickActionRow}>
          <Button
            variant="outline"
            size="sm"
            onPress={onCreateFolder}
          >
            + 새 폴더
          </Button>
          <Button
            variant="default"
            size="sm"
            onPress={onCreateDeck}
          >
            + 새 덱 만들기
          </Button>
        </View>
      </View>

      {/* 4열 통계 지표 카드 그리드 (2x2) */}
      <View style={styles.statsGrid}>
        {/* Card 1: 총 학습 카드 */}
        <View style={styles.statCard}>
          <View style={styles.statCardHeader}>
            <Text style={styles.statTitle}>총 학습 카드</Text>
            <View style={styles.statIconBox}>
              <Text style={styles.statIcon}>📚</Text>
            </View>
          </View>
          <Text style={styles.statValue}>{totalCards}</Text>
          <Text style={styles.statDesc}>전체 등록 카드</Text>
        </View>

        {/* Card 2: 마스터 완료 */}
        <View style={styles.statCard}>
          <View style={styles.statCardHeader}>
            <Text style={styles.statTitle}>마스터 완료</Text>
            <View style={[styles.statIconBox, { backgroundColor: '#ECFDF5' }]}>
              <Text style={styles.statIcon}>✓</Text>
            </View>
          </View>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{masteredCards}</Text>
          <Text style={styles.statDesc}>학습 완료된 카드</Text>
        </View>

        {/* Card 3: 전체 달성률 */}
        <View style={styles.statCard}>
          <View style={styles.statCardHeader}>
            <Text style={styles.statTitle}>전체 달성률</Text>
            <View style={styles.statIconBox}>
              <Text style={styles.statIcon}>📈</Text>
            </View>
          </View>
          <Text style={styles.statValue}>{overallProgress}%</Text>
          <View style={styles.progressWrapper}>
            <ProgressBar value={overallProgress} size="sm" />
          </View>
        </View>

        {/* Card 4: 보관 덱 & 폴더 */}
        <View style={styles.statCard}>
          <View style={styles.statCardHeader}>
            <Text style={styles.statTitle}>학습 덱 & 폴더</Text>
            <View style={styles.statIconBox}>
              <Text style={styles.statIcon}>🗂️</Text>
            </View>
          </View>
          <Text style={styles.statValue}>{decks.length}</Text>
          <Text style={styles.statDesc}>폴더 {folders.length}개 보관 중</Text>
        </View>
      </View>

      {/* 검색 바 */}
      <View style={styles.searchSection}>
        <Input
          placeholder="덱 제목, 카드 단어, 개념 검색..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* 섹션 1: 학습 폴더 목록 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionIcon}>📁</Text>
            <Text style={styles.sectionTitle}>학습 폴더</Text>
            <Badge variant="secondary">{folders.length}</Badge>
          </View>

          <View style={styles.sectionActions}>
            {folders.length > 0 && (
              <TouchableOpacity
                onPress={onNavigateAllFolders}
                style={styles.moreBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.moreBtnText}>더보기 →</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={onCreateFolder}
              style={styles.addBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.addBtnText}>+ 추가</Text>
            </TouchableOpacity>
          </View>
        </View>

        {folders.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyBoxText}>
              폴더를 생성하여 관련된 카드 덱을 체계적으로 묶어보세요.
            </Text>
          </View>
        ) : (
          <View>
            {folders.slice(0, 4).map((folder) => {
              const count = decks.filter((d) => d.folderId === folder.id).length;
              return (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  decksCount={count}
                  onPress={() => onNavigateFolder(folder.id)}
                />
              );
            })}
            {folders.length > 4 && (
              <Button
                variant="outline"
                size="sm"
                onPress={onNavigateAllFolders}
                style={styles.seeAllBtn}
              >
                전체 폴더 {folders.length}개 모두 보기 →
              </Button>
            )}
          </View>
        )}
      </View>

      {/* 섹션 2: 카드 덱 목록 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionIcon}>📖</Text>
            <Text style={styles.sectionTitle}>학습 덱 목록</Text>
            <Badge variant="secondary">{filteredDecks.length}</Badge>
          </View>

          <View style={styles.sectionActions}>
            {decks.length > 0 && (
              <TouchableOpacity
                onPress={onNavigateAllDecks}
                style={styles.moreBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.moreBtnText}>더보기 →</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={onCreateDeck}
              style={styles.addBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.addBtnText}>+ 새 덱</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 탭 필터 (전체 / 미분류) */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'all' && styles.tabItemActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
              전체
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'root' && styles.tabItemActive]}
            onPress={() => setActiveTab('root')}
          >
            <Text style={[styles.tabText, activeTab === 'root' && styles.tabTextActive]}>
              미분류
            </Text>
          </TouchableOpacity>
        </View>

        {filteredDecks.length === 0 ? (
          <EmptyState
            icon="📖"
            title={
              searchQuery
                ? '검색 결과와 일치하는 덱이 없습니다.'
                : !user
                ? 'Google 계정으로 로그인해 보세요'
                : '등록된 덱이 없습니다.'
            }
            description={
              searchQuery
                ? '다른 검색어로 다시 시도해 보세요.'
                : !user
                ? '웹앱에서 만든 모든 덱과 카드를 가져오려면 Google 로그인을 진행하세요.'
                : '새로운 카드 덱을 생성하여 플래시카드 학습을 시작해 보세요.'
            }
            action={
              !user ? (
                <Button variant="default" size="sm" onPress={() => setShowGoogleModal(true)}>
                  Google 계정으로 로그인하기
                </Button>
              ) : (
                <Button variant="default" size="sm" onPress={onCreateDeck}>
                  새 덱 만들기
                </Button>
              )
            }
          />
        ) : (
          <View>
            {filteredDecks.slice(0, 6).map((deck) => {
              const deckCards = cards.filter((c) => c.deckId === deck.id);
              const learned = deckCards.filter((c) => c.learned).length;
              const parentFolder = deck.folderId
                ? folders.find((f) => f.id === deck.folderId)
                : null;

              return (
                <DeckCard
                  key={deck.id}
                  deck={deck}
                  cardsCount={deckCards.length}
                  learnedCount={learned}
                  parentFolderTitle={parentFolder?.title}
                  onPress={() => onNavigateDeck(deck.id)}
                  onStartStudy={() => onStartStudy(deck.id)}
                />
              );
            })}

            {filteredDecks.length > 6 && (
              <Button
                variant="outline"
                size="sm"
                onPress={onNavigateAllDecks}
                style={styles.seeAllBtn}
              >
                전체 덱 {filteredDecks.length}개 모두 보기 →
              </Button>
            )}
          </View>
        )}
      </View>

      {/* 하단 푸터 */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          ⚡ FlashCards Mobile • 웹앱과 완벽 동기화
        </Text>
      </View>

      {/* 사용자 계정 및 클라우드 동기화 모달 */}
      <UserAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* 구글 로그인 모달 */}
      <GoogleLoginModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        onSuccess={(profile) => {
          loginWithGoogle(profile);
          setShowGoogleModal(false);
        }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  userBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  userProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  userAvatarMini: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  userAvatarMiniText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4F46E5',
  },
  userTextCol: {
    flex: 1,
  },
  userNameMini: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  userSyncMini: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  refreshSyncBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  refreshSyncIcon: {
    fontSize: 14,
  },
  userBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoutMiniBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutMiniText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  googleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  googleBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  googleIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  googleGIcon: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4285F4',
  },
  googleBannerTextCol: {
    flex: 1,
  },
  googleBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  googleBannerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  googleLoginBtn: {
    flexShrink: 0,
  },
  topHeader: {
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  mainSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 18,
  },
  quickActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  statIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIcon: {
    fontSize: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
  },
  statDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  progressWrapper: {
    marginTop: 6,
  },
  searchSection: {
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionIcon: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  moreBtn: {
    paddingVertical: 4,
  },
  moreBtnText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  addBtn: {
    paddingVertical: 4,
  },
  addBtnText: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '700',
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
  },
  emptyBoxText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  seeAllBtn: {
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    padding: 2,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  tabItem: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#94A3B8',
  },
});
