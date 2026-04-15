---
name: listica-mobile (Expo 앱)
description: listica React Native 앱의 프로젝트 위치·구조·실행법
type: project
originSessionId: 4173b96c-4c1e-4cb4-b57e-ec4f523ce2bc
---
listica 웹과 같은 Supabase 백엔드를 사용하는 Expo 모바일 앱.

## 위치
- 코드: `D:\dev\listica-mobile`
- 웹과는 별도 git 저장소 (2026-04-15 `git init`, 원격 repo 아직 없음)

## 스택
- Expo SDK 54, React Native 0.81, React 19, TypeScript 5.9
- @supabase/supabase-js + @react-native-async-storage/async-storage + react-native-url-polyfill
- 네비게이션 라이브러리 미도입 — App.tsx에서 session 유무로 Login/Contacts 스위치 (MVP 단계)

## 실행
```
cd D:\dev\listica-mobile
npm start         # Expo dev server + QR
npm run android   # 에뮬레이터
```
실기기는 Expo Go 앱으로 QR 스캔.

## 환경변수 (.env, git 제외)
- EXPO_PUBLIC_SUPABASE_URL = 웹과 동일 (krnpicwujfkvbymtecsf)
- EXPO_PUBLIC_SUPABASE_ANON_KEY = 웹과 동일 anon key
- `EXPO_PUBLIC_` 프리픽스여야 클라이언트 번들에 포함됨

## 구조
- `src/lib/supabase.ts` — AsyncStorage를 세션 스토리지로 사용하는 Supabase client
- `src/lib/types.ts` — 웹 `src/lib/types.ts`에서 Contact/Group 일부만 복제 (수동 sync 필요)
- `src/screens/LoginScreen.tsx` — 이메일/비번 로그인·가입
- `src/screens/ContactsScreen.tsx` — 연락처 FlatList + 검색 + pull-to-refresh
- `App.tsx` — 세션 기반 라우팅 + 로그아웃

**Why:** 앱스토어 배포용 RN 앱이 최종 목표. 메모리에 이미 #1 작업으로 명시돼있어서 스캐폴딩만 자동 진행.
**How to apply:** 앱에 기능 추가할 때 웹 타입(`D:\dev\listica\src\lib\types.ts`)과 모바일 타입을 직접 sync. 양쪽 모두 커지면 shared 패키지 추출 검토.
