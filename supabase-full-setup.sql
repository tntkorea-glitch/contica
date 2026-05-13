-- ============================================
-- contica — 새 프로젝트 전체 셋업 SQL
-- 새 Supabase 프로젝트 SQL Editor에서 한 번에 실행
-- ============================================

-- ============================================
-- 1. 기본 테이블
-- ============================================

create table if not exists contacts (
  id uuid default gen_random_uuid() primary key,
  user_id text not null default 'default',
  first_name text not null default '',
  last_name text not null default '',
  phone text not null default '',
  phone2 text default '',
  email text default '',
  email2 text default '',
  company text default '',
  position text default '',
  address text default '',
  memo text default '',
  profile_image text default '',
  favorite boolean default false,
  version integer not null default 1,
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists groups (
  id uuid default gen_random_uuid() primary key,
  user_id text not null default 'default',
  name text not null,
  color text default '#6366f1',
  version integer not null default 1,
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists contact_groups (
  contact_id uuid references contacts(id) on delete cascade,
  group_id uuid references groups(id) on delete cascade,
  created_at timestamptz default now(),
  removed_at timestamptz,
  primary key (contact_id, group_id)
);

create table if not exists devices (
  id uuid default gen_random_uuid() primary key,
  user_id text not null default 'default',
  device_name text not null,
  device_type text not null check (device_type in ('web', 'ios', 'android')),
  push_token text,
  last_synced_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists sync_events (
  id uuid default gen_random_uuid() primary key,
  user_id text not null default 'default',
  device_id uuid references devices(id) on delete set null,
  entity_type text not null check (entity_type in ('contact', 'group', 'contact_group')),
  entity_id text,
  action text not null check (action in ('create', 'update', 'delete')),
  changes jsonb,
  created_at timestamptz default now()
);

create table if not exists user_shares (
  id uuid default gen_random_uuid() primary key,
  main_user_id text not null,
  member_user_id text not null,
  scope text not null default 'all',
  revoked_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================
-- 2. 인덱스
-- ============================================

create index if not exists idx_contacts_user on contacts(user_id);
create index if not exists idx_contacts_name on contacts(last_name, first_name);
create index if not exists idx_contacts_phone on contacts(phone);
create index if not exists idx_contacts_favorite on contacts(user_id, favorite);
create index if not exists idx_contacts_updated on contacts(user_id, updated_at);
create index if not exists idx_contacts_deleted on contacts(user_id, deleted_at) where deleted_at is not null;
create index if not exists idx_contacts_version on contacts(user_id, version);
create index if not exists idx_contacts_not_deleted on contacts(user_id) where deleted_at is null;

create index if not exists idx_groups_user on groups(user_id);
create index if not exists idx_groups_updated on groups(user_id, updated_at);
create index if not exists idx_groups_deleted on groups(user_id, deleted_at) where deleted_at is not null;

create index if not exists idx_contact_groups_sync on contact_groups(created_at) where removed_at is null;
create index if not exists idx_contact_groups_removed on contact_groups(removed_at) where removed_at is not null;

create index if not exists idx_devices_user on devices(user_id);
create index if not exists idx_sync_events_user_time on sync_events(user_id, created_at);
create index if not exists idx_sync_events_device on sync_events(device_id, created_at);

-- ============================================
-- 3. 트리거 함수
-- ============================================

create or replace function increment_contact_version()
returns trigger as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    new.updated_at = now();
    return new;
  end if;
  new.version = old.version + 1;
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists contacts_updated_at on contacts;
drop trigger if exists contacts_version_increment on contacts;
create trigger contacts_version_increment
  before update on contacts
  for each row execute function increment_contact_version();

create or replace function increment_group_version()
returns trigger as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    new.updated_at = now();
    return new;
  end if;
  new.version = old.version + 1;
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists groups_version_increment on groups;
create trigger groups_version_increment
  before update on groups
  for each row execute function increment_group_version();

create or replace function update_device_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists devices_updated_at on devices;
create trigger devices_updated_at
  before update on devices
  for each row execute function update_device_updated_at();

-- ============================================
-- 4. Realtime 활성화
-- ============================================

alter publication supabase_realtime add table contacts;
alter publication supabase_realtime add table groups;
alter publication supabase_realtime add table contact_groups;

-- ============================================
-- 5. RLS (Row Level Security)
-- ============================================

alter table contacts enable row level security;
alter table groups enable row level security;
alter table contact_groups enable row level security;
alter table devices enable row level security;
alter table user_shares enable row level security;

-- contacts: 본인 데이터 전체 접근
drop policy if exists "user_access_contacts" on contacts;
create policy "user_access_contacts" on contacts
  for all using (auth.uid()::text = user_id);

-- groups: 본인 데이터 전체 접근
drop policy if exists "user_access_groups" on groups;
create policy "user_access_groups" on groups
  for all using (auth.uid()::text = user_id);

-- contact_groups: contacts를 통해 본인 데이터 접근
drop policy if exists "user_access_contact_groups" on contact_groups;
create policy "user_access_contact_groups" on contact_groups
  for all using (
    exists (
      select 1 from contacts c
      where c.id = contact_groups.contact_id
        and c.user_id = auth.uid()::text
    )
  );

-- devices: 본인 기기만
drop policy if exists "user_access_devices" on devices;
create policy "user_access_devices" on devices
  for all using (auth.uid()::text = user_id);

-- user_shares: 본인이 main이거나 member인 row
drop policy if exists "user_access_shares" on user_shares;
create policy "user_access_shares" on user_shares
  for all using (
    auth.uid()::text = main_user_id
    or auth.uid()::text = member_user_id
  );

-- ============================================
-- 6. 서브 계정 RLS (공유 기반 insert)
-- ============================================

drop policy if exists "sub insert to main contacts via share" on contacts;
create policy "sub insert to main contacts via share"
  on contacts for insert
  to authenticated
  with check (
    exists (
      select 1 from user_shares
      where main_user_id = contacts.user_id
        and member_user_id = (auth.uid())::text
        and scope = 'all'
        and revoked_at is null
    )
  );

drop policy if exists "sub insert to main groups via share" on groups;
create policy "sub insert to main groups via share"
  on groups for insert
  to authenticated
  with check (
    exists (
      select 1 from user_shares
      where main_user_id = groups.user_id
        and member_user_id = (auth.uid())::text
        and scope = 'all'
        and revoked_at is null
    )
  );

drop policy if exists "sub insert contact_groups via share" on contact_groups;
create policy "sub insert contact_groups via share"
  on contact_groups for insert
  to authenticated
  with check (
    exists (
      select 1
      from contacts c
      join user_shares us on us.main_user_id = c.user_id
      where c.id = contact_groups.contact_id
        and us.member_user_id = (auth.uid())::text
        and us.scope = 'all'
        and us.revoked_at is null
    )
  );

-- ============================================
-- 완료! 다음: scripts/migrate.mjs 실행
-- ============================================
