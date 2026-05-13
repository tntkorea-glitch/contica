---
name: Project Status
description: contica 프로젝트 현재 진행 상태 및 다음 작업
type: project
originSessionId: 33481d0a-b320-4a07-b26a-abea00ed8c67
---
네이버주소록 클론 프로젝트 - 다중 기기 연락처 실시간 동기화 앱

## 완료된 작업 (2026-04-14)
- Next.js + TypeScript + Tailwind 프로젝트 셋업
- Supabase 스키마 설계 + migration SQL 실행 완료
- .env.local 설정 (anon key + service_role key)
- API 라우트: 연락처 CRUD, 그룹 CRUD, 중복/유사 감지, 병합, import/export
- **네이버 주소록 xlsx import** 구현 (14,193건 import 테스트 성공)
- 메인 UI: 사이드바(리사이즈 가능), 연락처 목록(초성 그룹화), 상세보기, 추가/수정 폼
- **사이드바 리사이즈** — 드래그로 좌우 크기 조절 (180~500px)
- **휴지통** — soft delete 연락처 목록 + 30일 안내 배너
- **이름없는 연락처** — 이름 없는 연락처 필터링
- **중복 + 유사 연락처 정리** — 정확 일치 + 퍼지 매칭 (전화번호 끝8자리, 이름 부분일치, 이메일)
- **CSV/XLSX/vCard 내보내기** — 파일형식/항목/그룹 선택 가능
- **환경설정 모달** — 정렬기준, 노출개수, 그룹관리, 연락처복원, 프라이버시 탭
- 인증 bypass 적용 중 (테스트용, TODO: 나중에 복원)
- 빌드 성공 + GitHub 푸시 완료
- **xlsx import 중복검사 추가 (2026-04-14)** — preview/save 2단계, 매칭 기준=전화번호 끝8자리 + 이메일, 중복 제외 토글 + 비교 테이블 UI
- **인증 복원 완료 (2026-04-14)** — Supabase Auth 진짜 동작, AuthGuard 로그인 필요
- **구글 로그인 추가 (2026-04-14)** — Supabase native OAuth (NextAuth X). /auth/callback 페이지, signInWithGoogle, 카카오/네이버는 "준비중" alert
- **RLS 적용 완료 (2026-04-14)** — contacts/groups/contact_groups 테이블에 auth.uid()::text = user_id 정책. supabase.ts 서버 환경에서는 service_role로 자동 분기
- **모바일 반응형 (2026-04-14)** — lg: 1024px 기준. 모바일에서 사이드바 drawer / 리스트↔디테일 스택 전환
- **본 계정 = 구글 계정** (85f67042-f584-493e-98d5-d695d27152e5). 이메일 계정은 삭제됨
- **포트 고정** = localhost:**3006** (package.json dev/start)
- **Vercel 배포 URL** = https://contica.vercel.app (2026-04-19 정리 완료. `contica.vercel.app`은 선점되지 않았음 — 과거 메모리 오기록. 구 `listica-contact`/`naver-contact` alias는 제거 또는 rename. 나중에 `contica.co.kr` 도메인 구매 예정)

## Supabase 설정 (2026-05-14 이관 완료)
- Organization: a01024425659-dev's Org (**Free Plan** — Pro→Free 이관 완료)
- Project URL: https://xrwvpfdxcjrgdvcaylgk.supabase.co
- Region: Northeast Asia (Seoul)
- 본 계정 새 UUID: **9f4d9870-0ff8-4af1-b33d-b5b21f32c2d7** (구: 85f67042-f584-493e-98d5-d695d27152e5)
- Vercel 배포 URL: **https://contica-995u.vercel.app**
- GitHub: https://github.com/a01024425659-dev/contica

## 구 Supabase (이관 전)
- Organization: milveus-glitch's Project (Pro Plan $25/월) — 이관 완료 후 삭제 예정
- Project URL: https://krnpicwujfkvbymtecsf.supabase.co

## 진행 (2026-04-19 늦밤) — 프로덕션 OAuth + 데이터 조회 완전 복구
- **Vercel 도메인 전환**: `naver-contact` → `contica.vercel.app` rename + Production 연결. `listica-contact`/`contica-contact` alias 전부 제거. 새 primary URL: **https://contica.vercel.app**
- **Supabase URL Config**: Site URL + Redirect URLs 모두 `contica.vercel.app/**`로 정렬
- **500 Invalid API key 이슈 해결**: Vercel env의 구 Supabase anon/service_role key를 최신 값으로 갱신. 원인은 Supabase Asymmetric JWT(ES256) 전환으로 구 HS256 API key가 invalidate. 상세: feedback_supabase_api_key_rotation.md
- **코드 수정** (commits 38a80a1, 8032da1, 1882ddf):
  - useAuth.getAccessToken: `state.session.access_token` 직접 참조 (race condition 해결)
  - useContacts: auth loading/session 대기 후 fetch (첫 렌더 401 회피)
  - api-auth.ts: `supabaseAdmin.auth.getUser()` → `fetch /auth/v1/user` REST 직접 호출 + 로컬 JWT decode 폴백
