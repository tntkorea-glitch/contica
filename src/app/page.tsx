'use client';

import { useState, useRef } from 'react';
import { Contact } from '@/lib/supabase';
import { useContacts } from '@/hooks/useContacts';
import { useGroups } from '@/hooks/useGroups';
import Sidebar from '@/components/Sidebar';
import ContactList from '@/components/ContactList';
import ContactDetail from '@/components/ContactDetail';
import ContactForm from '@/components/ContactForm';

export default function Home() {
  // 필터 상태
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortField, setSortField] = useState('last_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [showFavorites, setShowFavorites] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  // UI 상태
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showImport, setShowImport] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<Contact[][]>([]);

  // 데이터
  const { contacts, total, loading, fetchContacts, toggleFavorite, deleteContact } = useContacts({
    page, limit: 30, sortField, sortDirection, search, groupId: selectedGroup,
    favoriteOnly: showFavorites,
  });
  const { groups, createGroup, deleteGroup, fetchGroups } = useGroups();

  // 검색 디바운스
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 300);
  };

  // 연락처 저장
  const handleSave = async (data: Partial<Contact> & { groups?: string[] }) => {
    if (editingContact) {
      await fetch(`/api/contacts/${editingContact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } else {
      await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    }
    setShowForm(false);
    setEditingContact(null);
    fetchContacts();
    fetchGroups();
  };

  // 삭제
  const handleDelete = async (id: string) => {
    await deleteContact(id);
    if (selectedContact?.id === id) setSelectedContact(null);
  };

  // 일괄 삭제
  const handleBulkDelete = async () => {
    if (!confirm(`${selectedIds.size}개의 연락처를 삭제하시겠습니까?`)) return;
    for (const id of selectedIds) {
      await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
    }
    setSelectedIds(new Set());
    setSelectedContact(null);
    fetchContacts();
  };

  // vCard 내보내기
  const handleExport = async () => {
    const ids = selectedIds.size > 0 ? Array.from(selectedIds).join(',') : '';
    const url = ids ? `/api/contacts/export?ids=${ids}` : '/api/contacts/export';
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `contacts_${new Date().toISOString().slice(0, 10)}.vcf`;
    a.click();
  };

  // vCard 가져오기
  const handleImport = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/contacts/import', { method: 'POST', body: formData });
    const data = await res.json();
    alert(`${data.imported || 0}개의 연락처를 가져왔습니다.`);
    setShowImport(false);
    fetchContacts();
  };

  // 중복 감지
  const handleCheckDuplicates = async () => {
    const res = await fetch('/api/contacts/duplicates');
    const data = await res.json();
    setDuplicateGroups(data);
    setShowDuplicates(true);
  };

  // 중복 병합
  const handleMerge = async (contactIds: string[], primaryId: string) => {
    await fetch('/api/contacts/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactIds, primaryId }),
    });
    handleCheckDuplicates();
    fetchContacts();
  };

  // 체크박스
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map(c => c.id)));
    }
  };

  const totalPages = Math.ceil(total / 30);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* 사이드바 */}
      <Sidebar
        groups={groups}
        selectedGroup={selectedGroup}
        onSelectGroup={id => { setSelectedGroup(id); setShowFavorites(false); setPage(1); }}
        onSelectAll={() => { setSelectedGroup(''); setShowFavorites(false); setPage(1); }}
        onSelectFavorites={() => { setShowFavorites(true); setSelectedGroup(''); setPage(1); }}
        showFavorites={showFavorites}
        totalContacts={total}
        onCreateGroup={createGroup}
        onDeleteGroup={deleteGroup}
      />

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 상단 툴바 */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          {/* 검색 */}
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="이름, 전화번호, 이메일 검색..."
              value={searchInput}
              onChange={e => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent text-sm"
            />
          </div>

          {/* 정렬 */}
          <select
            value={`${sortField}-${sortDirection}`}
            onChange={e => {
              const [f, d] = e.target.value.split('-');
              setSortField(f);
              setSortDirection(d as 'asc' | 'desc');
            }}
            className="px-3 py-2 bg-gray-100 border-0 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="last_name-asc">이름순</option>
            <option value="last_name-desc">이름 역순</option>
            <option value="created_at-desc">최근 추가순</option>
            <option value="updated_at-desc">최근 수정순</option>
            <option value="company-asc">회사순</option>
          </select>

          {/* 액션 버튼 */}
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <>
                <span className="text-xs text-gray-500">{selectedIds.size}개 선택</span>
                <button onClick={handleBulkDelete} className="px-3 py-2 text-xs text-red-600 bg-red-50 rounded-lg hover:bg-red-100">삭제</button>
              </>
            )}

            <button
              onClick={() => { setEditingContact(null); setShowForm(true); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              추가
            </button>

            {/* 더보기 메뉴 */}
            <MoreMenu
              onExport={handleExport}
              onImport={() => setShowImport(true)}
              onCheckDuplicates={handleCheckDuplicates}
            />
          </div>
        </header>

        {/* 본문 */}
        <div className="flex-1 flex min-h-0">
          {/* 연락처 리스트 */}
          <div className="w-[400px] border-r border-gray-200 flex flex-col bg-white">
            <ContactList
              contacts={contacts}
              loading={loading}
              selectedId={selectedContact?.id || null}
              onSelect={setSelectedContact}
              onToggleFavorite={toggleFavorite}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onSelectAllToggle={toggleSelectAll}
              allSelected={contacts.length > 0 && selectedIds.size === contacts.length}
            />

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="border-t border-gray-200 px-4 py-2 flex items-center justify-between bg-white">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30"
                >
                  이전
                </button>
                <span className="text-xs text-gray-500">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30"
                >
                  다음
                </button>
              </div>
            )}
          </div>

          {/* 상세보기 */}
          <ContactDetail
            contact={selectedContact}
            onEdit={() => {
              if (selectedContact) {
                setEditingContact(selectedContact);
                setShowForm(true);
              }
            }}
            onDelete={handleDelete}
            onClose={() => setSelectedContact(null)}
          />
        </div>
      </div>

      {/* 연락처 추가/수정 모달 */}
      {showForm && (
        <ContactForm
          contact={editingContact}
          groups={groups}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingContact(null); }}
        />
      )}

      {/* 가져오기 모달 */}
      {showImport && (
        <ImportModal
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* 중복 감지 모달 */}
      {showDuplicates && (
        <DuplicatesModal
          groups={duplicateGroups}
          onMerge={handleMerge}
          onClose={() => setShowDuplicates(false)}
        />
      )}
    </div>
  );
}

// 더보기 메뉴
function MoreMenu({ onExport, onImport, onCheckDuplicates }: {
  onExport: () => void;
  onImport: () => void;
  onCheckDuplicates: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-48 z-20">
            <button onClick={() => { onImport(); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              vCard 가져오기
            </button>
            <button onClick={() => { onExport(); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              vCard 내보내기
            </button>
            <div className="border-t border-gray-100 my-1" />
            <button onClick={() => { onCheckDuplicates(); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              중복 연락처 확인
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// 가져오기 모달
function ImportModal({ onImport, onClose }: { onImport: (file: File) => void; onClose: () => void }) {
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImport(file);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">vCard 가져오기</h2>
        <p className="text-sm text-gray-500 mb-4">
          .vcf 파일을 선택하면 연락처를 자동으로 가져옵니다.
          스마트폰 연락처를 vCard(.vcf)로 내보낸 후 여기서 가져올 수 있습니다.
        </p>
        <label className="block w-full p-8 border-2 border-dashed border-gray-300 rounded-xl text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-colors">
          <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span className="text-sm text-gray-600">.vcf 파일 선택</span>
          <input type="file" accept=".vcf" onChange={handleFile} className="hidden" />
        </label>
        <button onClick={onClose} className="mt-4 w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
          닫기
        </button>
      </div>
    </div>
  );
}

// 중복 감지 모달
function DuplicatesModal({ groups, onMerge, onClose }: {
  groups: Contact[][];
  onMerge: (ids: string[], primaryId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-800">
            중복 연락처 ({groups.length}그룹)
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {groups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>중복된 연락처가 없습니다!</p>
            </div>
          ) : (
            groups.map((group, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">
                    {group.length}개의 중복 연락처
                  </span>
                  <button
                    onClick={() => onMerge(group.map(c => c.id), group[0].id)}
                    className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    첫 번째로 병합
                  </button>
                </div>
                {group.map(c => (
                  <div key={c.id} className="flex items-center gap-3 py-2 border-t border-gray-100">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                      {(c.last_name || c.first_name || '?')[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800">
                        {[c.last_name, c.first_name].filter(Boolean).join(' ') || '이름 없음'}
                      </div>
                      <div className="text-xs text-gray-500">{c.phone} {c.email ? `| ${c.email}` : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
