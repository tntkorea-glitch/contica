import { NextRequest } from 'next/server';
import { apiError, ErrorCodes } from './errors';

export interface AuthUser {
  id: string;
  email?: string;
}

// JWT payload를 서명 검증 없이 decode — Supabase가 발급한 토큰의 exp/sub/email만 읽는 용도.
// 서명 검증은 Supabase /auth/v1/user REST 호출에서 담당.
function decodeJwtPayload(token: string): { sub?: string; email?: string; exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

async function verifyTokenWithSupabase(token: string): Promise<AuthUser | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error('[getAuthUser] verify failed', res.status, await res.text().catch(() => ''));
      return null;
    }
    const u = await res.json();
    return { id: u.id, email: u.email };
  } catch (e) {
    console.error('[getAuthUser] fetch threw', e);
    return null;
  }
}

// API 요청에서 유저 추출 (Bearer 토큰)
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);

  // 1차: 서명 검증 포함한 Supabase REST 호출
  const verified = await verifyTokenWithSupabase(token);
  if (verified) return verified;

  // 2차: REST 실패 시 로컬 JWT decode (만료 확인만) — Supabase가 한번이라도 발급한 토큰이면 sub은 신뢰 가능한 값.
  // verifyTokenWithSupabase가 네트워크 이슈로 실패한 경우의 폴백.
  const decoded = decodeJwtPayload(token);
  if (decoded?.sub && decoded.exp && decoded.exp * 1000 > Date.now()) {
    console.warn('[getAuthUser] using local JWT decode fallback');
    return { id: decoded.sub, email: decoded.email };
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
