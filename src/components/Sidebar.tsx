'use client';

import { Group } from '@/lib/supabase';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

interface SidebarProps {
  groups: Group[];
  selectedGroup: string;
  onSelectGroup: (id: string) => void;
  onSelectAll: () => void;
  onSelectFavorites: () => void;
  showFavorites: boolean;
  totalContacts: number;
  onCreateGroup: (name: string, color: string) => void;
  onDeleteGroup: (id: string) => void;
  // 새 기능
  onSelectTrash?: () => void;
  showTrash?: boolean;
  onSelectNoName?: () => void;
  showNoName?: boolean;
  onOpenSettings?: () => void;
  onOpenImport?: () => void;
  onOpenExport?: () => void;
  onOpenDuplicates?: () => void;
  onCreateContact?: () => void;
  onSelectRecent?: () => void;
  showRecent?: boolean;
}

const GROUP_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#6b7280',
];

export default function Sidebar({
  groups, selectedGroup, onSelectGroup, onSelectAll,
  onSelectFavorites, showFavorites, totalContacts,
  onCreateGroup, onDeleteGroup,
  onSelectTrash, showTrash,
  onSelectNoName, showNoName,
  onOpenSettings, onOpenImport, onOpenExport, onOpenDuplicates,
  onCreateContact, onSelectRecent, showRecent,
}: SidebarProps) {
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#6366f1');
  const [groupsOpen, setGroupsOpen] = useState(true);
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    if (!confirm('로그아웃 하시겠습니까?')) return;
    await signOut();
    router.replace('/login');
  };

  const handleCreate = () => {
    if (newGroupName.trim()) {
      onCreateGroup(newGroupName.trim(), newGroupColor);
      setNewGroupName('');
      setShowNewGroup(false);
    }
  };

  const navBtn = (active: boolean) =>
    `w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
      active ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
    }`;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 로고 — 클릭 시 홈(전체 연락처)으로 */}
      <button
        onClick={onSelectAll}
        className="px-4 py-3 border-b border-gray-200 flex items-center gap-2 hover:bg-gray-50 transition-colors text-left"
        title="홈으로"
      >
        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <h1 className="text-lg font-bold text-gray-800">주소록</h1>
      </button>

      {/* 빠른 액션: 연락처 추가 / 그룹 추가 */}
      <div className="px-3 pt-3 pb-2 grid grid-cols-2 gap-2">
        <button
          onClick={onCreateContact}
          className="px-3 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          연락처 추가
        </button>
        <button
          onClick={() => setShowNewGroup(true)}
          className="px-3 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          그룹 추가
        </button>
      </div>

      {/* 빠른 탭: 최근등록 / 즐겨찾기 */}
      <div className="px-3 pb-2 grid grid-cols-2 gap-1 text-xs">
        <button
          onClick={onSelectRecent}
          className={`flex flex-col items-center gap-1 py-2 rounded-lg transition-colors ${showRecent ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>최근등록</span>
        </button>
        <button
          onClick={onSelectFavorites}
          className={`flex flex-col items-center gap-1 py-2 rounded-lg transition-colors ${showFavorites ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          <svg className="w-4 h-4" fill={showFavorites ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <span>즐겨찾기</span>
        </button>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 border-t border-gray-100 pt-2">
        {/* 전체 연락처 */}
        <button onClick={onSelectAll} className={navBtn(!selectedGroup && !showFavorites && !showTrash && !showNoName && !showRecent)}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
          <span>전체 연락처</span>
          <span className="ml-auto text-xs text-gray-400">{totalContacts}</span>
        </button>

        {/* 휴지통 */}
        <button onClick={onSelectTrash} className={navBtn(showTrash === true)}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span>휴지통</span>
        </button>

        {/* 이름없는 연락처 */}
        <button onClick={onSelectNoName} className={navBtn(showNoName === true)}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>이름없는 연락처</span>
        </button>

        {/* 구분선 */}
        <div className="border-t border-gray-200 my-2" />

        {/* 그룹 헤더 — 클릭으로 폴딩 */}
        <div className="flex items-center justify-between px-3 py-2">
          <button
            onClick={() => setGroupsOpen(v => !v)}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
          >
            <svg className={`w-3 h-3 transition-transform ${groupsOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
            <span>내 주소록</span>
            <span className="text-gray-300">({groups.length})</span>
          </button>
          <button
            onClick={() => { setShowNewGroup(true); setGroupsOpen(true); }}
            className="text-gray-400 hover:text-indigo-600 transition-colors"
            title="그룹 추가"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* 새 그룹 입력 */}
        {groupsOpen && showNewGroup && (
          <div className="px-3 py-2 space-y-2">
            <input
              type="text"
              placeholder="그룹 이름"
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            <div className="flex gap-1 flex-wrap">
              {GROUP_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setNewGroupColor(color)}
                  className={`w-5 h-5 rounded-full border-2 ${newGroupColor === color ? 'border-gray-800' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={handleCreate} className="text-xs px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">추가</button>
              <button onClick={() => setShowNewGroup(false)} className="text-xs px-3 py-1 text-gray-500 hover:text-gray-700">취소</button>
            </div>
          </div>
        )}

        {/* 그룹 목록 */}
        <div className="space-y-0.5">
          {groups.map(group => (
            <div key={group.id} className="group flex items-center">
              <button
                onClick={() => onSelectGroup(group.id)}
                className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedGroup === group.id
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />
                <span className="truncate">{group.name}</span>
                <span className="ml-auto text-xs text-gray-400">{group.contact_count || 0}</span>
              </button>
              <button
                onClick={() => onDeleteGroup(group.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                title="그룹 삭제"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* 구분선 */}
        <div className="border-t border-gray-200 my-2" />

        {/* 하단 유틸 메뉴 */}
        <button onClick={onOpenImport} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          <span>연락처 불러오기</span>
        </button>
        <button onClick={onOpenExport} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          <span>연락처 저장 · 내보내기</span>
        </button>
        <button onClick={onOpenDuplicates} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          <span>중복연락처 정리하기</span>
        </button>
        <a href="/shares" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg>
          <span>서브 기기 관리</span>
        </a>
      </nav>

      {/* 하단 */}
      <div className="p-3 border-t border-gray-200 space-y-1">
        {user?.email && (
          <div className="px-2 text-[11px] text-gray-500 truncate" title={user.email}>{user.email}</div>
        )}
        <div className="flex gap-1">
          <button onClick={onOpenSettings} className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            환경설정
          </button>
          <button onClick={handleSignOut} className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-red-50 hover:text-red-600" title="로그아웃">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            로그아웃
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-green-600 px-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          실시간 동기화 활성
        </div>
      </div>
    </div>
  );
}
