# Flashcards 모바일 앱

웹앱의 기능과 `@flashcards/types` 데이터 모델을 기준으로 새로 작성한 Expo / React Native iOS·Android 앱입니다. 웹 페이지를 감싸지 않으며, 서식 편집·표시만 앱에 번들된 Tiptap WebView를 사용합니다. 편집기는 외부 CDN이나 웹 서버 없이 동작합니다.

## 실행

저장소 루트에서 Node.js와 pnpm을 사용합니다.

```sh
pnpm install
cp apps/mobile/.env.example apps/mobile/.env
# .env를 실제 Firebase / Google OAuth 값으로 수정
pnpm --filter @flashcards/mobile ios
# 또는
pnpm --filter @flashcards/mobile android
```

`ios` / `android`는 편집기를 빌드하고 네이티브 개발 앱을 빌드·설치합니다. iOS는 Xcode, Android는 Android SDK 및 에뮬레이터 또는 연결된 기기가 필요합니다. 이미 설치한 개발 앱은 루트의 `pnpm dev:mobile`로 시작할 수 있습니다. Google 로그인은 네이티브 모듈이 필요하므로 **개발 빌드**에서 사용해야 합니다. Expo Go에서는 로그인 기능을 사용할 수 없습니다. Firebase 환경 변수가 없으면 게스트 모드로 기기 저장·편집·학습을 사용할 수 있습니다.

Android 실행 스크립트가 기본 SDK 경로와 설치된 JDK 17 또는 21을 자동으로 찾습니다. Gradle이 내려받은 JDK 캐시도 검색합니다. 최신 Android Studio에 포함된 Java 25는 이 프로젝트의 Prefab/CMake 빌드에서 오류가 발생하므로 JDK 17을 우선 사용합니다. 휴대폰에서 개발자 옵션의 USB 디버깅을 켜고 USB로 연결한 뒤, 휴대폰의 인증 창을 허용하고 다음 명령으로 기기를 선택합니다.

```sh
pnpm --filter @flashcards/mobile android --device
```

다른 경로에 설치한 경우 `JAVA_HOME`, `ANDROID_HOME`을 지정합니다. `android/`, `ios/`는 Expo가 생성하는 로컬 빌드 디렉터리로 Git에서 제외합니다.

## Firebase / 로그인 설정

웹과 같은 Firebase 프로젝트를 사용하고 `.env`의 `EXPO_PUBLIC_FIREBASE_*` 값을 설정합니다. 공개 클라이언트 구성 값만 포함하며 서비스 계정 키나 OAuth client secret을 넣지 않습니다.

1. Firebase Authentication의 Google 로그인을 활성화합니다.
2. Firebase에 `com.flashcards.app` iOS·Android 앱을 등록합니다. 식별자를 바꿀 경우 `app.json`과 Firebase 등록을 함께 수정합니다.
3. 각 설정 파일을 `GoogleService-Info.plist`, `google-services.json`에 배치합니다. 저장소에 이미 있는 파일을 사용할 경우 환경 변수의 프로젝트와 일치하는지 확인합니다.
4. `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`는 같은 프로젝트의 **웹 유형** OAuth 클라이언트 ID로 설정합니다. iOS ID는 plist에서 읽거나 `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`에 지정합니다.
5. Android 개발·배포 서명의 SHA-1 / SHA-256을 Firebase에 등록하고 설정 파일을 다시 받습니다.
6. 루트의 Firestore·Storage 규칙을 해당 프로젝트에 배포합니다. 코드에서 배포는 수행하지 않습니다.

