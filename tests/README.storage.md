# Storage 규칙 검증 및 적용

## 변경한 접근 정책

`cards/{uid}/{allPaths=**}`에서 Firebase Authentication의 `request.auth.uid`가 경로의 `uid`와 일치해야 한다.

| 작업 | 소유자 | 비로그인 / 다른 UID |
| --- | --- | --- |
| SDK 파일 읽기, 메타데이터 조회, 다운로드 URL 취득 | 허용 | 차단 |
| 자신의 UID 폴더 목록 조회 | 허용 | 차단 |
| 생성, 덮어쓰기, 메타데이터 변경 | 아래 이미지 조건 충족 시 허용 | 차단 |
| 삭제 | 이미지 형식/크기와 관계없이 허용 | 차단 |
| `cards` 전체 목록 및 규칙에 없는 경로 접근 | 차단 | 차단 |

생성·수정의 결과 객체는 **0바이트 초과, 5 MiB 이하(5,242,880바이트)**이며 Content-Type이 `image/webp`, `image/jpeg`, `image/jpg`, `image/png`, `image/gif` 중 하나여야 한다. SVG, HEIC, 임의 `image/*`, 일반 바이너리와 MIME 누락은 허용하지 않는다. 확장자가 아닌 Content-Type 메타데이터를 검사하므로 확장자 변경으로 조건을 우회할 수 없다. 삭제 규칙은 `request.resource`를 참조하지 않는다.

## 앱 호환성 검토

- 웹: `apps/web/src/services/storageService.ts`의 `uploadCardImage`는 UID가 없으면 업로드하지 않고 FileReader의 로컬 data URL을 반환한다. 로그인 시 기존 `cards/{uid}/{timestamp}_{random}.{extension}` 경로를 그대로 사용한다. 업로드 실패도 로컬 data URL로 보존한다.
- 웹 압축: `apps/web/src/utils/imageCompressor.ts`는 보통 1024px 너비의 WebP를 만든다. 원본 선택 제한 15 MiB와 서버 업로드 제한 5 MiB는 다른 기준이다. 압축 실패 시 원본을 돌려주므로, 원본이 5 MiB를 넘거나 SVG/HEIC 등 허용 목록에 없으면 서버 업로드가 거부되고 기존 로컬 폴백으로 저장된다. 기존 `maxSizeMB` 옵션은 실제 압축 결과 크기를 보장하지 않는다.
- 모바일: `apps/mobile/src/platform/images.ts`는 1600px 이하 JPEG를 만들고 base64 길이를 500,000자로 제한하므로 새 이미지의 실제 업로드 크기는 5 MiB보다 충분히 작다. 게스트는 data URL을 유지한다. `apps/mobile/src/platform/cloud.ts`는 현재 로그인 UID를 확인하고 기존 UID 경로로 업로드하며, 기존 PNG/JPEG/JPG/GIF/WebP data URL도 동기화한다. 기존 로컬 이미지가 5 MiB를 넘으면 향후 동기화는 거부될 수 있으며, 압축/재첨부가 필요하다.
- 업로드 및 게스트 저장 구현은 수정하지 않았다. 테스트에서 실제 업로드 진입점의 게스트 로컬 보존과 로그인 요청, 기존 모바일 클라우드 동기화를 검증한다.
- 기존 `cards/{uid}/...` 파일은 이동·이름 변경 없이 소유자가 계속 읽고 삭제할 수 있다. 기존 대용량/비허용 형식 파일도 읽기·삭제는 가능하지만, 메타데이터 수정에도 새로운 검증을 적용한다. 허용 형식/크기로 덮어쓰는 것은 가능하다.
- `cards/public/...`, `cards/{filename}` 등 UID 구조에 맞지 않는 과거 경로에 일반 계정이 SDK로 접근하는 것은 차단된다. 실제 운영 파일 목록은 조회하지 않았으므로 이런 파일의 존재 여부는 확인하지 않았다. 경로의 UID는 원래 작성자를 증명하지 않으므로, 과거 공개 쓰기 기간에 타인이 올린 파일의 진위를 소급해 보장하지 않는다.

## 다운로드 URL 및 검증의 한계

**토큰이 포함된 Firebase 다운로드 URL은 링크를 가진 사람에게 읽기 권한을 준다.** 이번 규칙으로 비소유자의 SDK 읽기 및 새로운 URL 조회는 차단되지만, 이미 발급되어 유출·공유된 URL의 직접 다운로드는 차단되지 않는다. 현재 앱은 URL을 카드/HTML에 저장해 이미지 표시와 동기화에 사용하므로 기존 URL 형식과 동작을 유지한다. Emulator 테스트에서도 인증 없는 토큰 URL 다운로드와 비로그인 SDK 읽기 차단을 함께 확인한다.

완전한 비공개 열람이 필요하면 별도 작업으로 저장 경로 기반의 인증된 SDK 다운로드(웹 `getBlob`/`getBytes` 등) 또는 인증 프록시로 렌더링 방식을 전환하고, 기존 토큰을 폐기·교체해야 한다. 토큰 폐기는 기존 카드/HTML의 URL을 깨뜨릴 수 있다. 앱이 지정하는 `public,max-age=31536000` 캐시 및 이미 내려받은 복사본도 규칙이나 토큰 폐기로 회수할 수 없다. 이번 작업에서는 토큰·파일·카드 데이터를 변경하지 않았다.

