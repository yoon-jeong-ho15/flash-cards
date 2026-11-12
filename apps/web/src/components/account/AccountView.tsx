import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowDownToLine, ArrowRight, RefreshCw, UserRound } from 'lucide-react';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import { downloadLearningData } from '../../services/learningDataExport';
import { viewUrl } from '../../routing';
import { ProgressBar } from '../common/ProgressBar';
import { Button, buttonVariants } from '../ui/button';
import { Card } from '../ui/card';

const syncLabels = {
  synced: '동기화 완료',
  syncing: '자료를 동기화하고 있어요',
  offline: '동기화 연결 대기 중',
  error: '동기화를 완료하지 못했어요',
};

export function AccountView() {
  const user = useFlashcardStore((state) => state.user);
  const login = useFlashcardStore((state) => state.loginWithGoogle);
  const logout = useFlashcardStore((state) => state.logout);
  const decks = useFlashcardStore((state) => state.decks);
  const folders = useFlashcardStore((state) => state.folders);
  const cards = useFlashcardStore((state) => state.cards);
  const syncStatus = useFlashcardStore((state) => state.syncStatus);
  const lastSyncedAt = useFlashcardStore((state) => state.lastSyncedAt);
  const pendingSync = useFlashcardStore((state) => state.pendingSync);
  const sync = useFlashcardStore((state) => state.initCloudSync);
  const [isPending, setIsPending] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'started' | 'error'>('idle');
  const learned = useMemo(() => cards.filter((card) => card.learned).length, [cards]);
  const progress = cards.length ? Math.round((learned / cards.length) * 100) : 0;
  const pendingCount = Object.values(pendingSync).reduce((sum, ids) => sum + ids.length, 0);

  const handleAccountAction = async () => {
    setIsPending(true);
    setLogoutError(false);
    try {
      await (user ? logout() : login());
    } catch {
      // Login errors are displayed by Navbar.
      if (user) setLogoutError(true);
    } finally {
      setIsPending(false);
    }
  };

  const handleExport = () => {
    try {
      downloadLearningData(useFlashcardStore.getState());
      setExportStatus('started');
    } catch {
      setExportStatus('error');
    }
  };

  return (
    <div className="page-container">
      <div className="mx-auto max-w-4xl space-y-8">
        <h1 className="page-title">마이페이지</h1>

        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-5 p-5 sm:p-6">
            <div className="flex min-w-0 items-center gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-secondary text-primary">
                <UserRound aria-hidden="true" className="h-7 w-7" />
              </span>
              <div className="min-w-0 space-y-1">
                <h2 className="break-words text-lg font-semibold">
                  {user ? user.displayName || '내 계정' : '게스트로 학습 중'}
                </h2>
                <p className="break-words text-sm text-muted-foreground">
                  {user ? user.email || 'Google 계정으로 로그인됨' : '학습 자료는 이 브라우저에 저장돼요.'}
                </p>
              </div>
            </div>
            <Button variant={user ? 'outline' : 'default'} isLoading={isPending} onClick={handleAccountAction}>
              {user ? '로그아웃' : 'Google로 로그인'}
            </Button>
            {logoutError && (
              <p role="alert" className="w-full text-sm text-destructive">
                로그아웃하지 못했어요. 다시 시도해 주세요.
              </p>
            )}
          </div>

          <section aria-labelledby="learning-summary" className="space-y-5 border-t border-border p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="learning-summary" className="text-sm font-semibold">나의 학습 현황</h2>
              <div className="flex gap-4 text-xs font-medium text-primary">
                <Link to={viewUrl({ type: 'all-decks' })} className="py-2 hover:underline">학습 세트 보기</Link>
                <Link to={viewUrl({ type: 'all-folders' })} className="py-2 hover:underline">폴더 보기</Link>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-5 sm:grid-cols-4">
              {([
                ['학습 세트', decks.length], ['폴더', folders.length],
                ['전체 카드', cards.length], ['기억한 카드', learned],
              ] as const).map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-2 text-2xl font-bold tabular-nums">{value.toLocaleString('ko-KR')}</dd>
                </div>
              ))}
            </dl>
            <div className="space-y-2">
              <div className="flex justify-between gap-3 text-xs">
                <span className="text-muted-foreground">전체 카드 학습률</span>
                <span className="font-semibold tabular-nums text-primary">{progress}%</span>
              </div>
              <ProgressBar value={progress} size="md" />
              <p className="text-xs leading-5 text-muted-foreground">
                {cards.length
                  ? `기억한 카드 ${learned.toLocaleString('ko-KR')}장 · 남은 카드 ${(cards.length - learned).toLocaleString('ko-KR')}장`
                  : '첫 학습 세트를 만들고 학습을 시작해 보세요.'}
              </p>
            </div>
            {!decks.length && (
              <Link to={viewUrl({ type: 'edit-deck' })} className={buttonVariants({ size: 'sm' })}>
                새 학습 세트 만들기 <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            )}
          </section>
        </Card>

        <section aria-labelledby="account-data" className="space-y-3">
          <h2 id="account-data" className="text-base font-semibold">데이터 관리</h2>
          <Card className="divide-y divide-border">
            <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
              <div className="min-w-0 space-y-2">
                <h3 className="text-sm font-medium">저장 및 동기화</h3>
                <p role="status" className="text-xs text-muted-foreground">{user ? syncLabels[syncStatus] : '이 브라우저에 저장 중'}</p>
                {user ? (
                  <>
                    <p className="text-xs text-muted-foreground">동기화 대기 중인 변경 {pendingCount.toLocaleString('ko-KR')}건</p>
                    <p className="text-xs leading-5 text-muted-foreground">
                      {lastSyncedAt ? `최근 동기화 · ${new Date(lastSyncedAt).toLocaleString('ko-KR')}` : '아직 동기화 기록이 없어요.'}
                    </p>
                    {syncStatus === 'error' && <p role="alert" className="text-sm text-destructive">인터넷 연결을 확인한 뒤 다시 시도해 주세요.</p>}
                  </>
                ) : (
                  <p className="max-w-md text-xs leading-5 text-muted-foreground">Google로 로그인하면 계정에 저장한 자료를 다른 기기에서도 볼 수 있어요. 게스트 자료는 이 브라우저에 보관돼요.</p>
                )}
              </div>
              {user && (
                <Button variant="outline" size="sm" isLoading={syncStatus === 'syncing'} onClick={() => void sync()} leftIcon={<RefreshCw aria-hidden="true" className="h-4 w-4" />}>
                  {syncStatus === 'error' ? '동기화 다시 시도' : '지금 동기화'}
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
              <div className="min-w-0 space-y-1">
                <h3 className="text-sm font-medium">학습 자료 내보내기</h3>
                <p className="max-w-md text-xs leading-5 text-muted-foreground">현재 자료의 폴더, 세트, 카드 내용과 학습 상태를 JSON 파일로 저장해요. 이미지는 원본 링크가 포함돼요.</p>
                {exportStatus === 'started' && <p role="status" className="text-xs text-primary">자료 파일 다운로드를 시작했어요.</p>}
                {exportStatus === 'error' && <p role="alert" className="text-xs text-destructive">파일을 만들지 못했어요. 다시 시도해 주세요.</p>}
              </div>
              <Button variant="outline" size="sm" onClick={handleExport} leftIcon={<ArrowDownToLine aria-hidden="true" className="h-4 w-4" />}>
                자료 내려받기
              </Button>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
