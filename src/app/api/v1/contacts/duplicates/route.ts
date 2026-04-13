import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { apiError, apiSuccess, ErrorCodes } from '@/lib/errors';
import type { Contact } from '@/lib/types';

// GET /api/v1/contacts/duplicates — 중복 연락처 검출
export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const { data: contacts, error: dbError } = await supabase
    .from('contacts')
    .select('*')
    .eq('user_id', user!.id)
    .is('deleted_at', null);

  if (dbError) {
    return apiError(ErrorCodes.INTERNAL, dbError.message);
  }

  if (!contacts?.length) {
    return apiSuccess([]);
  }

  // 이름 또는 전화번호 기준 중복 그룹핑
  const groups: Map<string, Contact[]> = new Map();

  for (const c of contacts as Contact[]) {
    const nameKey = `${c.last_name}${c.first_name}`.trim().toLowerCase();
    const phoneKey = c.phone?.replace(/[^0-9]/g, '') || '';

    let matched = false;
    for (const [key, group] of groups) {
      const ref = group[0];
      const refName = `${ref.last_name}${ref.first_name}`.trim().toLowerCase();
      const refPhone = ref.phone?.replace(/[^0-9]/g, '') || '';

      if ((nameKey && nameKey === refName) || (phoneKey && phoneKey === refPhone)) {
        group.push(c);
        matched = true;
        // key 사용 (lint)
        void key;
        break;
      }
    }

    if (!matched) {
      groups.set(c.id, [c]);
    }
  }

  const duplicates = Array.from(groups.values()).filter(g => g.length > 1);
  return apiSuccess(duplicates);
}
