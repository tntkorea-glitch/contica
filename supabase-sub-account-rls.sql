-- ============================================
-- contica — 서브 계정 RLS 정책
-- 서브 계정이 메인 user_id로 contacts/groups/contact_groups에 INSERT 할 수 있도록
-- user_shares 테이블 기반으로 권한 부여.
-- ============================================
-- 실행 전제:
--   - user_shares 테이블이 이미 존재 (main_user_id, member_user_id, scope, revoked_at)
--   - contacts/groups/contact_groups 에 이미 본인-insert 정책이 있음
--     (auth.uid()::text = user_id)
-- 이 파일은 거기에 "공유 기반 insert" 추가 정책을 얹는다.
-- 기존 정책은 건드리지 않으므로 되돌리기는 drop policy만 하면 됨.
-- ============================================

-- 1. contacts: 서브 계정이 공유받은 메인의 데이터 공간에 insert
drop policy if exists "sub insert to main contacts via share" on public.contacts;
create policy "sub insert to main contacts via share"
  on public.contacts for insert
  to authenticated
  with check (
    exists (
      select 1 from public.user_shares
      where main_user_id = contacts.user_id
        and member_user_id = (auth.uid())::text
        and scope = 'all'
        and revoked_at is null
    )
  );

-- 2. groups: 동일 논리 (Discover가 '정리필요' 그룹을 메인 id로 생성할 때 필요)
drop policy if exists "sub insert to main groups via share" on public.groups;
create policy "sub insert to main groups via share"
  on public.groups for insert
  to authenticated
  with check (
    exists (
      select 1 from public.user_shares
      where main_user_id = groups.user_id
        and member_user_id = (auth.uid())::text
        and scope = 'all'
        and revoked_at is null
    )
  );

-- 3. contact_groups: 링크 테이블. contact가 공유받은 메인의 것이면 insert 허용
drop policy if exists "sub insert contact_groups via share" on public.contact_groups;
create policy "sub insert contact_groups via share"
  on public.contact_groups for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.contacts c
      join public.user_shares us on us.main_user_id = c.user_id
      where c.id = contact_groups.contact_id
        and us.member_user_id = (auth.uid())::text
        and us.scope = 'all'
        and us.revoked_at is null
    )
  );

-- ============================================
-- 주의: UPDATE/DELETE는 의도적으로 허용하지 않음.
-- 서브 계정은 insert만 가능하고 수정/삭제는 웹(메인)에서만 처리.
-- Phase 3에서 서브 폰의 삭제 감지 + 확인 UI를 구현하면
-- 그 시점에 명시적 API 엔드포인트로 처리 (RLS로는 계속 차단).
-- ============================================
