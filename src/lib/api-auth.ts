import { NextRequest } from 'next/server';
import { supabaseAdmin } from './supabase-server';
import { apiError, ErrorCodes } from './errors';

export interface AuthUser {
  id: string;
  email?: string;
}

// API 요청에서 유저 추출 (Bearer 토큰 또는 쿠키)
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  if (!supabaseAdmin) return null;

  // 1. Authorization 헤더에서 Bearer 토큰 확인
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && user) {
      return { id: user.id, email: user.email };
    }
  }

  // 2. 쿠키에서 세션 확인 (Supabase Auth 쿠키)
  const accessToken = request.cookies.get('sb-access-token')?.value;
  if (accessToken) {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (!error && user) {
      return { id: user.id, email: user.email };
    }
  }

  return null;
}

// 인증 필수 엔드포인트용 — 인증 실패시 401 반환
export async function requireAuth(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return { user: null, error: apiError(ErrorCodes.UNAUTHORIZED, '로그인이 필요합니다') };
  }
  return { user, error: null };
}
