# Flashcards 웹앱

모바일 앱과 같은 보라색 테마를 사용하는 React / Vite 학습 앱입니다. 기존 계정별 로컬 저장, Firebase 동기화, 서식과 이미지, 폴더·세트 데이터 구조를 유지합니다.

저장소 루트에서 실행합니다.

```sh
pnpm dev:web
```

## 주요 사용 흐름

- 홈에서 최근 세트를 이어서 학습하고 전체 학습 현황을 확인합니다. 자료가 없으면 여행 영어 6장의 샘플 세트를 직접 추가해 체험할 수 있습니다.
- 라이브러리에서 학습 세트 / 폴더를 전환합니다. 세트 제목·설명·카드 내용 검색, 학습 상태·미분류 필터, 정렬, 격자 / 목록 보기를 제공합니다. 보기 방식은 브라우저에 저장합니다.
- 상단 검색은 `⌘ K` / `Ctrl K`로 엽니다. 위아래 방향키로 결과를 선택하고 Enter로 엽니다. 일치하는 카드의 본문도 결과에 표시합니다.
- 세트 상세에서 차례대로 / 랜덤 학습을 고릅니다. 기억한 카드 표시, 카드 검색과 편집, 폴더 이동, 진행도 초기화, 삭제를 지원합니다.
- 학습 중 ‘알아요’는 다음 카드로 넘어가지 않고 해당 카드에 ‘알아요’ 표기를 반영(토글)하며, ‘다시 볼게요’는 상태를 저장한 뒤 다음 카드로 이동합니다. 좌우 드래그 또는 방향키로도 이동합니다.
- 학습 종료 화면에는 해당 회차의 기억한 카드와 다시 볼 카드를 표시합니다. 미학습 카드 / 전체 카드 복습과 마지막 카드 재확인을 선택할 수 있습니다. 모두 익힌 세트는 바로 전체 복습을 시작합니다.
- 편집 중에는 전체 탐색을 숨겨 작성에 집중합니다. 데스크톱은 카드 목차, 작은 화면은 가로 번호 목차를 사용합니다. 저장 버튼은 상단과 하단에 고정합니다. 닫을 때 임시 저장 후 나가기 / 변경 버리기 / 계속 작성을 고를 수 있고, 임시 저장에 실패하면 화면을 닫지 않습니다.
- 좁은 화면에서는 홈 / 라이브러리 / 폴더 / 만들기를 하단 탐색에서 엽니다. 학습과 편집에서는 해당 작업에 집중하도록 탐색을 숨깁니다.

## 학습 단축키

| 키               | 동작                                          |
| ---------------- | --------------------------------------------- |
| Space 또는 ↑ / ↓ | 카드 뒤집기                                   |
| ← / →            | 이전 / 다음 카드                              |
| 1 / 2            | 다시 볼게요 / 알아요로 저장 후 이동           |
| Enter            | 기억한 상태만 변경                            |
| E                | 현재 카드 편집                                |
| Esc              | 학습 종료, 결과 화면에서는 마지막 카드로 복귀 |

입력란·IME 조합 중에는 학습 단축키가 동작하지 않으며 버튼의 기본 Enter / Space 동작을 유지합니다.

## 코드 검증

```sh
pnpm --filter @flashcards/web typecheck
pnpm --filter @flashcards/web test
pnpm --filter @flashcards/web build
```

## URL routing

The web app uses React Router's browser history. `src/routing.ts` maps URLs to
existing screen props; the URL is the only source of navigation state.

- `/`: dashboard
- `/folders`, `/folders/:folderId`, `/folders/:folderId/study`
- `/decks`, `/decks/:deckId`
- `/decks/new?folderId=...`: create a deck, optionally inside a folder
- `/decks/:deckId/edit?cardId=...`: edit a deck and optionally focus a card
- `/decks/:deckId/study?shuffle=1&onlyDifficult=1`: study options

Direct links wait for authentication restoration and the account's initial sync
attempt before mounting a screen. Account changes preserve the URL, reload the
account's data, and remount the screen. Missing resources show an account/login
hint; failed or offline reads without cached data offer retry without redirecting.
Cached data remains usable offline. Unknown paths show a not-found screen.
Study URLs preserve options, not the current card or shuffled session order.

Vercel and Firebase Hosting configurations both serve `index.html` for application
paths, so opening a nested URL or refreshing it works after deployment. Other
hosting providers need the same SPA fallback.

## 여러 탭의 계정 저장과 동기화

계정별 `flashcards_account_v1:{guest|user:uid}:data` Web Lock 안에서 최신
localStorage 값을 읽고 변경 함수를 적용합니다. 데이터, 대기 목록, 작업별 버전을
하나의 localStorage 항목에 원자적으로 기록한 다음 잠금 안에서 UI에 게시합니다.
저장 실패는 Promise rejection과 화면 오류로 전달하며, 저장되지 않은 데이터로
이동하거나 입력·초안을 지우지 않습니다. 원시 스냅샷 쓰기는 외부에 공개하지 않습니다.

