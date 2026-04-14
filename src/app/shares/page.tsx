'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGroups } from '@/hooks/useGroups';
import AuthGuard from '@/components/auth/AuthGuard';
import Link from 'next/link';

export default function SharesPage() {
  return (
    <AuthGuard>
      <SharesInner />
    </AuthGuard>
  );
}

interface Member {
  id: string;
  main_user_id: string;
  member_user_id: string;
  scope: 'all' | 'groups';
  created_at: string;
  revoked_at: string | null;
  member_label: string | null;
  main_label: string | null;
  groups: { id: string; name: string; color: string }[];
}

function SharesInner() {
  const { getAccessToken } = useAuth();
  const { groups } = useGroups();

  const [members, setMembers] = useState<Member[]>([]);
  const [linkedMains, setLinkedMains] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // 코드 발급 UI 상태
  const [scope, setScope] = useState<'all' | 'groups'>('all');
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [issuing, setIssuing] = useState(false);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [issuedExpiresAt, setIssuedExpiresAt] = useState<string | null>(null);
  const [memberLabelInput, setMemberLabelInput] = useState('');

  // 코드 redeem UI 상태
  const [redeemCode, setRedeemCode] = useState('');
  const [mainLabelInput, setMainLabelInput] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const authFetch = useCallback(async (url: string, opts: RequestInit = {}) => {
    const token = await getAccessToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as Record<string, string> || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(url, { ...opts, headers });
  }, [getAccessToken]);

  const reload = useCallback(async () => {
    setLoading(true);
    const [a, b] = await Promise.all([
      authFetch('/api/v1/shares/members?as=main').then(r => r.json()),
      authFetch('/api/v1/shares/members?as=member').then(r => r.json()),
    ]);
    setMembers(a?.data ?? []);
    setLinkedMains(b?.data ?? []);
    setLoading(false);
  }, [authFetch]);

  useEffect(() => { reload(); }, [reload]);

  const handleIssue = async () => {
    setIssuing(true);
    setIssuedCode(null);
    try {
      const body = {
        scope,
        group_ids: scope === 'groups' ? [...selectedGroupIds] : undefined,
        member_label: memberLabelInput.trim() || undefined,
      };
      const res = await authFetch('/api/v1/shares/invitation', {
        method: 'POST', body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || '코드 발급 실패');
      setIssuedCode(json.data.code);
      setIssuedExpiresAt(json.data.expires_at);
    } catch (e) {
      alert(e instanceof Error ? e.message : '오류');
    } finally {
      setIssuing(false);
    }
  };

  const handleRevoke = async (shareId: string) => {
    if (!confirm('이 서브 기기의 접근을 끊으시겠습니까?')) return;
    await authFetch(`/api/v1/shares/members?share_id=${shareId}`, { method: 'DELETE' });
    reload();
  };

  const handleRedeem = async () => {
    const code = redeemCode.trim().toUpperCase();
    if (!code) return;
    setRedeeming(true);
    setRedeemMsg(null);
    try {
      const res = await authFetch('/api/v1/shares/redeem', {
        method: 'POST',
        body: JSON.stringify({ code, main_label: mainLabelInput.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || '연결 실패');
      setRedeemMsg({ kind: 'ok', text: '연결 성공! 잠시 후 메인 계정의 데이터가 보입니다.' });
      setRedeemCode('');
      setMainLabelInput('');
      reload();
    } catch (e) {
      setRedeemMsg({ kind: 'err', text: e instanceof Error ? e.message : '오류' });
    } finally {
      setRedeeming(false);
    }
  };

  const toggleGroup = (id: string) => {
    setSelectedGroupIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <Link href="/" className="text-gray-400 hover:text-gray-700">←</Link>
        <h1 className="text-lg font-bold text-gray-900">서브 기기 관리</h1>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-8">
        {/* 섹션 1: 서브 기기 초대 (메인 역할) */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">내 다른 기기 초대</h2>
          <p className="text-sm text-gray-500 mb-5">
            다른 구글 계정으로 로그인된 기기에서 내 연락처를 동기화하도록 허용합니다.
            코드를 발급해 그 기기에서 "코드 입력"에 넣으세요.
          </p>

          {/* 범위 선택 */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setScope('all')}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${scope === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              전체 공유 (읽기/쓰기)
            </button>
            <button
              onClick={() => setScope('groups')}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${scope === 'groups' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              그룹 선택 (읽기만)
            </button>
          </div>

          {scope === 'groups' && (
            <div className="mb-4 max-h-52 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-1">
              {groups.length === 0 && <p className="text-xs text-gray-400">그룹이 없습니다.</p>}
              {groups.map(g => (
                <label key={g.id} className="flex items-center gap-2 cursor-pointer py-1">
                  <input type="checkbox" checked={selectedGroupIds.has(g.id)} onChange={() => toggleGroup(g.id)} className="accent-indigo-600" />
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                  <span className="text-sm text-gray-700">{g.name}</span>
                </label>
              ))}
            </div>
          )}

          <input
            type="text"
            value={memberLabelInput}
            onChange={e => setMemberLabelInput(e.target.value.slice(0, 50))}
            placeholder="이 기기 이름 (예: 업무폰, 집 컴퓨터, 아내 폰)"
            maxLength={50}
            className="w-full mb-3 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <button
            onClick={handleIssue}
            disabled={issuing || (scope === 'groups' && selectedGroupIds.size === 0)}
            className="w-full px-4 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {issuing ? '발급 중...' : '초대 코드 발급'}
          </button>

          {issuedCode && (
            <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg text-center">
              <div className="text-xs text-indigo-600 mb-1">초대 코드 (10분 유효)</div>
              <div className="text-3xl font-mono font-bold tracking-widest text-indigo-900 select-all">{issuedCode}</div>
              {issuedExpiresAt && (
                <div className="text-[11px] text-indigo-500 mt-2">만료: {new Date(issuedExpiresAt).toLocaleTimeString('ko-KR')}</div>
              )}
            </div>
          )}

          {/* 연결된 서브 기기 목록 */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">현재 연결된 기기</h3>
            {loading ? (
              <p className="text-xs text-gray-400">로딩 중...</p>
            ) : members.filter(m => !m.revoked_at).length === 0 ? (
              <p className="text-xs text-gray-400">아직 연결된 기기가 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {members.filter(m => !m.revoked_at).map(m => (
                  <li key={m.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-800 truncate">{m.member_label || '이름 없음'}</div>
                      <div className="text-[11px] text-gray-500">
                        {m.scope === 'all' ? '전체 공유' : `그룹 공유 (${m.groups.length}개)`}
                        {m.scope === 'groups' && m.groups.length > 0 && ` — ${m.groups.map(g => g.name).join(', ')}`}
                      </div>
                    </div>
                    <button onClick={() => handleRevoke(m.id)} className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded-md">해제</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* 섹션 2: 코드 입력 (서브 역할) */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">메인 계정 연결</h2>
          <p className="text-sm text-gray-500 mb-5">
            메인 계정에서 발급한 초대 코드를 입력하면 그 계정의 연락처가 이 기기에 동기화됩니다.
          </p>

          <input
            type="text"
            value={mainLabelInput}
            onChange={e => setMainLabelInput(e.target.value.slice(0, 50))}
            placeholder="메인 계정에 붙일 별명 (예: 내 메인, 회사 계정)"
            maxLength={50}
            className="w-full mb-3 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={redeemCode}
              onChange={e => setRedeemCode(e.target.value.toUpperCase())}
              placeholder="초대 코드 6자리"
              maxLength={6}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleRedeem}
              disabled={redeeming || redeemCode.length !== 6}
              className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:bg-gray-300"
            >
              {redeeming ? '연결 중...' : '연결'}
            </button>
          </div>

          {redeemMsg && (
            <div className={`mt-3 px-3 py-2 text-sm rounded-lg ${redeemMsg.kind === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
              {redeemMsg.text}
            </div>
          )}

          {/* 연결된 메인 목록 */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">연결된 메인 계정</h3>
            {loading ? (
              <p className="text-xs text-gray-400">로딩 중...</p>
            ) : linkedMains.filter(m => !m.revoked_at).length === 0 ? (
              <p className="text-xs text-gray-400">아직 연결된 메인 계정이 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {linkedMains.filter(m => !m.revoked_at).map(m => (
                  <li key={m.id} className="px-3 py-2 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-800 truncate">{m.main_label || '이름 없음'}</div>
                    <div className="text-[11px] text-gray-500">
                      {m.scope === 'all' ? '전체 공유 받음' : `그룹 공유 받음 (${m.groups.length}개)`}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
