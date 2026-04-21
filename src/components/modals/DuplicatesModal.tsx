'use client';

import { useEffect, useState } from 'react';
import type { Contact } from '@/lib/types';

type Mode = 'exact' | 'similar';

export default function DuplicatesModal({ onMerge, onClose, onFetch, autoStart }: {
  onMerge: (ids: string[], primaryId: string) => Promise<void> | void;
  onClose: () => void;
  onFetch: (mode: Mode) => Promise<Contact[][]>;
  autoStart?: boolean;
}) {
  const [mode, setMode] = useState<Mode>('exact');
  const [groups, setGroups] = useState<Contact[][]>([]);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [merging, setMerging] = useState<string | null>(null);
  // per-group selection: map groupIndex -> { primary: contactId, merge: Set<contactId> }
  const [selection, setSelection] = useState<Record<number, { primary: string; merge: Set<string> }>>({});

  const handleStart = async (m: Mode) => {
    setMode(m);
    setLoading(true);
    setStarted(true);
    const result = await onFetch(m);
    setGroups(result);
    // 초기 선택값: 각 그룹의 첫 row를 primary로, 나머지 전부 merge 대상
    const init: Record<number, { primary: string; merge: Set<string> }> = {};
    result.forEach((group, i) => {
      init[i] = {
        primary: group[0].id,
        merge: new Set(group.slice(1).map(c => c.id)),
      };
    });
    setSelection(init);
    setLoading(false);
  };

  useEffect(() => {
    if (autoStart && !started) handleStart('exact');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  const setPrimary = (groupIdx: number, contactId: string) => {
    setSelection(prev => {
      const cur = prev[groupIdx] ?? { primary: contactId, merge: new Set() };
      // primary가 바뀌면 병합 대상에서 새 primary를 제외
      const nextMerge = new Set(cur.merge);
      nextMerge.delete(contactId);
      // 이전 primary는 자동으로 병합 대상 후보에 추가해둠 (사용자가 원하면 체크)
      if (cur.primary !== contactId) nextMerge.add(cur.primary);
      return { ...prev, [groupIdx]: { primary: contactId, merge: nextMerge } };
    });
  };

  const toggleMerge = (groupIdx: number, contactId: string) => {
    setSelection(prev => {
      const cur = prev[groupIdx];
      if (!cur) return prev;
      const next = new Set(cur.merge);
      if (next.has(contactId)) next.delete(contactId);
      else next.add(contactId);
      return { ...prev, [groupIdx]: { ...cur, merge: next } };
    });
  };

  const mergeSelected = async (groupIdx: number) => {
    const sel = selection[groupIdx];
    if (!sel) return;
    const mergeIds = [...sel.merge];
    if (!mergeIds.length) return;
    setMerging(`g${groupIdx}`);
    try {
      await onMerge([sel.primary, ...mergeIds], sel.primary);
      // 병합 성공한 그룹은 리스트에서 제거
      setGroups(prev => prev.filter((_, i) => i !== groupIdx));
      setSelection(prev => {
        const next: typeof prev = {};
        Object.entries(prev).forEach(([k, v]) => {
          const idx = Number(k);
          if (idx < groupIdx) next[idx] = v;
          else if (idx > groupIdx) next[idx - 1] = v;
        });
        return next;
      });
    } finally {
      setMerging(null);
    }
  };

  const mergeAllFirst = async (groupIdx: number) => {
    const group = groups[groupIdx];
    if (!group || group.length < 2) return;
    setMerging(`g${groupIdx}`);
    try {
      await onMerge(group.map(c => c.id), group[0].id);
      setGroups(prev => prev.filter((_, i) => i !== groupIdx));
      setSelection(prev => {
        const next: typeof prev = {};
        Object.entries(prev).forEach(([k, v]) => {
          const idx = Number(k);
          if (idx < groupIdx) next[idx] = v;
          else if (idx > groupIdx) next[idx - 1] = v;
        });
        return next;
      });
    } finally {
      setMerging(null);
    }
  };

  const modeColor = mode === 'exact' ? 'indigo' : 'teal';
  const primaryBg = mode === 'exact' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-teal-600 hover:bg-teal-700';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* 헤더 */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">중복연락처 정리</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full" aria-label="닫기">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 모드 선택 */}
        {!started ? (
          <div className="p-6 space-y-4">
            <button
              onClick={() => handleStart('exact')}
              className="w-full text-left p-5 border border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
            >
              <h3 className="text-base font-semibold text-indigo-600 mb-1">01. 중복 연락처 정리하기</h3>
              <p className="text-sm text-gray-500">이메일, 전화번호, 이름이 동일하게 등록된 연락처 목록을 확인 후 정리하세요.</p>
            </button>
            <button
              onClick={() => handleStart('similar')}
              className="w-full text-left p-5 border border-gray-200 rounded-xl hover:border-teal-300 hover:bg-teal-50 transition-colors"
            >
              <h3 className="text-base font-semibold text-teal-600 mb-1">02. 유사 연락처 정리</h3>
              <p className="text-sm text-gray-500">이메일 주소 영역, 유선전화번호, 이름이 유사하게 등록된 연락처를 확인 후 정리하세요.</p>
            </button>
            <p className="text-xs text-gray-400">
              * 전체 연락처가 1,000건을 초과할 경우에는 대표 정보에 대해서만 검사를 진행합니다.
            </p>
          </div>
        ) : (
          <>
            {/* 탭 */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => handleStart('exact')}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                  mode === 'exact' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                중복 연락처
              </button>
              <button
                onClick={() => handleStart('similar')}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                  mode === 'similar' ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                유사 연락처
              </button>
            </div>

            {/* 사용법 안내 */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
              각 그룹에서 <span className="font-semibold">◉ 기준</span>을 선택하고, <span className="font-semibold">☑ 합치기</span>에 체크한 연락처만 기준에 병합됩니다. 체크 해제한 항목은 따로 남겨둡니다.
            </div>

            {/* 결과 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loading ? (
                <div className="text-center py-12">
                  <div className={`w-8 h-8 border-3 border-${modeColor}-500 border-t-transparent rounded-full animate-spin mx-auto mb-3`} />
                  <p className="text-sm text-gray-500">검사 중...</p>
                </div>
              ) : groups.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="font-medium">{mode === 'exact' ? '중복된' : '유사한'} 연락처가 없습니다!</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-600">{groups.length}개 그룹 발견</p>
                  {groups.map((group, i) => {
                    const sel = selection[i];
                    const isMergingThis = merging === `g${i}`;
                    const checkedCount = sel?.merge.size ?? 0;
                    return (
                      <div key={group[0].id + ':' + i} className="border border-gray-200 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-700">
                            {group.length}개의 {mode === 'exact' ? '중복' : '유사'} 연락처
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => mergeAllFirst(i)}
                              disabled={isMergingThis}
                              className="px-2.5 py-1.5 text-xs text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                              title="라디오/체크박스 설정 무시하고 첫 번째를 기준으로 전부 병합"
                            >
                              전체 병합
                            </button>
                            <button
                              onClick={() => mergeSelected(i)}
                              disabled={isMergingThis || checkedCount === 0}
                              className={`px-3 py-1.5 text-xs text-white rounded-lg disabled:opacity-50 ${primaryBg}`}
                            >
                              {isMergingThis ? '병합 중...' : `선택 병합 (${checkedCount})`}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {group.map(c => {
                            const isPrimary = sel?.primary === c.id;
                            const isChecked = sel?.merge.has(c.id) ?? false;
                            return (
                              <div key={c.id} className={`flex items-center gap-3 py-2 px-2 rounded-lg border ${isPrimary ? (mode === 'exact' ? 'border-indigo-300 bg-indigo-50/50' : 'border-teal-300 bg-teal-50/50') : 'border-transparent'}`}>
                                {/* 라디오: primary 선택 */}
                                <label className="flex items-center cursor-pointer" title="기준 (이 연락처를 남기고 나머지를 합침)">
                                  <input
                                    type="radio"
                                    name={`primary-${i}`}
                                    checked={isPrimary}
                                    onChange={() => setPrimary(i, c.id)}
                                    className={`w-4 h-4 cursor-pointer accent-${modeColor}-600`}
                                  />
                                </label>
                                {/* 체크박스: 병합 대상. primary인 row는 비활성 */}
                                <label className="flex items-center cursor-pointer" title="이 연락처를 기준에 합치기">
                                  <input
                                    type="checkbox"
                                    checked={isPrimary ? false : isChecked}
                                    disabled={isPrimary}
                                    onChange={() => toggleMerge(i, c.id)}
                                    className={`w-4 h-4 cursor-pointer accent-${modeColor}-600 disabled:opacity-30`}
                                  />
                                </label>
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                                  {(c.last_name || c.first_name || '?')[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-800 truncate">
                                    {[c.last_name, c.first_name].filter(Boolean).join(' ') || '이름 없음'}
                                    {isPrimary && (
                                      <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${mode === 'exact' ? 'bg-indigo-600 text-white' : 'bg-teal-600 text-white'}`}>기준</span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate">
                                    {c.phone || '-'}
                                    {c.email ? ` | ${c.email}` : ''}
                                    {c.company ? ` | ${c.company}` : ''}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
