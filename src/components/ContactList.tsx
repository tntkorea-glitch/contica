'use client';

import { Contact } from '@/lib/supabase';

interface ContactListProps {
  contacts: Contact[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (contact: Contact) => void;
  onToggleFavorite: (id: string, current: boolean) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAllToggle: () => void;
  allSelected: boolean;
}

function getInitials(contact: Contact): string {
  const last = contact.last_name || '';
  const first = contact.first_name || '';
  if (last) return last[0];
  if (first) return first[0];
  return '?';
}

function getFullName(contact: Contact): string {
  return [contact.last_name, contact.first_name].filter(Boolean).join(' ') || '이름 없음';
}

function getInitialColor(name: string): string {
  const colors = [
    'bg-indigo-500', 'bg-pink-500', 'bg-amber-500', 'bg-emerald-500',
    'bg-blue-500', 'bg-purple-500', 'bg-red-500', 'bg-teal-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function ContactList({
  contacts, loading, selectedId, onSelect,
  onToggleFavorite, selectedIds, onToggleSelect,
  onSelectAllToggle, allSelected,
}: ContactListProps) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500">연락처 불러오는 중...</span>
        </div>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-gray-500 text-sm">연락처가 없습니다</p>
          <p className="text-gray-400 text-xs mt-1">새 연락처를 추가해보세요</p>
        </div>
      </div>
    );
  }

  // 이름 초성별 그룹화
  const grouped = groupByInitial(contacts);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* 헤더 체크박스 */}
      <div className="sticky top-0 bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-3">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={onSelectAllToggle}
          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-xs text-gray-500">{contacts.length}명의 연락처</span>
      </div>

      {grouped.map(({ label, items }) => (
        <div key={label}>
          <div className="sticky top-[37px] bg-gray-50 px-4 py-1.5 border-b border-gray-100">
            <span className="text-xs font-bold text-gray-400">{label}</span>
          </div>
          {items.map(contact => (
            <div
              key={contact.id}
              onClick={() => onSelect(contact)}
              className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 cursor-pointer transition-colors hover:bg-blue-50 ${
                selectedId === contact.id ? 'bg-indigo-50' : ''
              }`}
            >
              {/* 체크박스 */}
              <input
                type="checkbox"
                checked={selectedIds.has(contact.id)}
                onChange={e => {
                  e.stopPropagation();
                  onToggleSelect(contact.id);
                }}
                onClick={e => e.stopPropagation()}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />

              {/* 아바타 */}
              {contact.profile_image ? (
                <img src={contact.profile_image} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className={`w-10 h-10 rounded-full ${getInitialColor(getFullName(contact))} flex items-center justify-center text-white font-medium text-sm`}>
                  {getInitials(contact)}
                </div>
              )}

              {/* 이름 + 정보 */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900 truncate">
                  {getFullName(contact)}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {[contact.phone, contact.company].filter(Boolean).join(' | ')}
                </div>
              </div>

              {/* 즐겨찾기 */}
              <button
                onClick={e => {
                  e.stopPropagation();
                  onToggleFavorite(contact.id, contact.favorite);
                }}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg
                  className={`w-5 h-5 ${contact.favorite ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                  fill={contact.favorite ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function groupByInitial(contacts: Contact[]) {
  const map = new Map<string, Contact[]>();

  for (const c of contacts) {
    const name = c.last_name || c.first_name || '';
    const first = name[0] || '#';
    // 한글 초성 추출
    const label = getKoreanInitial(first);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(c);
  }

  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

function getKoreanInitial(char: string): string {
  const code = char.charCodeAt(0);
  // 한글 유니코드 범위
  if (code >= 0xAC00 && code <= 0xD7A3) {
    const initials = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
    const index = Math.floor((code - 0xAC00) / 588);
    return initials[index];
  }
  // 영어
  if (/[a-zA-Z]/.test(char)) return char.toUpperCase();
  return '#';
}
