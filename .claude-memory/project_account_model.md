---
name: 계정 모델 (Main/Sub)
description: contica의 메인/서브 계정 구분 원칙과 각 계정의 권한 범위
type: project
originSessionId: 60c692e5-4511-480a-80a3-aef237da4990
---
contica는 **1개의 메인 계정 + N개의 서브 계정** 구조로 동작한다.

## 메인 계정 (Main Account)
- **고정**: Google 계정 `tntkorea@tntkorea.co.kr`
- **user_id**: `85f67042-f584-493e-98d5-d695d27152e5`
- **주 편집 환경**: 웹(`contica.vercel.app`) — 여기서 연락처 통합 관리
- **모바일 권한**: 양방향 동기화 + 자동 폰→서버 업로드 + 삭제 전파 전부 허용
- **식별 방법 (클라이언트)**: `user.id === MAIN_USER_ID` 상수 비교. 하드코딩.

## 서브 계정 (Sub Account)
- **범위**: 메인 계정 외 **모든** Supabase 계정 (Google, 이메일, 카카오, 네이버 가입 전부)
- **데이터 관계**: `share_invites` 테이블 레코드로 메인 계정 데이터 read-only 공유받음
- **모바일 권한**:
  - ✅ 서버→폰 Realtime 구독 (읽기)
  - ✅ 앱→폰 단방향 동기화 (서버 기준으로 폰 업데이트)
  - ❌ 폰→서버 자동 업로드 (포그라운드 자동 sync) 비활성
  - ❌ 양방향 동기화 버튼 숨김
  - ✅ Discover 스캔 → 선택된 신규 번호를 **메인 `user_id`로 insert** 만 가능
  - ❌ 수정·삭제 전파 불가 (폰에서 삭제한 경우 알림 후 확인 UI 필요, Phase 3 구현)

## 이름 충돌 정책
- **서버 우선**: `syncPhoneToApp`에서 `first_name`/`last_name`은 서버에 값이 있으면 덮지 않음
- **빈 값 방어**: 폰이 빈 값이면 서버의 채워진 값을 덮지 않음 (모든 필드 공통)
- **근거**: 웹이 통합 관리 환경이므로 웹에서 다듬은 메타데이터(회사/메모/풀네임 등) 보존이 우선

**Why:** 폰은 기기마다 local `phone_contact_id`가 달라서 멀티폰 양방향 동기화 시 대량 소프트 딜리트 위험이 있음. 메인/서브 구조로 쓰기 권한을 분리해 사고 방지.
**How to apply:** 모바일 코드에서 `isMainAccount` 분기로 기능 게이팅. Supabase RLS 정책은 서브가 메인 `user_id`로 insert 가능하도록 `share_invites` 기반 예외를 추가해야 함(Phase 2).
