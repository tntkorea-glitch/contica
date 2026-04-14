---
name: Project Status
description: listica 프로젝트 현재 진행 상태 및 다음 작업
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
- **Vercel 배포 URL** = https://listica.vercel.app

## Supabase 설정
- Organization: milveus-glitch's Project (Pro Plan $25/월)
- Project URL: https://krnpicwujfkvbymtecsf.supabase.co
- Region: Northeast Asia (Seoul)
- 이메일 인증: 아직 비활성화 안 됨 (Supabase Auth 설정에서 Confirm email OFF 필요)

## Next up when resuming
1. **React Native(Expo) 앱 프로젝트 시작** — 새 폴더 `D:\dev\listica-mobile`
2. **앱 MVP**: 로그인 → 연락처 리스트/추가/수정 + 폰 기본 연락처 sync (1주)
3. **Expo Go / EAS dev build 로 본인 폰 설치** — 앱스토어 승인 전에 즉시 사용
4. **앱 polish + 앱스토어 심사 준비** (1~2주)
5. **카카오/네이버 로그인** 실제 구현 (현재는 "준비중" alert만)
6. **두번째 xlsx 파일 import** (92935659, 16,968건)
7. **Realtime 디버깅** (지금은 새로고침/포커스 기반으로 작동 중)

**Why:** 웹은 실사용 가능 상태. 최종 목표는 React Native 앱 + 앱스토어 배포 (다른 회원도 가입 사용).
**How to apply:** 2번부터 새 프로젝트 시작. 공용 타입(src/lib/types.ts)을 모바일 앱에서도 import 가능하도록 공유 패키지로 뽑을지 검토.
