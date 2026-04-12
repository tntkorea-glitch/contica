'use client';

import { Group } from '@/lib/supabase';
import { useState } from 'react';

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
}

const GROUP_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#6b7280',
];

export default function Sidebar({
  groups, selectedGroup, onSelectGroup, onSelectAll,
  onSelectFavorites, showFavorites, totalContacts,
  onCreateGroup, onDeleteGroup,
}: SidebarProps) {
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#6366f1');

  const handleCreate = () => {
    if (newGroupName.trim()) {
      onCreateGroup(newGroupName.trim(), newGroupColor);
      setNewGroupName('');
      setShowNewGroup(false);
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* 로고 */}
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          주소록
        </h1>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto p-2">
        {/* 전체 연락처 */}
        <button
          onClick={onSelectAll}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
            !selectedGroup && !showFavorites
              ? 'bg-indigo-50 text-indigo-700 font-medium'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
          <span>전체 연락처</span>
          <span className="ml-auto text-xs text-gray-400">{totalContacts}</span>
        </button>

        {/* 즐겨찾기 */}
        <button
          onClick={onSelectFavorites}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
            showFavorites
              ? 'bg-indigo-50 text-indigo-700 font-medium'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <svg className="w-5 h-5" fill={showFavorites ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <span>즐겨찾기</span>
        </button>

        {/* 그룹 헤더 */}
        <div className="flex items-center justify-between px-3 py-2 mt-4">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">그룹</span>
          <button
            onClick={() => setShowNewGroup(true)}
            className="text-gray-400 hover:text-indigo-600 transition-colors"
            title="그룹 추가"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* 새 그룹 입력 */}
        {showNewGroup && (
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
      </nav>

      {/* 하단 동기화 상태 */}
      <div className="p-3 border-t border-gray-200">
        <div className="flex items-center gap-2 text-xs text-green-600">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          실시간 동기화 활성
        </div>
      </div>
    </aside>
  );
}
