import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { sortSets } from '../core/content';
import { store, useStore } from '../platform/runtime';
import { CollectionLayoutToggle } from './CollectionLayoutToggle';
import { CollectionIcon, CollectionSurface } from './CollectionSurface';
import { SetTile } from './SetTile';
import { Icon } from './Icon';
import { Button, attempt } from './kit';
import { libraryStyles } from './libraryShared';
import type { Navigation } from './navigation';
import { radius, useThemedStyles, useUI, type Palette } from './theme';
import { Text } from './Typography';
import { useCollectionGrid } from './useCollectionGrid';

function DashboardSection({
  title,
  action,
  onPress,
  accessory,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
  accessory?: React.ReactNode;
}) {
  const { colors, s } = useUI();
  return (
    <View style={[s.row, { justifyContent: 'space-between', flexWrap: 'nowrap' }]}>
      <Text numberOfLines={1} style={[s.h2, { flex: 1, minWidth: 0 }]}>
        {title}
      </Text>
      {accessory}
      {onPress && (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={libraryStyles.textAction}
        >
          <Text style={[s.label, { color: colors.primary }]}>
            {action || '전체 보기'}
          </Text>
          <Icon name="chevron" size={15} />
        </Pressable>
      )}
    </View>
  );
}

/** Displays the home overview with search shortcut, study stats, recent sets, and folders. */
export function Dashboard({
  nav,
  onNewFolder,
}: {
  nav: Navigation;
  onNewFolder: () => void;
}) {
  const { colors, s } = useUI();
  const styles = useThemedStyles(createStyles);
  const { cards, sets, folders, user } = useStore();
  const [isCreatingSampleSet, setIsCreatingSampleSet] = useState(false);
  const recentSets = sortSets(sets, 'date-desc');
  const collectionGrid = useCollectionGrid();
  const learnedCardCount = cards.filter((card) => card.learned).length;

  const handleCreateSampleSet = () => {
    setIsCreatingSampleSet(true);
    void attempt(async () => {
      const createdSetId = await store.saveSet(
        undefined,
        {
          title: '하루 6개, 여행 영어',
          description: '여행에서 바로 쓰는 표현으로 첫 학습을 시작해 보세요.',
        },
        [
          ['Where is the nearest station?', '가장 가까운 역이 어디인가요?'],
          ['Could I see the menu, please?', '메뉴를 볼 수 있을까요?'],
          ['I would like to check in.', '체크인하고 싶어요.'],
          ['How much is this?', '이것은 얼마인가요?'],
          ['Can I pay by card?', '카드로 결제할 수 있나요?'],
          ['Thank you for your help.', '도와주셔서 감사합니다.'],
        ].map(([front, back]) => ({
          termRichText: `<p>${front}</p>`,
          definitionRichText: `<p>${back}</p>`,
        }))
      );
      nav.go({ type: 'set', setId: createdSetId });
    }).finally(() => setIsCreatingSampleSet(false));
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[s.page, { gap: 16 }]}
    >
      <View style={{ gap: 6 }}>
        <Text style={s.muted}>
          {new Intl.DateTimeFormat('ko-KR', {
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          }).format(new Date())}
        </Text>
        <Text style={s.title}>
          {user?.displayName ? `${user.displayName}님,` : '반가워요,'}
          {'\n'}오늘도 하나씩 기억해요
          <Text style={{ color: colors.primary }}>.</Text>
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="내 학습 자료 검색"
        onPress={() => nav.go({ type: 'search' })}
        style={styles.searchBar}
      >
        <Icon name="search" color={colors.icon} />
        <Text style={[s.muted, { flex: 1 }]}>어떤 내용을 공부할까요?</Text>
      </Pressable>
      <View style={styles.statsCard}>
        {(
          [
            [sets.length, '학습 세트', colors.primary],
            [cards.length, '전체 카드', colors.info],
            [learnedCardCount, '기억한 카드', colors.success],
          ] as const
        ).map(([value, label, color], index) => (
          <View
            key={label}
            style={[
              styles.statColumn,
              index > 0 && { borderLeftWidth: 1, borderColor: colors.border },
            ]}
          >
            <Text style={[s.h2, { fontSize: 22, lineHeight: 28, color }]}>
              {value}
            </Text>
            <Text style={s.label}>{label}</Text>
          </View>
        ))}
      </View>
      <View style={{ gap: 10 }}>
        <DashboardSection
          title="최근 학습 세트"
          accessory={<CollectionLayoutToggle />}
          onPress={() => nav.go({ type: 'all-sets' })}
        />
        <View style={collectionGrid.wrapStyle}>
          {recentSets.slice(0, 3).map((cardSet) => (
            <View key={cardSet.id} style={collectionGrid.itemStyle}>
              <SetTile set={cardSet} nav={nav} />
            </View>
          ))}
        </View>
        {!recentSets.length && (
          <View style={[s.box, { gap: 12 }]}>
            <View style={s.row}>
              <View
                style={[
                  styles.sampleSetIcon,
                  { backgroundColor: colors.infoBg },
                ]}
              >
                <Icon name="book" color={colors.info} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.h2}>처음이라면 가볍게</Text>
                <Text style={s.muted}>여행 영어 6장으로 사용법 익히기</Text>
              </View>
            </View>
            <Button
              title="샘플 세트로 시작하기"
              tone="secondary"
              busy={isCreatingSampleSet}
              onPress={handleCreateSampleSet}
            />
          </View>
        )}
      </View>
      <View style={{ gap: 10 }}>
        <DashboardSection
          title="주제별로 모아두기"
          action="폴더 만들기"
          onPress={onNewFolder}
        />
        {folders.length ? (
          <View style={collectionGrid.wrapStyle}>
            {folders.slice(0, 6).map((folder) => (
              <Pressable
                key={folder.id}
                accessibilityRole="button"
                onPress={() => nav.go({ type: 'folder', folderId: folder.id })}
                style={collectionGrid.itemStyle}
              >
                {({ pressed }) => (
                  <CollectionSurface pressed={pressed} kind="folder">
                    <View
                      style={{
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: 10,
                      }}
                    >
                      <CollectionIcon kind="folder" size={32} />
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text
                          numberOfLines={2}
                          style={[s.text, { fontWeight: '700' }]}
                        >
                          {folder.title}
                        </Text>
                        <Text style={s.muted}>
                          세트{' '}
                          {sets.filter((cardSet) => cardSet.folderId === folder.id).length}
                          개
                        </Text>
                      </View>
                    </View>
                  </CollectionSurface>
                )}
              </Pressable>
            ))}
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={onNewFolder}
            style={[s.box, s.row, { gap: 10 }]}
          >
            <Icon name="folder" size={26} color={colors.warm} />
            <View style={{ flex: 1 }}>
              <Text style={[s.text, { fontWeight: '600' }]}>
                배우는 주제마다, 나만의 폴더
              </Text>
            </View>
            <Icon name="chevron" size={18} color={colors.icon} />
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    searchBar: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.input,
      paddingHorizontal: 14,
      minHeight: 44,
      borderRadius: radius.control,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    statsCard: {
      flexDirection: 'row',
      paddingVertical: 12,
      backgroundColor: colors.card,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statColumn: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
      paddingHorizontal: 5,
    },
    sampleSetIcon: {
      width: 36,
      height: 36,
      borderRadius: radius.control,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
