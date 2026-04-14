import { NextRequest } from 'next/server';
import { supabase, fetchAllRows } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { apiError, apiSuccess, ErrorCodes } from '@/lib/errors';
import * as XLSX from 'xlsx';

// POST /api/v1/contacts/import
//   ?mode=preview              → 파싱 + 중복 검사 결과 반환 (저장 X)
//   ?mode=save                 → 실제 저장 (기본값)
//   ?skipDuplicates=true       → 중복 항목 제외하고 저장
export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const url = new URL(request.url);
  const mode = url.searchParams.get('mode') === 'preview' ? 'preview' : 'save';
  const skipDuplicates = url.searchParams.get('skipDuplicates') === 'true';

  const formData = await request.formData();
  const file = formData.get('file') as File;
  if (!file) return apiError(ErrorCodes.VALIDATION, 'file이 필요합니다');

  const fileName = file.name.toLowerCase();
  let rows: ParsedRow[];

  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    rows = parseXlsx(await file.arrayBuffer());
  } else if (fileName.endsWith('.vcf')) {
    rows = parseVCard(await file.text());
  } else {
    return apiError(ErrorCodes.VALIDATION, '지원하지 않는 파일 형식입니다 (xlsx, xls, vcf)');
  }

  if (rows.length === 0) {
    return apiError(ErrorCodes.VALIDATION, '파일에서 연락처를 찾을 수 없습니다');
  }

  // 기존 연락처 fetch (중복 검사용) — 휴지통은 제외하고 활성 연락처만
  // Supabase 1000행 limit 우회 — 페이지네이션으로 전부 가져옴
  type ExistingRow = { id: string; last_name: string; first_name: string; phone: string; phone2: string | null; email: string | null; email2: string | null };
  const existing = await fetchAllRows<ExistingRow>(() =>
    supabase
      .from('contacts')
      .select('id, last_name, first_name, phone, phone2, email, email2')
      .eq('user_id', user!.id)
      .is('deleted_at', null)
  );

  // 매칭 인덱스 (전화번호 끝 8자리, 이메일 lowercase)
  const phoneIdx = new Map<string, ExistingContact>();
  const emailIdx = new Map<string, ExistingContact>();
  for (const c of existing || []) {
    const ec: ExistingContact = {
      id: c.id, last_name: c.last_name, first_name: c.first_name,
      phone: c.phone, email: c.email,
    };
    for (const p of [c.phone, c.phone2]) {
      const k = phoneKey(p);
      if (k && !phoneIdx.has(k)) phoneIdx.set(k, ec);
    }
    for (const e of [c.email, c.email2]) {
      const k = emailKey(e);
      if (k && !emailIdx.has(k)) emailIdx.set(k, ec);
    }
  }

  // 각 incoming row 매칭 검사
  let dupCount = 0;
  let newCount = 0;
  const samples: { incoming: ParsedRow; existing: ExistingContact; matchedBy: 'phone' | 'email' }[] = [];

  for (const row of rows) {
    const phoneMatch = phoneIdx.get(phoneKey(row.phone)) || phoneIdx.get(phoneKey(row.phone2));
    const emailMatch = !phoneMatch ? (emailIdx.get(emailKey(row.email)) || emailIdx.get(emailKey(row.email2))) : null;
    const match = phoneMatch || emailMatch;

    if (match) {
      row._duplicate = true;
      row._matched_id = match.id;
      dupCount++;
      if (samples.length < 50) {
        samples.push({ incoming: row, existing: match, matchedBy: phoneMatch ? 'phone' : 'email' });
      }
    } else {
      newCount++;
    }
  }

  // ─── preview 모드 ───
  if (mode === 'preview') {
    return apiSuccess({
      total: rows.length,
      new_count: newCount,
      duplicate_count: dupCount,
      duplicate_samples: samples.map(s => ({
        incoming: pickPublic(s.incoming),
        existing: s.existing,
        matched_by: s.matchedBy,
      })),
    });
  }

  // ─── save 모드 ───
  const toInsert = skipDuplicates ? rows.filter(r => !r._duplicate) : rows;
  if (toInsert.length === 0) {
    return apiSuccess({ imported: 0, skipped: dupCount, groups_created: 0 });
  }

  // 그룹 처리
  const groupNames = new Set<string>();
  for (const r of toInsert) {
    for (const g of r.groups) groupNames.add(g);
  }

  const { data: existingGroups } = await supabase
    .from('groups').select('id, name').eq('user_id', user!.id);
  const groupMap = new Map<string, string>();
  for (const g of existingGroups || []) groupMap.set(g.name, g.id);

  const newGroups = [...groupNames].filter(n => !groupMap.has(n));
  for (let i = 0; i < newGroups.length; i += 50) {
    const batch = newGroups.slice(i, i + 50).map(name => ({
      user_id: user!.id, name, color: generateColor(name),
    }));
    const { data } = await supabase.from('groups').insert(batch).select('id, name');
    if (data) for (const g of data) groupMap.set(g.name, g.id);
  }

  // 연락처 insert (배치 500)
  let imported = 0;
  const links: { contact_id: string; group_id: string }[] = [];

  for (let i = 0; i < toInsert.length; i += 500) {
    const batch = toInsert.slice(i, i + 500);
    const payload = batch.map(r => ({
      user_id: user!.id,
      last_name: r.last_name,
      first_name: r.first_name,
      phone: r.phone,
      phone2: r.phone2,
      email: r.email,
      email2: r.email2,
      company: r.company,
      position: r.position,
      address: r.address,
      memo: r.memo,
      favorite: false,
    }));

    const { data, error: dbError } = await supabase
      .from('contacts').insert(payload).select('id');
    if (dbError) return apiError(ErrorCodes.INTERNAL, `배치 ${Math.floor(i / 500) + 1} 실패: ${dbError.message}`);

    if (data) {
      imported += data.length;
      for (let j = 0; j < data.length; j++) {
        for (const gname of batch[j].groups) {
          const gid = groupMap.get(gname);
          if (gid) links.push({ contact_id: data[j].id, group_id: gid });
        }
      }
    }
  }

  for (let i = 0; i < links.length; i += 1000) {
    await supabase.from('contact_groups').insert(links.slice(i, i + 1000));
  }

  return apiSuccess({
    imported,
    skipped: rows.length - toInsert.length,
    duplicate_count: dupCount,
    groups_created: newGroups.length,
  });
}

