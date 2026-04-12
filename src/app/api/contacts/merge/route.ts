import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST /api/contacts/merge - 중복 연락처 병합
export async function POST(request: NextRequest) {
  const { contactIds, primaryId } = await request.json();

  if (!contactIds || contactIds.length < 2 || !primaryId) {
    return NextResponse.json({ error: 'contactIds (2+) and primaryId required' }, { status: 400 });
  }

  // 모든 연락처 가져오기
  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('*')
    .in('id', contactIds);

  if (error || !contacts) {
    return NextResponse.json({ error: 'contacts not found' }, { status: 404 });
  }

  const primary = contacts.find(c => c.id === primaryId);
  if (!primary) {
    return NextResponse.json({ error: 'primary contact not found' }, { status: 404 });
  }

  // 병합: 빈 필드를 다른 연락처 데이터로 채움
  const others = contacts.filter(c => c.id !== primaryId);
  const merged = { ...primary };
  const fields = ['phone', 'phone2', 'email', 'email2', 'company', 'position', 'address', 'memo', 'profile_image'] as const;

  for (const other of others) {
    for (const field of fields) {
      if (!merged[field] && other[field]) {
        merged[field] = other[field];
      }
    }
    if (other.favorite) merged.favorite = true;
  }

  // primary 업데이트
  const { id, created_at, updated_at, user_id, ...updateData } = merged;
  await supabase.from('contacts').update(updateData).eq('id', primaryId);

  // 다른 연락처의 그룹 연결을 primary로 이전
  const otherIds = others.map(o => o.id);
  const { data: otherGroups } = await supabase
    .from('contact_groups')
    .select('group_id')
    .in('contact_id', otherIds);

  if (otherGroups) {
    const { data: existingGroups } = await supabase
      .from('contact_groups')
      .select('group_id')
      .eq('contact_id', primaryId);

    const existingSet = new Set(existingGroups?.map(g => g.group_id));
    const newGroups = otherGroups
      .filter(g => !existingSet.has(g.group_id))
      .map(g => ({ contact_id: primaryId, group_id: g.group_id }));

    if (newGroups.length > 0) {
      await supabase.from('contact_groups').insert(newGroups);
    }
  }

  // 나머지 연락처 삭제
  await supabase.from('contacts').delete().in('id', otherIds);

  return NextResponse.json({ merged: primaryId, deleted: otherIds });
}
