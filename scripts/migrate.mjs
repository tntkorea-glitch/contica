/**
 * contica Supabase 이관 스크립트
 * 사용법: node scripts/migrate.mjs
 *
 * 사전 조건:
 *   1. 새 Supabase 프로젝트에 supabase-full-setup.sql 실행 완료
 *   2. 아래 NEW_* 변수에 새 프로젝트 값 입력
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync, existsSync } from 'fs'

// ── 구 프로젝트 (읽기 전용) ──────────────────────────────
const OLD_URL = process.env.OLD_URL || 'https://krnpicwujfkvbymtecsf.supabase.co'
const OLD_SERVICE_KEY = process.env.OLD_SERVICE_KEY || ''

// ── 새 프로젝트 (쓰기 대상) ──────────────────────────────
const NEW_URL = 'https://xrwvpfdxcjrgdvcaylgk.supabase.co'
const NEW_SERVICE_KEY = process.env.NEW_SERVICE_KEY || ''  // 환경변수로 전달

// ── 백업 폴더 ────────────────────────────────────────────
const BACKUP_DIR = './supabase-backup'

// ─────────────────────────────────────────────────────────

if (!NEW_SERVICE_KEY) {
  console.error('❌ NEW_SERVICE_KEY 환경변수가 없습니다.')
  console.error('   실행 방법: NEW_SERVICE_KEY="eyJ..." node scripts/migrate.mjs')
  process.exit(1)
}

const oldClient = createClient(OLD_URL, OLD_SERVICE_KEY, {
  auth: { persistSession: false }
})
const newClient = createClient(NEW_URL, NEW_SERVICE_KEY, {
  auth: { persistSession: false }
})

if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true })

// ── 페이지네이션 전체 조회 ────────────────────────────────
async function fetchAll(client, table, extraSelect = '*') {
  let all = []
  let from = 0
  const pageSize = 1000
  while (true) {
    const { data, error } = await client
      .from(table)
      .select(extraSelect)
      .range(from, from + pageSize - 1)
    if (error) throw new Error(`[${table}] 조회 실패: ${error.message}`)
    if (!data || data.length === 0) break
    all = all.concat(data)
    process.stdout.write(`  ${table}: ${all.length}건 조회 중...\r`)
    if (data.length < pageSize) break
    from += pageSize
  }
  return all
}

// ── 배치 insert ───────────────────────────────────────────
async function insertBatch(client, table, rows, batchSize = 500) {
  let inserted = 0
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const { error } = await client.from(table).insert(batch)
    if (error) throw new Error(`[${table}] insert 실패 (offset ${i}): ${error.message}`)
    inserted += batch.length
    process.stdout.write(`  ${table}: ${inserted}/${rows.length} 완료\r`)
  }
  console.log(`  ✅ ${table}: ${inserted}건 완료         `)
}

// ─────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(50))
  console.log('contica Supabase 이관 시작')
  console.log(`구 → ${OLD_URL}`)
  console.log(`신 → ${NEW_URL}`)
  console.log('='.repeat(50))

  // ── 1단계: 내보내기 ──────────────────────────────────────
  console.log('\n[1/2] 구 프로젝트 데이터 내보내기')

  const tables = ['contacts', 'groups', 'contact_groups', 'devices', 'user_shares']
  const exported = {}

  for (const table of tables) {
    const rows = await fetchAll(oldClient, table)
    exported[table] = rows
    writeFileSync(`${BACKUP_DIR}/${table}.json`, JSON.stringify(rows, null, 2))
    console.log(`  ✅ ${table}: ${rows.length}건 → ${BACKUP_DIR}/${table}.json`)
  }

  // sync_events는 대용량일 수 있어 선택적 내보내기
  try {
    const syncEvents = await fetchAll(oldClient, 'sync_events')
    writeFileSync(`${BACKUP_DIR}/sync_events.json`, JSON.stringify(syncEvents, null, 2))
    console.log(`  ✅ sync_events: ${syncEvents.length}건 → ${BACKUP_DIR}/sync_events.json`)
    exported.sync_events = syncEvents
  } catch (e) {
    console.log(`  ⚠️  sync_events: 건너뜀 (${e.message})`)
    exported.sync_events = []
  }

  // ── 2단계: 가져오기 ──────────────────────────────────────
  console.log('\n[2/2] 새 프로젝트로 가져오기')
  console.log('  (RLS 우회를 위해 service_role 키 사용)')

  // 순서 중요: contacts/groups 먼저, contact_groups/devices 나중에
  if (exported.groups.length > 0) {
    await insertBatch(newClient, 'groups', exported.groups)
  }
  if (exported.contacts.length > 0) {
    await insertBatch(newClient, 'contacts', exported.contacts)
  }
  if (exported.contact_groups.length > 0) {
    await insertBatch(newClient, 'contact_groups', exported.contact_groups)
  }
  if (exported.devices.length > 0) {
    await insertBatch(newClient, 'devices', exported.devices)
  }
  if (exported.user_shares.length > 0) {
    await insertBatch(newClient, 'user_shares', exported.user_shares)
  }
  if (exported.sync_events && exported.sync_events.length > 0) {
    await insertBatch(newClient, 'sync_events', exported.sync_events)
  }

  // ── 완료 요약 ────────────────────────────────────────────
  console.log('\n' + '='.repeat(50))
  console.log('✅ 이관 완료!')
  console.log('='.repeat(50))
  console.log('\n[다음 단계]')
  console.log('1. 새 프로젝트에서 Google 로그인 → 새 UUID 확인')
  console.log('2. 아래 SQL을 새 프로젝트 SQL Editor에서 실행하여 user_id 교체:')
  console.log()
  console.log('   UPDATE contacts SET user_id = \'<새-UUID>\' WHERE user_id = \'85f67042-f584-493e-98d5-d695d27152e5\';')
  console.log('   UPDATE groups   SET user_id = \'<새-UUID>\' WHERE user_id = \'85f67042-f584-493e-98d5-d695d27152e5\';')
  console.log('   UPDATE devices  SET user_id = \'<새-UUID>\' WHERE user_id = \'85f67042-f584-493e-98d5-d695d27152e5\';')
  console.log()
  console.log('3. lib/constants.ts MAIN_USER_ID = \'<새-UUID>\' 로 변경')
  console.log('4. .env.local 및 Vercel env 새 프로젝트 키로 교체')
}

main().catch(err => {
  console.error('\n❌ 오류:', err.message)
  process.exit(1)
})
