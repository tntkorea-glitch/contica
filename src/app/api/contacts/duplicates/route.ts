import { NextResponse } from 'next/server';
import { supabase, Contact } from '@/lib/supabase';

// GET /api/contacts/duplicates - 중복 연락처 감지
export async function GET() {
  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('*')
    .order('last_name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!contacts) {
    return NextResponse.json([]);
  }

  // 중복 그룹 찾기: 이름 또는 전화번호 기준
  const duplicateGroups: Contact[][] = [];
  const visited = new Set<string>();

  for (let i = 0; i < contacts.length; i++) {
    if (visited.has(contacts[i].id)) continue;

    const group: Contact[] = [contacts[i]];

    for (let j = i + 1; j < contacts.length; j++) {
      if (visited.has(contacts[j].id)) continue;

      const nameMatch =
        contacts[i].first_name && contacts[j].first_name &&
        contacts[i].last_name === contacts[j].last_name &&
        contacts[i].first_name === contacts[j].first_name;

      const phoneMatch =
        contacts[i].phone && contacts[j].phone &&
        contacts[i].phone.replace(/[-\s]/g, '') === contacts[j].phone.replace(/[-\s]/g, '');

      if (nameMatch || phoneMatch) {
        group.push(contacts[j]);
        visited.add(contacts[j].id);
      }
    }

    if (group.length > 1) {
      visited.add(contacts[i].id);
      duplicateGroups.push(group);
    }
  }

  return NextResponse.json(duplicateGroups);
}
