import { db, type LocalContact, type LocalGroup } from './local-db';
import { supabase } from './supabase';

// 서버에서 로컬로 증분 동기화.
// onProgress(loaded, total)로 진행률 보고.
export interface SyncProgress {
  phase: 'contacts' | 'groups' | 'contact_groups' | 'done' | 'error';
  loaded: number;
  total: number;
  message?: string;
}

const PAGE_SIZE = 1000;

export async function pullSync(
  userId: string,
  onProgress?: (p: SyncProgress) => void,
): Promise<void> {
  try {
    // 1. sync_meta에서 마지막 sync 시각 읽기
    const meta = await db.sync_meta.get(userId);
    const since = meta?.last_pulled_at ?? null;

    // 2. 먼저 total count 가져오기 (UI에 표시용)
    const baseCount = supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true });
    const { count: totalCount, error: countErr } = await (since
      ? baseCount.gt('updated_at', since)
      : baseCount.is('deleted_at', null));
    if (countErr) throw countErr;
    const total = totalCount ?? 0;

    onProgress?.({ phase: 'contacts', loaded: 0, total, message: '연락처 동기화 시작' });

    // 3. contacts 페이지네이션으로 pull
    let loaded = 0;
    let from = 0;
    for (;;) {
      let q = supabase
        .from('contacts')
        .select('*')
        .order('updated_at', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (since) q = q.gt('updated_at', since);

      const { data, error } = await q;
      if (error) throw error;
      if (!data || data.length === 0) break;

      // 로컬에 bulkPut (upsert)
      await db.contacts.bulkPut(data as LocalContact[]);
      loaded += data.length;
      onProgress?.({ phase: 'contacts', loaded, total, message: `연락처 ${loaded.toLocaleString()}/${total.toLocaleString()}` });

      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    // 4. groups pull (전체)
    onProgress?.({ phase: 'groups', loaded: 0, total: 0, message: '그룹 동기화 중' });
    let gFrom = 0;
    let gLoaded = 0;
    for (;;) {
      let gq = supabase
        .from('groups')
        .select('*')
        .order('updated_at', { ascending: true })
        .range(gFrom, gFrom + PAGE_SIZE - 1);
      if (since) gq = gq.gt('updated_at', since);
      const { data: g, error: gErr } = await gq;
      if (gErr) throw gErr;
      if (!g || g.length === 0) break;
      await db.groups.bulkPut(g as LocalGroup[]);
      gLoaded += g.length;
      onProgress?.({ phase: 'groups', loaded: gLoaded, total: gLoaded, message: `그룹 ${gLoaded}` });
      if (g.length < PAGE_SIZE) break;
      gFrom += PAGE_SIZE;
    }

    // 5. contact_groups pull (증분 — removed_at 변경도 반영 위해 전체)
    //    규모가 크면 추후 최적화 필요. 일단 전체 가져옴.
    onProgress?.({ phase: 'contact_groups', loaded: 0, total: 0, message: '그룹 연결 동기화 중' });
    let cgFrom = 0;
    for (;;) {
      const { data: cg, error: cgErr } = await supabase
        .from('contact_groups')
        .select('contact_id, group_id, removed_at')
        .range(cgFrom, cgFrom + PAGE_SIZE - 1);
      if (cgErr) throw cgErr;
      if (!cg || cg.length === 0) break;
      await db.contact_groups.bulkPut(cg);
      if (cg.length < PAGE_SIZE) break;
      cgFrom += PAGE_SIZE;
    }

    // 6. sync_meta 갱신
    const nowIso = new Date().toISOString();
    const countAll = await db.contacts.where('user_id').equals(userId).count();
    await db.sync_meta.put({
      key: userId,
      user_id: userId,
      last_pulled_at: nowIso,
      total_contacts: countAll,
      updated_at: nowIso,
    });

    onProgress?.({ phase: 'done', loaded: countAll, total: countAll, message: '동기화 완료' });
  } catch (e) {
    let msg: string;
    if (e instanceof Error) msg = e.message;
    else if (typeof e === 'object' && e !== null) {
      const anyE = e as { message?: string; details?: string; code?: string; hint?: string };
      msg = [anyE.message, anyE.details, anyE.code, anyE.hint].filter(Boolean).join(' · ') || JSON.stringify(e);
    } else {
      msg = String(e);
    }
    console.error('[pullSync] error', e);
    onProgress?.({ phase: 'error', loaded: 0, total: 0, message: msg });
    throw e;
  }
}
