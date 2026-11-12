import { useState } from 'react';
import { UserRound } from 'lucide-react';
import { useFlashcardStore } from '../../store/useFlashcardStore';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

export function AccountView() {
  const user = useFlashcardStore((state) => state.user);
  const login = useFlashcardStore((state) => state.loginWithGoogle);
  const logout = useFlashcardStore((state) => state.logout);
  const [isPending, setIsPending] = useState(false);
  const [logoutError, setLogoutError] = useState(false);

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

  return (
    <div className="page-container space-y-6">
      <h1 className="page-title">마이페이지</h1>
      <Card className="max-w-xl space-y-4 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
            <UserRound aria-hidden="true" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="break-words font-semibold">
              {user ? user.displayName || '내 계정' : '게스트'}
            </h2>
            <p className="break-words text-sm text-muted-foreground">
              {user ? user.email || '로그인됨' : '학습 자료는 이 브라우저에 저장돼요.'}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant={user ? 'outline' : 'default'}
          isLoading={isPending}
          onClick={handleAccountAction}
        >
          {user ? '로그아웃' : 'Google로 로그인'}
        </Button>
        {logoutError && (
          <p role="alert" className="text-sm text-destructive">
            로그아웃하지 못했어요. 다시 시도해 주세요.
          </p>
        )}
      </Card>
    </div>
  );
}