모든 변경 액션은 비동기입니다. 생성 액션은 `Promise<string>`, 나머지 변경 액션은
`Promise<void>`를 반환합니다. 호출부는 성공을 기다린 뒤 이동·모달 닫기·학습 진행을
처리하고 실패를 잡아 입력을 유지해야 합니다. 네트워크 업로드 완료까지 기다리는
계약은 아니며, 로컬 데이터와 대기 목록의 저장 완료를 의미합니다.

같은 계정의 클라우드 작업은 별도 `:sync` Web Lock을 요청부터 응답·완료 처리까지
유지합니다. 네트워크 대기 중에도 `:data` 잠금으로 로컬 편집을 저장할 수 있습니다.
전송할 스냅샷은 디스크에서 읽으며, 완료 처리는 다시 읽은 최신 대기 목록에서
ID와 작업 버전이 모두 일치하는 항목만 제거합니다. 다운로드 중 로컬 리비전이
바뀌면 응답을 버리고 대기 작업을 전송한 뒤 다시 읽습니다. 잠금 순서는 항상
`:sync` → 짧은 `:data`이며 데이터 저장 경로는 네트워크 잠금을 기다리지 않습니다.

`storage`, `pageshow`, 탭 재표시 시 현재 계정을 다시 읽습니다. 알림에 포함된 과거
스냅샷을 쓰지 않습니다. 변경되지 않은 객체는 재사용하며 편집기의 입력 버퍼와
외부 변경 안내를 유지합니다. 덱 전체 저장도 편집 시작 시 원본을 기준으로 바뀐
필드와 카드만 적용하므로 다른 탭의 카드 추가·관계없는 수정이 남습니다.
삭제된 덱과 수정 중 삭제된 카드는 저장을 거절하고 입력을 유지합니다.

계정 변경은 세션 번호로 대기 중인 변경과 이전 계정의 응답을 무효화합니다.
기존 계정의 디스크 데이터·대기 목록은 그대로 남고 로그아웃에는 쓰기가 필요 없습니다.
오프라인 저장도 같은 잠금을 사용하고 복구 시 대기 목록을 전송합니다. 탭 종료 시
브라우저가 잠금을 해제합니다. 저장 완료 전에 닫힌 탭의 변경은 완료로 취급하지
않으며, 편집기의 기존 초안 보존 동작을 사용합니다. 업로드 후 완료 기록 전에 닫힌
경우 작업이 다시 전송될 수 있으므로 클라우드 전송은 멱등적인 set/delete입니다.

Web Locks가 없거나 사용할 수 없으면 기존 데이터 읽기만 허용합니다. 저장과
클라우드 동기화는 오류로 차단하고 화면에 안내하며, 잠금 없는 쓰기로 대체하지
않습니다. HTTPS 또는 신뢰할 수 있는 localhost와 Web Locks 지원 브라우저가 필요합니다.

범위와 한계:

- 잠금은 같은 origin·브라우저 저장소를 공유하는 이 구현의 탭에 적용됩니다. 이전
  버전의 열린 탭, 다른 기기, 잠금을 사용하지 않는 작성자는 포함되지 않습니다.
  배포 후 기존 탭도 새로고침해야 합니다.
- 같은 필드를 두 탭이 의도적으로 수정하면 마지막으로 직렬 저장한 수정이 적용됩니다.
  텍스트 편집을 자동 병합하는 CRDT나 서버의 다중 기기 충돌 해결은 제공하지 않습니다.
- 클라우드는 로컬 저장과 하나의 분산 트랜잭션이 아닙니다. 탭 종료 직전 전송의 서버
  처리 여부는 확정할 수 없어 재전송할 수 있습니다. 서버 측 fencing/CAS는 추가하지
  않았으므로 종료 직전 요청이나 다른 기기의 서버 쓰기까지 전역 순서를 보장하지 않습니다.
- 응답하지 않는 네트워크 작업은 동기화 잠금을 유지할 수 있습니다. 로컬 저장은 계속
  가능하며 해당 탭 종료 시 잠금이 풀립니다. 기존 초안 저장 키는 계정·덱별로 공유됩니다.
- 실제 브라우저 검증은 로컬 저장과 UI를 대상으로 합니다. 클라우드 충돌·실패는
  서비스 모형을 사용한 두 독립 저장소 인스턴스 테스트로 검증합니다.

저장소 루트에서 회귀 검증:

```sh
node --test apps/web/tests/*.test.cjs
node node_modules/typescript/bin/tsc --noEmit -p apps/web/tsconfig.json
node --test apps/web/tests/browser/multitab.cjs
```

브라우저 테스트는 임시 Chrome 프로필과 로컬 Vite 서버를 생성하고 종료 후 삭제합니다.
Chrome/Chromium 경로를 자동으로 찾지 못하면 건너뛰므로 `CHROME_PATH`를 지정합니다.
별도 브라우저 자동화 패키지는 필요하지 않으며 Node 22 이상을 사용합니다.
실제 두 페이지의 저장 경쟁, 동일 덱의 카드 추가, 삭제와 수정, 외부 변경 시 입력
유지, 저장 실패 시 입력 유지, 탭 종료 시 잠금 해제와 새 페이지 재로딩을 확인합니다.
