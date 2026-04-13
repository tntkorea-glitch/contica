import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { apiError, apiSuccess, ErrorCodes } from '@/lib/errors';

// POST /api/v1/contacts/merge — 중복 연락처 병합
export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const { primary_id, merge_ids } = await request.json();

  if (!primary_id || !merge_ids?.length) {
    return apiError(ErrorCodes.VALIDATION, 'primary_id와 merge_ids가 필요합니다');
  }

  // 원본 연락처 가져오기
  const { data: primary } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', primary_id)
    .eq('user_id', user!.id)
    .single();

  if (!primary) {
    return apiError(ErrorCodes.NOT_FOUND, '원본 연락처를 찾을 수 없습니다');
  }

  // 병합 대상 가져오기
  const { data: others } = await supabase
    .from('contacts')
    .select('*')
    .in('id', merge_ids)
    .eq('user_id', user!.id);

  if (!others?.length) {
    return apiError(ErrorCodes.NOT_FOUND, '병합 대상을 찾을 수 없습니다');
  }

  // 빈 필드 채우기
  const fillFields = ['phone2', 'email', 'email2', 'company', 'position', 'address', 'memo'] as const;
  const updates: Record<string, string | boolean> = {};

  for (const other of others) {
    for (const field of fillFields) {
      if (!primary[field] && other[field]) {
        updates[field] = other[field];
      }
    }
    if (other.favorite && !primary.favorite) {
      updates.favorite = true;
    }
  }

  // 원본 업데이트
  if (Object.keys(updates).length) {
    await supabase
      .from('contacts')
      .update(updates)
      .eq('id', primary_id);
  }

  // 병합 대상의 그룹 연결을 원본으로 이관
  const { data: otherGroups } = await supabase
    .from('contact_groups')
    .select('group_id')
    .in('contact_id', merge_ids)
    .is('removed_at', null);

  if (otherGroups?.length) {
    const { data: existingGroups } = await supabase
      .from('contact_groups')
      .select('group_id')
      .eq('contact_id', primary_id)
      .is('removed_at', null);

    const existingSet = new Set(existingGroups?.map(g => g.group_id) || []);
    const newGroups = otherGroups
      .filter(g => !existingSet.has(g.group_id))
      .map(g => ({ contact_id: primary_id, group_id: g.group_id }));

    if (newGroups.length) {
      await supabase.from('contact_groups').insert(newGroups);
    }
  }

  // 병합 대상 soft delete
  const now = new Date().toISOString();
  await supabase
    .from('contacts')
    .update({ deleted_at: now })
    .in('id', merge_ids);

  await supabase
    .from('contact_groups')
    .update({ removed_at: now })
    .in('contact_id', merge_ids);

  // 업데이트된 원본 반환
  const { data: result } = await supabase
    .from('contacts')
    .select('*, contact_groups(group_id, groups(*))')
    .eq('id', primary_id)
    .single();

  return apiSuccess(result);
}
