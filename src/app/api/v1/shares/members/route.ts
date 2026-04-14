import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { apiError, apiSuccess, ErrorCodes } from '@/lib/errors';

// GET /api/v1/shares/members — 메인 계정이 공유한 서브 목록 / 서브 계정이 연결된 메인
// ?as=main (기본) | member
export async function GET(request: NextRequest) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const as = request.nextUrl.searchParams.get('as') === 'member' ? 'member' : 'main';
  const col = as === 'main' ? 'main_user_id' : 'member_user_id';

  const { data: shares, error: dbError } = await supabase
    .from('user_shares')
    .select('id, main_user_id, member_user_id, scope, created_at, revoked_at')
    .eq(col, user!.id)
    .order('created_at', { ascending: false });

  if (dbError) return apiError(ErrorCodes.INTERNAL, dbError.message);
  if (!shares || shares.length === 0) return apiSuccess([]);

  // share별로 공유된 group 정보 (scope=groups인 경우만)
  const shareIds = shares.filter(s => s.scope === 'groups').map(s => s.id);
  let groupMap: Record<string, { id: string; name: string; color: string }[]> = {};

  if (shareIds.length > 0) {
    const { data: usg } = await supabase
      .from('user_share_groups')
      .select('share_id, group_id, groups:group_id(id, name, color)')
      .in('share_id', shareIds);

    if (usg) {
      for (const row of usg as unknown as { share_id: string; groups: { id: string; name: string; color: string } | null }[]) {
        if (!row.groups) continue;
        if (!groupMap[row.share_id]) groupMap[row.share_id] = [];
        groupMap[row.share_id].push(row.groups);
      }
    }
  }

  const result = shares.map(s => ({
    ...s,
    groups: groupMap[s.id] ?? [],
  }));

  return apiSuccess(result);
}

// DELETE /api/v1/shares/members?share_id=xxx — 메인이 서브 revoke
export async function DELETE(request: NextRequest) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const shareId = request.nextUrl.searchParams.get('share_id');
  if (!shareId) return apiError(ErrorCodes.VALIDATION, 'share_id가 필요합니다');

  const { error: dbError } = await supabase
    .from('user_shares')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', shareId)
    .eq('main_user_id', user!.id);

  if (dbError) return apiError(ErrorCodes.INTERNAL, dbError.message);
  return apiSuccess({ ok: true });
}
