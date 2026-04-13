---
name: Project Status
description: naver-contact 프로젝트 현재 진행 상태 및 다음 작업
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

## Supabase 설정
- Organization: milveus-glitch's Project (Pro Plan $25/월)
- Project URL: https://krnpicwujfkvbymtecsf.supabase.co
- Region: Northeast Asia (Seoul)
- 이메일 인증: 아직 비활성화 안 됨 (Supabase Auth 설정에서 Confirm email OFF 필요)

## Next up when resuming
1. **Vercel 환경변수 설정** — NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
2. **Vercel 배포 확인** — 프로덕션에서 정상 동작하는지 테스트
3. **Supabase 이메일 인증 비활성화** — Auth > Providers > Email > Confirm email OFF
4. **인증 bypass 제거** — AuthGuard, api-auth.ts에서 TODO 주석 부분 복원
5. **핸드폰에서 실시간 동기화 테스트**
6. **두번째 xlsx 파일 import** (92935659, 16,968건)
7. **UI 개선** — 네이버 주소록 캡처 참고하여 디테일 다듬기

**Why:** 2026-04-14 새벽 작업 마무리. 인증 없이 테스트 가능한 상태. 네이버 기능 대부분 구현 완료.
**How to apply:** Vercel 환경변수 설정 → 배포 확인 → 인증 복원 → 모바일 테스트 순서로 진행