로그인 구성은 [Google Sign-In Expo 설정](https://react-native-google-signin.github.io/docs/setting-up/expo), 인증 영속성은 [Firebase Auth API](https://firebase.google.com/docs/reference/js/auth#getreactnativepersistence)를 따릅니다. 이미지 선택은 [Expo ImagePicker](https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/)를 사용합니다.

## Google 로그인에서 DEVELOPER_ERROR가 발생할 때

이 오류는 설치된 앱과 Google 서버의 Android 인증 설정이 일치하지 않을 때 발생합니다. 프로젝트 설정 → 내 앱 → Android `com.flashcards.app`의 **SHA 인증서 지문**에 실제 설치한 APK의 SHA-1을 등록합니다. `webClientId`는 같은 프로젝트의 웹 유형 OAuth 클라이언트 ID여야 합니다.

2026-10-28 로컬 개발 빌드에서 Android 앱의 SHA 목록이 비어 있어 오류가 발생했고, 해당 APK의 개발용 SHA-1 등록 후 휴대폰 로그인이 정상 동작하는 것을 확인했습니다. 배포용 서명이나 Google Play 서명을 사용하면 해당 서명의 SHA-1도 별도로 등록해야 합니다. 서명이 바뀌지 않은 개발 빌드는 기존 등록을 그대로 사용합니다.

인증 설정을 변경하면 Firebase에서 최신 `google-services.json`을 다운로드해 이 디렉터리에 반영합니다. 자세한 확인 항목은 [Google Sign-In 문제 해결](https://react-native-google-signin.github.io/docs/troubleshooting)과 [Firebase Android Google 로그인 설정](https://firebase.google.com/docs/auth/android/google-signin)을 참고합니다.

## 웹 기능 대응

| 웹 기능 | 모바일 구현 |
| --- | --- |
| 홈·학습 통계·이어서 학습·최근 덱 | 홈 탭, 계정별 마지막 학습 덱 저장 |
| 폴더 생성·수정·삭제·검색·정렬 | 폴더 탭 및 폴더 상세. 폴더 삭제 시 덱은 미분류로 이동 |
| 덱 생성·수정·삭제·폴더 이동 | 덱 상세 및 덱 편집 |
| 전체/미분류·학습 상태 필터·이름/날짜 정렬 | 덱 목록. 정렬 설정은 계정별로 기기에 저장 |
| 전체 검색 | 검색 탭에서 폴더·덱·카드 앞뒤의 표시 텍스트 검색 |
| 카드 미리 보기·검색·완료 상태 필터 | 덱 상세. HTML 태그·이미지 URL은 검색하지 않음 |
| 서식 편집 | 굵게·기울임·밑줄·취소선·형광펜·목록·제목·코드·인용·실행 취소/다시 실행 |
| 앞뒤 이미지·본문 이미지·확대 | 사진 보관함·카메라, 압축·첨부 제거, 이미지 확대 화면 |
| 카드 목차·추가·삽입·복제·순서 변경·삭제 | 편집기의 가로 목차, 선택 카드 편집. 순서는 위/아래 버튼으로 변경 |
| 임시 저장·복원·원본 변경 감지 | 계정·덱·새 덱의 대상 폴더별 임시 저장, 복원/버리기, 원본 변경 시 불러오기/덮어쓰기 선택 |
| 순차·셔플 학습·카드 뒤집기 | 학습 화면과 좌우 스와이프, 큰 터치 버튼 |
| 알아요 토글·이전/다음·미학습/전체 재학습 | 학습 회차·완료 결과·진행도 초기화 포함 |
| 학습 중 수정·삭제 | 학습 세션을 유지하는 카드 편집 창 |
| Google 로그인·로그아웃·클라우드 동기화 | 네이티브 Google 로그인 + Firebase Auth / Firestore / Storage |
| 오프라인 저장·동기화 재시도·계정 분리 | AsyncStorage의 원자적 데이터+outbox 저장. 네트워크 복구·앱 복귀·수동 재시도 |

웹의 키보드 단축키는 모바일 터치 버튼·스와이프로, 데스크톱 사이드바는 하단 탭으로 대응합니다. 파일 다운로드·가져오기 등 웹에 없는 기능은 추가하지 않았습니다.

## 저장 및 동기화

`flashcard_folders`, `flashcard_decks`, `flashcard_cards` 컬렉션과 카드 HTML·이미지·진행도 필드는 웹과 동일합니다. 로그인 계정과 게스트의 기기 자료는 분리하며 자동 병합하지 않습니다. 로그아웃 후에도 해당 계정의 대기 작업과 임시 저장본은 기기에 남습니다.

모든 자료 변경은 로컬 데이터와 outbox를 하나의 AsyncStorage 값으로 먼저 기록한 뒤 UI에 반영합니다. 네트워크 동기화는 변경·삭제 항목만 보내며 400개씩 처리합니다. 전송 도중의 새 수정은 revision을 비교하여 보존하고, 읽기 도중 로컬 변경이 생기면 클라우드 응답을 버리고 다시 동기화합니다. 계정 변경 시 이전 계정의 응답을 새 계정에 적용하지 않습니다. 서로 다른 기기에서 동일 항목을 동시에 수정한 경우 마지막 서버 쓰기가 적용됩니다. 임시 저장본은 기기 전용이며 클라우드로 전송하지 않습니다.

사진은 최대 1600px JPEG로 압축하며 원본 15MB, 압축 후 base64 500,000자 제한을 적용합니다. 오프라인 사진은 data URL로 보존하고 이후 Firebase Storage에 업로드한 URL을 Firestore에 기록합니다. 하나의 카드에 이미지가 많으면 기기 저장 공간을 많이 사용할 수 있습니다. 공유 이미지 삭제로 다른 카드가 깨지는 것을 막기 위해 첨부 제거 시 원격 파일을 영구 삭제하지 않습니다.

## 검증 및 배포 빌드

```sh
pnpm --filter @flashcards/mobile build:editor
pnpm --filter @flashcards/mobile typecheck
pnpm --filter @flashcards/mobile test
pnpm --filter @flashcards/mobile export:check
```

`export:check`는 iOS·Android JavaScript 번들과 에셋의 Metro 빌드를 검증하며 서명된 네이티브 바이너리를 생성하지 않습니다. EAS CLI를 사용하는 경우 `eas.json`의 development / preview / production 프로필로 별도 빌드합니다. 실제 Google 로그인, 카메라 권한, 네이티브 키보드와 WebView 편집 상호작용은 실제 기기 또는 시뮬레이터에서 확인해야 합니다.

코드 구성: `src/core`는 프레임워크 독립 저장·검색·학습 로직, `src/platform`은 Firebase·기기 API, `src/ui`는 화면, `editor`는 브라우저 편집기 원본입니다. `src/editor/document.generated.ts`는 `build:editor`로 재생성하며 함께 커밋합니다.