// ─── 타입 ───
interface ParsedRow {
  last_name: string;
  first_name: string;
  phone: string;
  phone2: string;
  email: string;
  email2: string;
  company: string;
  position: string;
  address: string;
  memo: string;
  groups: string[];
  _duplicate?: boolean;
  _matched_id?: string;
}

interface ExistingContact {
  id: string;
  last_name: string;
  first_name: string;
  phone: string;
  email: string | null;
}

// ─── 파서 ───
function parseXlsx(buffer: ArrayBuffer): ParsedRow[] {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
  if (rows.length < 2) return [];

  const header = rows[0] as string[];
  const col = (n: string) => header.indexOf(n);
  const i = {
    last: col('성'), first: col('이름'),
    phone: col('휴대폰번호'), phone2: col('추가휴대폰번호1'),
    email: col('이메일'), email2: col('추가이메일1'),
    company: col('회사·소속명'), position: col('직책'),
    home: col('집주소'), companyAddr: col('회사주소'),
    memo: col('메모'),
    g1: col('그룹명'), g2: col('추가그룹명1'), g3: col('추가그룹명2'), g4: col('추가그룹명3'),
  };

  const out: ParsedRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const last = str(row, i.last);
    const first = str(row, i.first);
    const phone = str(row, i.phone);
    if (!last && !first && !phone) continue;
    const groups = [str(row, i.g1), str(row, i.g2), str(row, i.g3), str(row, i.g4)].filter(Boolean);
    out.push({
      last_name: last, first_name: first,
      phone, phone2: str(row, i.phone2),
      email: str(row, i.email), email2: str(row, i.email2),
      company: str(row, i.company), position: str(row, i.position),
      address: str(row, i.home) || str(row, i.companyAddr),
      memo: str(row, i.memo),
      groups,
    });
  }
  return out;
}

function parseVCard(text: string): ParsedRow[] {
  const out: ParsedRow[] = [];
  const cards = text.split('BEGIN:VCARD');
  for (const card of cards) {
    if (!card.includes('END:VCARD')) continue;
    const c: ParsedRow = {
      last_name: '', first_name: '', phone: '', phone2: '',
      email: '', email2: '', company: '', position: '',
      address: '', memo: '', groups: [],
    };
    for (const line of card.split(/\r?\n/)) {
      if (line.startsWith('N:')) {
        const p = line.substring(2).split(';');
        c.last_name = p[0] || ''; c.first_name = p[1] || '';
      } else if (line.startsWith('TEL')) {
        const v = line.replace(/^TEL[^:]*:/, '').trim();
        if (!c.phone) c.phone = v; else if (!c.phone2) c.phone2 = v;
      } else if (line.startsWith('EMAIL')) {
        const v = line.replace(/^EMAIL[^:]*:/, '').trim();
        if (!c.email) c.email = v; else if (!c.email2) c.email2 = v;
      } else if (line.startsWith('ORG:')) {
        c.company = line.substring(4).split(';')[0].trim();
      } else if (line.startsWith('TITLE:')) {
        c.position = line.substring(6).trim();
      } else if (line.startsWith('NOTE:')) {
        c.memo = line.substring(5).trim();
      }
    }
    if (c.first_name || c.last_name || c.phone) out.push(c);
  }
  return out;
}

// ─── 유틸 ───
function str(row: unknown[], idx: number): string {
  if (idx < 0 || idx >= row.length) return '';
  return (row[idx] ?? '').toString().trim();
}

function phoneKey(p: string | null | undefined): string {
  if (!p) return '';
  const digits = p.replace(/\D/g, '');
  return digits.length >= 8 ? digits.slice(-8) : '';
}

function emailKey(e: string | null | undefined): string {
  return (e || '').trim().toLowerCase();
}

function pickPublic(r: ParsedRow) {
  return {
    last_name: r.last_name, first_name: r.first_name,
    phone: r.phone, email: r.email,
    company: r.company,
  };
}

function generateColor(name: string): string {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}