Content-Type은 클라이언트가 제공하는 메타데이터이므로 실제 이미지 시그니처/디코딩, 악성 콘텐츠 검사, 총 저장 용량·빈도 제한까지 보장하지 않는다. 테스트의 바이트 배열은 규칙의 메타데이터·크기 검증을 확인하기 위한 것이다. Admin SDK와 IAM 기반 접근에는 별도의 IAM 권한 관리가 필요하다.

공식 참고:

- [Storage 조건 및 메타데이터 검증](https://firebase.google.com/docs/storage/security/rules-conditions)
- [SDK를 통한 직접 다운로드](https://firebase.google.com/docs/storage/web/download-files#download_data_directly_from_the_sdk)
- [공유 가능한 토큰 다운로드 URL](https://firebase.google.com/docs/reference/android/com/google/firebase/storage/StorageReference#getDownloadUrl())
- [Emulator 기반 규칙 테스트](https://firebase.google.com/docs/rules/unit-tests)

## 테스트 실행

Node.js 24 이상 및 Java 21 이상을 PATH에 준비한다. pnpm 버전은 루트 `packageManager`를 따른다.

```sh
pnpm install --frozen-lockfile
pnpm test:storage
```

`test:storage`는 별도 `firebase.storage-test.json`으로 **Storage만** 시작하고 고정된 `demo-flash-cards-storage` 프로젝트를 사용한다. Firebase 로그인이나 실제 프로젝트 자격 증명이 필요하지 않다. 테스트는 localhost Emulator 환경 변수가 없으면 즉시 실패한다. 테스트별 데이터 초기화 및 규칙을 우회하는 기존 파일 시딩은 이 demo Emulator에만 적용된다. 포트 9199/4400/4500이 비어 있어야 한다. 첫 실행에는 Emulator 다운로드를 위한 네트워크가 필요하다.

Firebase CLI의 선택적 `re2` 네이티브 빌드는 `pnpm-workspace.yaml`의 `allowBuilds.re2: false`로 비활성화했다. 테스트에 필요한 Java 규칙 런타임과는 별개다.

검증 범위: 비로그인/타 계정의 읽기·목록·생성·덮어쓰기·메타데이터 수정·URL 조회·삭제 차단, 허용된 5종 MIME, 웹/모바일 resumable 업로드, 잘못된 MIME·MIME 누락, 정확한 크기 경계 및 0바이트, 수정 우회 차단, 소유자 삭제, 과거 비허용 파일 처리, 중첩/기존 공개 경로, 토큰 URL 한계, 웹/모바일 게스트 로컬 이미지 보존.

기존 모바일 클라우드 전송 테스트도 다음과 같이 실행할 수 있다.

```sh
node --test apps/mobile/tests/cloud.test.cjs
```

### 검증 결과 (2026-11-20)

- Node.js 24.16.0, Java 21.0.13, Firebase CLI 15.37.0, Storage Rules Runtime 1.1.3으로 실행했다.
- `pnpm test:storage`: **24/24 통과** (Emulator 규칙·URL 검증 19개, 실제 클라이언트 진입점 회귀 검사 5개).
- `node --test apps/mobile/tests/cloud.test.cjs`: **3/3 통과** (기존 계정 전송·로컬 이미지 동기화·기존 URL 정규화).
- `git diff --check` 통과. 기존 앱/공유 패키지의 lockfile importer는 변경하지 않았다. 앱 전체 빌드나 네이티브 기기 UI 테스트는 실행하지 않았다.
- `cards` 전체 목록을 차단하는 음성 테스트에서 Emulator가 경로 UID의 null 평가 경고를 출력했지만, 요청은 의도대로 `storage/unauthorized`로 거부되었다. 모든 허용/차단 assertion 및 테스트 프로세스 종료 코드는 정상이다.

## 실제 적용 절차 (이번 작업에서는 실행하지 않음)

1. 위 Emulator 테스트를 통과시킨다.
2. 운영 Firebase 프로젝트 ID와 `firebase.json`의 `storage.rules` 연결을 확인한다. 기존 경로/토큰 URL 한계를 검토한다.
3. 승인된 운영 계정으로 Firebase CLI에 로그인한 다음, 프로젝트 ID를 명시하여 **Storage 규칙만** 배포한다.

```sh
pnpm exec firebase login
pnpm exec firebase deploy --only storage --project <운영_프로젝트_ID> --config firebase.json
```

4. 배포 후 소유자 계정의 이미지 업로드/표시와 비로그인·타 계정 SDK 접근 차단을 확인한다. 저장된 토큰 URL은 위 설명처럼 계속 열릴 수 있다.

이 배포 명령은 규칙만 적용하며 기존 파일이나 다운로드 토큰을 변경하지 않는다. 다른 Firebase 서비스 배포나 운영 데이터 마이그레이션은 포함하지 않는다.
