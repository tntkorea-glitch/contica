import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { apiError, apiSuccess, ErrorCodes } from '@/lib/errors';

// POST /api/v1/shares/invitation — 초대 코드 발급 (메인 전용)
// body: { scope: 'all' | 'groups', group_ids?: string[] }
export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const scope: 'all' | 'groups' = body?.scope === 'groups' ? 'groups' : 'all';
  const groupIds: string[] = Array.isArray(body?.group_ids) ? body.group_ids : [];
  const memberLabel: string | null = typeof body?.member_label === 'string' && body.member_label.trim()
    ? body.member_label.trim().slice(0, 50)
    : null;

  if (scope === 'groups' && groupIds.length === 0) {
    return apiError(ErrorCodes.VALIDATION, 'group_ids가 필요합니다 (scope=groups)');
  }

  // groups 모드면 사용자 소유 그룹인지 검증
  if (scope === 'groups') {
    const { data: owned } = await supabase
      .from('groups')
      .select('id')
      .eq('user_id', user!.id)
      .in('id', groupIds);
    const ownedIds = new Set((owned ?? []).map(g => g.id));
    const invalid = groupIds.filter(id => !ownedIds.has(id));
    if (invalid.length > 0) {
      return apiError(ErrorCodes.VALIDATION, '존재하지 않거나 본인 소유가 아닌 그룹입니다', { invalid });
    }
  }

  // 6자리 대문자+숫자 (혼동문자 0/O/1/I/L 제외)
  const code = makeCode(6);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10분

  const { error: dbError } = await supabase
    .from('invitation_codes')
    .insert({
      code,
      main_user_id: user!.id,
      scope,
      group_ids: scope === 'groups' ? groupIds : [],
      expires_at: expiresAt,
    });

  if (dbError) return apiError(ErrorCodes.INTERNAL, dbError.message);

  return apiSuccess({ code, scope, expires_at: expiresAt, group_ids: groupIds });
}

// GET /api/v1/shares/invitation — 내가 발급한 유효 코드 목록 (주로 개발용)
export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const { data } = await supabase
    .from('invitation_codes')
    .select('code, scope, group_ids, expires_at, used_at, used_by, created_at')
    .eq('main_user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(20);

  return apiSuccess(data ?? []);
}

function makeCode(len: number): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}