- **프로덕션 테스트 완료**: contica.vercel.app에서 Google 로그인 + 연락처 31,164건 정상 조회
- **모바일(contica-mobile) 실기기 동작 확인 완료** (2026-04-19 늦밤):
  - `lib/supabase.ts` SSR crash 수정 (Expo Router pre-render 단계에서 AsyncStorage `window` 참조 이슈 — `typeof window !== 'undefined'` 분기 추가)
  - Metro 기동 + Expo Go 실기기 접속 OK (http://192.168.0.30:8081)
  - Google 로그인 버튼은 404 — `.env`의 구(삭제된) 프로젝트 Client ID 때문. **우회책: 이메일/비번 로그인**
  - 본 계정 비번 SQL로 설정 (`update auth.users set encrypted_password = crypt(...)`) → Expo Go에서 이메일+비번 로그인 성공
  - **연락처 31,164건 조회 확인 + pull-to-refresh로 웹↔모바일 동기화 확인** (웹에서 추가 → 모바일 당겨서 반영, 개수가 31,165로 증가)
  - `app/(tabs)/index.tsx` 상단에 `{N}명의 연락처` 카운트 표시 추가 (웹의 사이드바 개수 표시 대체)
  - ⚠️ **모바일 UI는 MVP 수준** — 웹의 사이드바(필터/그룹/휴지통/즐겨찾기/이름없는 연락처) 미구현. 다음 세션에 Drawer Navigation으로 추가 예정 (1~2시간)

## 진행 (2026-04-19) — OAuth 재셋팅 + Vercel/Supabase 브랜드 정리 완료
- **Google Cloud**: 구 liketica/listica/contica 프로젝트 **전부 삭제** → 새 `contica` 프로젝트 단독 생성
  - OAuth consent screen External + Test user 등록
  - OAuth 2.0 Web Client `Contica Web` 신규 발급
    - JS origins: `http://localhost:3006`, `https://contica.vercel.app`
    - Redirect URI: `https://krnpicwujfkvbymtecsf.supabase.co/auth/v1/callback`
  - Client ID: `170510383236-dpi1hbihh8jv73ufcs2v9i1bgdm3i4af.apps.googleusercontent.com` (Secret은 메모리 미저장, Supabase에 직접 등록)
- **Vercel 도메인 정리**: `naver-contact.vercel.app` → `contica.vercel.app`로 rename + Connect to Production. `listica-contact.vercel.app`/`contica-contact.vercel.app` alias 정리(제거됨)
- **Supabase**: 프로젝트 이름 `listica` → `contica` 변경. Google Provider에 새 Client ID/Secret 등록 완료
- **구글 로그인 테스트 성공**: localhost:3006에서 본 계정(`85f67042-...`) 복원 확인. 전체 연락처 **31,164명** (메모리 이전 기록 14,193에서 증가)

## 진행 (2026-04-18) — listica → contica 전체 리네임
- **웹 리네임 완료** (`143c595` 푸시): package/UI 브랜드/Dexie DB 이름/메모리 파일 전부 listica→contica 치환
- **모바일 리네임 + 스캐폴딩 커밋** (`3906c54` 푸시): package/app.json(slug/bundleId/package)/types/login 리네임 + 이전 세션 미커밋 스캐폴딩(tabs, contexts/AuthContext, lib/supabase, app/login.tsx) 동시 커밋
- **메모리 파일명 변경**: `project_listica_mobile.md` → `project_contica_mobile.md`
- **배치 스크립트 작성**: `D:\dev\rename-to-contica.bat` (Claude 종료 후 사용자 실행)
- **SQL 헤더 주석 정리 + auto-commit** (`2a33fb3`): supabase-schema.sql / supabase-migration.sql 첫 줄 "네이버주소록 클론" → "contica"
- **GitHub repo 2개 rename 완료** (사용자 대시보드 작업): listica → contica, listica-mobile → contica-mobile
- **git remote URL 두 폴더 모두 업데이트**: contica.git / contica-mobile.git
- **웹 push 완료** (`2a33fb3` → origin/master on new repo)
- ⚠️ 아직 안 한 것 (사용자 수동):
  1. Claude 종료 후 `D:\dev\rename-to-contica.bat` 실행 — 폴더 2개 + 메모리 폴더 rename
  2. Vercel 대시보드에서 프로젝트 이름 변경 (contica-contact 또는 listica-contact → contica)
  3. 배치 실행 후 새 `D:\dev\contica` 폴더에서 Claude 열고 `/toto` 로 재개

## 진행 (2026-04-15 새 PC 이어서)
- 새 PC(`C:\Users\a0109`) 셋업 완료: npm install, vercel env pull, gitleaks pre-commit
- 웹 `npm run build` 성공 확인
- **contica-mobile Expo 프로젝트 스캐폴딩 완료** (`D:\dev\contica-mobile`)
  - Expo SDK 54 + blank-typescript + React Native 0.81
  - @supabase/supabase-js + AsyncStorage + react-native-url-polyfill
  - `src/lib/supabase.ts` — AsyncStorage 세션 저장
  - `src/lib/types.ts` — 웹 types.ts에서 Contact/Group 복제 (MVP용 축약본)
  - `src/screens/LoginScreen.tsx` — 이메일/비번 로그인·가입 (카카오/구글은 아직 없음)
  - `src/screens/ContactsScreen.tsx` — FlatList 리스트 + 검색 + pull-to-refresh
  - `App.tsx` — 세션 기반 Login/Contacts 스위칭
  - `.env` 는 `.gitignore` 처리 완료 (EXPO_PUBLIC_SUPABASE_URL/ANON_KEY)
  - `git init` 로컬 커밋 완료 (원격 repo 아직 안 만듦)
  - `npx tsc --noEmit` 통과

## 진행 (2026-04-20) — Realtime 구독 + 전화번호 포맷 + OAuth deleted_client 진단
- **모바일 Supabase Realtime 구독 추가** (`app/(tabs)/index.tsx`): `postgres_changes` `*` 이벤트로 contacts 테이블 구독 → 300ms 디바운스 후 `load({reset:true})` 자동 호출. 상단에 🟢 `실시간 · N` 뱃지 추가(이벤트 카운트 시각화). `alter publication supabase_realtime add table public.contacts`는 이미 반영돼 있어 skip. **실기기 테스트는 OAuth 이슈 때문에 보류.**
- **웹 연락처 폼 전화번호 자동 하이픈 포맷 추가** (`ContactForm.tsx`): 메모리 "이전에 추가했다"는 기록과 달리 실제로는 **구현된 적 없었음**(커밋 히스토리 검증). `formatKoreanPhone` 유틸을 phone/phone2 onChange에 연결. 010/02/15xx/031 패턴 자동 분기.
- **프로덕션 Google OAuth `deleted_client` 에러 진단**: 에러 URL의 `client_id=773222550757-j57q7seu6i932m7k833crdne1d86rui3...` 파라미터가 Google Cloud의 실제 값 `170510383236-dpi1hbihh8jv73ufcs2v9i1bgdm3i4af...`와 **완전히 다름**. **즉 Supabase Auth Providers의 Google Client ID에 구(삭제된) 값이 들어있음** — 사용자가 육안 확인 시 "다 맞음"이라 답했으나 실제 저장값 불일치. 다음 세션에 Supabase Auth Providers에서 ID/Secret 교체 필요.
- **모바일 Drawer 사이드바** — 메모리에 "추가했었다"는 기록이 있었으나 실제론 미구현 확인 (`app/(drawer)/` 없음, drawer import 없음). 다음 세션 우선순위.

## 진행 (2026-04-21) — Discover 스캔 에러 수정 + OAuth 복구 + APK 재빌드
- **phone-history 네이티브 모듈 버그 수정** (`f357702`): `getCallLog`/`getSmsLog`에서 `ContentResolver.query` sortOrder에 `"DATE DESC LIMIT N"` 형태로 LIMIT을 넣었던 것이 Android 11+(API 30)에서 `IllegalArgumentException: Invalid token LIMIT`로 거부됨. sortOrder는 `DATE DESC`만 남기고 cursor 루프에서 `results.size >= effectiveLimit` 조건으로 끊도록 변경.
- **dev client APK 재빌드 완료** — EAS development profile로 Android APK 빌드 (build ID `7e8406ab-dd69-4554-acd4-a3e397576cde`, fingerprint `53ccabf84cb31bf7e96b3f4a4d0deb47375a7664`, commit `f357702`). APK: https://expo.dev/artifacts/eas/gC7LuTurVMdyFJvTPY2KNw.apk. 폰에 설치 후 Discover 탭 스캔 실기기 테스트 필요.
- **Supabase Auth Google Client ID/Secret 교체 완료** — 구 `773222550757-...` (삭제된 Google OAuth 앱) → 신규 `170510383236-dpi1hbihh8jv73ufcs2v9i1bgdm3i4af...` + Google Cloud `Contica Web`에서 새로 발급한 Secret로 교체. `contica.vercel.app` 프로덕션 Google 로그인 `deleted_client` 에러 해소.
- **Discover 탭 기능 확장** — 010 휴대폰 번호 필터, 선택 체크박스 + 전체선택/해제, 행 탭 시 통화기록/문자 앱 native 오픈(tel:/sms:), lastSource 시각화, AsyncStorage 기반 스캔 히스토리(NEW/이전 스캔/이미 추가 배지 + 마지막 스캔 시각).
- **Phase 1 완료 — 메인/서브 계정 구조** (`2d26f97`):
  - `lib/constants.ts` MAIN_USER_ID(`85f67042-...`) 상수, isMainAccountId 헬퍼
  - AuthContext에 `isMainAccount` 파생값 노출
  - `phoneSync.ts` 개선: phoneDataMatches를 phoneKey 기반으로 (+82/phone2 슬롯 대응), per-field 업데이트 루프에 3가지 가드 (이름 충돌 시 새 row insert / 폰 빈 값 방어 / 이름 필드는 서버에 값 있으면 안 덮음)
  - `sync.tsx`: 서브 계정에서 양방향 버튼 숨김 + 노란 안내 카드
  - `usePhoneSyncBridge`: 서브 계정이면 포그라운드 자동 syncPhoneToApp skip, Realtime 구독은 메인 user_id 기준으로 전환
  - `discover.tsx`: 서브 계정의 Discover insert는 `user_id = MAIN_USER_ID`로 저장
- **Phase 2 완료 — Supabase RLS** (`supabase-sub-account-rls.sql`, 7fa3cd4 적용): `user_shares` 기반으로 서브 계정이 메인 id로 contacts/groups/contact_groups에 INSERT 허용. UPDATE/DELETE는 의도적 차단. Supabase SQL Editor로 실행 완료, `pg_policies` 3건 확인.
- **Phase 4 완료 — 웹 중복정리 알림/병합 UI** (커밋 묶음, auto-commit으로 푸시): `DuplicateAlert` 컴포넌트 신규 (헤더 아래 노란 배너, 메인 페이지 로드 시 `/api/v1/contacts/duplicates?mode=exact` 호출해 그룹 수 표시). 배너 클릭 시 `DuplicatesModal` autoStart=true로 자동 open. `DuplicatesModal` 확장: 각 그룹 row에 라디오(기준 primary) + 체크박스(병합 대상) + "선택 병합(N)" 버튼. "전체 병합" 기존 기능도 유지. `page.tsx`: `dupRefreshKey` state로 병합 성공 후 배너 카운트 자동 갱신. `next build` 통과.

## Next up when resuming
1. **Phase 3 — 서브 폰 삭제 감지 UI** (다음 세션) — 서브 계정에서 폰 연락처 삭제 시 알림 + 재확인 후 메인 서버 반영.
3. **📱 새 APK 설치 + Discover 탭 실기기 테스트** — https://expo.dev/artifacts/eas/gC7LuTurVMdyFJvTPY2KNw.apk. Discover 스캔 + 체크박스 선택 + 행 탭 → tel:/sms: 오픈 확인.
4. **모바일 Realtime 구독 실기기 테스트** — OAuth 복구됐으니 이제 가능. 🟢 `실시간` 뱃지 노출 + 웹에서 추가 시 0.3초 내 자동 반영 확인
5. **모바일 Drawer 사이드바 구현** (1~2시간) — `@react-navigation/drawer` 설치 + `app/(drawer)/` 재구성 + 필터(전체/즐겨찾기/휴지통/이름없는) + 그룹 리스트
4. **⚠️ Supabase Service Role key Reset** — 이전 세션 대화 로그에 평문 노출된 상태. 재발급 → Vercel env 업데이트 → 재배포
5. **⚠️ 본 계정 비밀번호 변경** — SQL로 임시 설정한 비밀번호가 대화 로그에 남을 수 있음
6. **Vercel Preview 환경 NEXT_PUBLIC_SUPABASE_ANON_KEY 추가** — CLI Preview 등록 실패 건, UI에서 수동 추가
7. **모바일 Google OAuth 재셋팅** — iOS/Android용 Client ID (번들 ID `com.tntkorea.conticamobile` + Android SHA-1)
8. **폰 기본 연락처 양방향 동기화** — expo-contacts + diff sync (사용자 우선 요구)
9. **연락처 추가/수정 폼 화면** (모바일)
10. **카카오/네이버 로그인** 실제 구현
11. **`contica.co.kr` 도메인 구매** → Vercel 커스텀 도메인 + OAuth origins 추가

**Why:** 웹은 실사용 가능 상태. 최종 목표는 React Native 앱 + 앱스토어 배포.
**How to apply:** 모바일 앱 타입은 현재 수동 복제. 나중에 양쪽 모두 커지면 `packages/shared` 로 추출 검토.
