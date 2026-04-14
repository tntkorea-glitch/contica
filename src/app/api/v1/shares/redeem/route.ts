import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { apiError, apiSuccess, ErrorCodes } from '@/lib/errors';

// POST /api/v1/shares/redeem — 서브 계정이 초대 코드로 연결
// body: { code: string }
export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  // 요청 본문을 한 번만 파싱하기 위해 미리 읽음 — 아래에서 body 재사용
  const raw = await request.text();
  const body = raw ? JSON.parse(raw) : {};
  const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : '';
  if (!code) return apiError(ErrorCodes.VALIDATION, 'code가 필요합니다');

  // 코드 조회 (service_role로 우회 — RLS 적용 시 서브는 자기 아닌 main의 코드 조회 불가)
  const { data: inv, error: invErr } = await supabase
    .from('invitation_codes')
    .select('*')
    .eq('code', code)
    .maybeSingle();

  if (invErr) return apiError(ErrorCodes.INTERNAL, invErr.message);
  if (!inv) return apiError(ErrorCodes.NOT_FOUND, '유효하지 않은 코드입니다');
  if (inv.used_at) return apiError(ErrorCodes.CONFLICT, '이미 사용된 코드입니다');
  if (new Date(inv.expires_at) < new Date()) return apiError(ErrorCodes.VALIDATION, '만료된 코드입니다');
  if (inv.main_user_id === user!.id) return apiError(ErrorCodes.VALIDATION, '자기 계정에는 연결할 수 없습니다');

  // 기존 share upsert
  const { data: existing } = await supabase
    .from('user_shares')
    .select('id')
    .eq('main_user_id', inv.main_user_id)
    .eq('member_user_id', user!.id)
    .maybeSingle();

  const body = await request.json().catch(() => ({}));
  const mainLabelInput: string | null = typeof body?.main_label === 'string' && body.main_label.trim()
    ? body.main_label.trim().slice(0, 50)
    : null;

  let shareId: string;
  if (existing) {
    const { error: upErr } = await supabase
      .from('user_shares')
      .update({
        scope: inv.scope,
        revoked_at: null,
        member_label: inv.member_label ?? undefined,
        main_label: mainLabelInput ?? undefined,
      })
      .eq('id', existing.id);
    if (upErr) return apiError(ErrorCodes.INTERNAL, upErr.message);
    shareId = existing.id;
    await supabase.from('user_share_groups').delete().eq('share_id', shareId);
  } else {
    const { data: ins, error: insErr } = await supabase
      .from('user_shares')
      .insert({
        main_user_id: inv.main_user_id,
        member_user_id: user!.id,
        scope: inv.scope,
        member_label: inv.member_label,
        main_label: mainLabelInput,
      })
      .select('id')
      .single();
    if (insErr) return apiError(ErrorCodes.INTERNAL, insErr.message);
    shareId = ins.id;
  }

  if (inv.scope === 'groups' && Array.isArray(inv.group_ids) && inv.group_ids.length > 0) {
    await supabase
      .from('user_share_groups')
      .insert(inv.group_ids.map((gid: string) => ({ share_id: shareId, group_id: gid })));
  }

  // 코드 사용 처리
  await supabase
    .from('invitation_codes')
    .update({ used_at: new Date().toISOString(), used_by: user!.id })
    .eq('code', code);

  return apiSuccess({ main_user_id: inv.main_user_id, scope: inv.scope });
}
