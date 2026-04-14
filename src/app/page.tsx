'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { Contact } from '@/lib/types';
import { useContacts } from '@/hooks/useContacts';
import { useGroups } from '@/hooks/useGroups';
import { useAuth } from '@/hooks/useAuth';
import AuthGuard from '@/components/auth/AuthGuard';
import Sidebar from '@/components/Sidebar';
import ContactList from '@/components/ContactList';
import ContactDetail from '@/components/ContactDetail';
import ContactForm from '@/components/ContactForm';
import MoreMenu from '@/components/modals/MoreMenu';
import ImportModal from '@/components/modals/ImportModal';
import DuplicatesModal from '@/components/modals/DuplicatesModal';
import ExportModal from '@/components/modals/ExportModal';
import SettingsModal from '@/components/modals/SettingsModal';

export default function Home() {
  return (
    <AuthGuard>
      <ContactsApp />
    </AuthGuard>
  );
}

function ContactsApp() {
  const { getAccessToken } = useAuth();

  // 필터 상태
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortField, setSortField] = useState('last_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [showFavorites, setShowFavorites] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [showNoName, setShowNoName] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const [pageSize, setPageSize] = useState(30);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // UI 상태
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showImport, setShowImport] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // 사이드바 / 연락처 목록 리사이즈
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [listWidth, setListWidth] = useState(400);
  const resizingSidebar = useRef(false);
  const resizingList = useRef(false);
  const listAreaRef = useRef<HTMLDivElement>(null);

  const handleSidebarMouseDown = useCallback(() => {
    resizingSidebar.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleListMouseDown = useCallback(() => {
    resizingList.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (resizingSidebar.current) {
        const w = Math.min(Math.max(e.clientX, 180), 500);
        setSidebarWidth(w);
      } else if (resizingList.current && listAreaRef.current) {
        const left = listAreaRef.current.getBoundingClientRect().left;
        const w = Math.min(Math.max(e.clientX - left, 280), 800);
        setListWidth(w);
      }
    };
    const handleMouseUp = () => {
      resizingSidebar.current = false;
      resizingList.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // 데이터
  const { contacts, total, loading, fetchContacts, toggleFavorite, deleteContact } = useContacts({
    page, limit: pageSize, sortField, sortDirection, search, groupId: selectedGroup,
    favoriteOnly: showFavorites, trashOnly: showTrash, noNameOnly: showNoName,
  });
  const { groups, createGroup, deleteGroup, fetchGroups } = useGroups();

  // 인증 헤더 헬퍼
  const authHeaders = async () => {
    const token = await getAccessToken();
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(value); setPage(1); }, 300);
  };

  const resetFilters = (overrides: Partial<{ group: string; favorites: boolean; trash: boolean; noName: boolean; recent: boolean }> = {}) => {
    setSelectedGroup(overrides.group ?? '');
    setShowFavorites(overrides.favorites ?? false);
    setShowTrash(overrides.trash ?? false);
    setShowNoName(overrides.noName ?? false);
    setShowRecent(overrides.recent ?? false);
    setPage(1);
  };

  const handleSelectRecent = () => {
    resetFilters({ recent: true });
    setSortField('created_at');
    setSortDirection('desc');
  };

  const handleSave = async (data: Omit<Partial<Contact>, 'groups'> & { groups?: string[] }) => {
    const headers = await authHeaders();
    if (editingContact) {
      await fetch(`/api/v1/contacts/${editingContact.id}`, {
        method: 'PUT', headers, body: JSON.stringify(data),
      });
    } else {
      await fetch('/api/v1/contacts', {
        method: 'POST', headers, body: JSON.stringify(data),
      });
    }
    setShowForm(false);
    setEditingContact(null);
    fetchContacts();
    fetchGroups();
  };

  const handleDelete = async (id: string) => {
    await deleteContact(id);
    if (selectedContact?.id === id) setSelectedContact(null);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`${selectedIds.size}개의 연락처를 삭제하시겠습니까?`)) return;
    const headers = await authHeaders();
    await fetch('/api/v1/contacts/batch', {
      method: 'POST', headers,
      body: JSON.stringify({
        operations: Array.from(selectedIds).map(id => ({ action: 'delete', id })),
      }),
    });
    setSelectedIds(new Set());
    setSelectedContact(null);
    fetchContacts();
  };

  const handleExport = async (format: string, fields: string[], groupId?: string) => {
    const params = new URLSearchParams({ format });
    if (fields.length) params.set('fields', fields.join(','));
    if (groupId) params.set('group_id', groupId);
    if (selectedIds.size > 0 && !groupId) params.set('ids', Array.from(selectedIds).join(','));

    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`/api/v1/contacts/export?${params}`, { headers });
    const blob = await res.blob();
    const ext = format === 'xlsx' ? 'xlsx' : format === 'csv' ? 'csv' : 'vcf';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `contacts_${new Date().toISOString().slice(0, 10)}.${ext}`;
    a.click();
    setShowExport(false);
  };

  const importFetch = async (file: File, query: string) => {
    const token = await getAccessToken();
    const formData = new FormData();
    formData.append('file', file);
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`/api/v1/contacts/import${query}`, { method: 'POST', headers, body: formData });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error?.message || `요청 실패 (${res.status})`);
    return json.data;
  };

  const handleImportPreview = async (file: File) => {
    return await importFetch(file, '?mode=preview');
  };

  const handleImportSave = async (file: File, skipDuplicates: boolean) => {
    const data = await importFetch(file, `?mode=save&skipDuplicates=${skipDuplicates}`);
    const parts = [`연락처 ${data.imported.toLocaleString()}건 등록`];
    if (data.skipped) parts.push(`중복 ${data.skipped.toLocaleString()}건 제외`);
    if (data.groups_created) parts.push(`그룹 ${data.groups_created}개 신규`);
    alert(parts.join(' · '));
    setShowImport(false);
    fetchContacts();
    fetchGroups();
  };

  const handleFetchDuplicates = async (mode: 'exact' | 'similar') => {
    const headers = await authHeaders();
    const res = await fetch(`/api/v1/contacts/duplicates?mode=${mode}`, { headers });
    const result = await res.json();
    return result.data || [];
  };

  const handleMerge = async (contactIds: string[], primaryId: string) => {
    const headers = await authHeaders();
    await fetch('/api/v1/contacts/merge', {
      method: 'POST', headers,
      body: JSON.stringify({ primary_id: primaryId, merge_ids: contactIds.filter(id => id !== primaryId) }),
    });
    fetchContacts();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(contacts.length > 0 && selectedIds.size === contacts.length
      ? new Set() : new Set(contacts.map(c => c.id)));
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* 사이드바 */}
      <aside className="bg-white border-r border-gray-200 flex-shrink-0" style={{ width: sidebarWidth }}>
        <Sidebar
          groups={groups}
          selectedGroup={selectedGroup}
          onSelectGroup={id => resetFilters({ group: id })}
          onSelectAll={() => resetFilters()}
          onSelectFavorites={() => resetFilters({ favorites: true })}
          showFavorites={showFavorites}
          totalContacts={total}
          onCreateGroup={createGroup}
          onDeleteGroup={deleteGroup}
          onSelectTrash={() => resetFilters({ trash: true })}
          showTrash={showTrash}
          onSelectNoName={() => resetFilters({ noName: true })}
          showNoName={showNoName}
          onOpenSettings={() => setShowSettings(true)}
          onOpenImport={() => setShowImport(true)}
          onOpenExport={() => setShowExport(true)}
          onOpenDuplicates={() => setShowDuplicates(true)}
          onCreateContact={() => { setEditingContact(null); setShowForm(true); }}
          onSelectRecent={handleSelectRecent}
          showRecent={showRecent}
        />
      </aside>

      {/* 리사이즈 핸들 */}
      <div
        onMouseDown={handleSidebarMouseDown}
        className="w-1 cursor-col-resize hover:bg-indigo-300 active:bg-indigo-400 transition-colors flex-shrink-0"
      />

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
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

          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <>
                <span className="text-xs text-gray-500">{selectedIds.size}개 선택</span>
                <button onClick={handleBulkDelete} className="px-3 py-2 text-xs text-red-600 bg-red-50 rounded-lg hover:bg-red-100">삭제</button>
              </>
            )}
            {!showTrash && (
              <button
                onClick={() => { setEditingContact(null); setShowForm(true); }}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                추가
              </button>
            )}
            <MoreMenu onExport={() => setShowExport(true)} onImport={() => setShowImport(true)} onCheckDuplicates={() => setShowDuplicates(true)} />
          </div>
        </header>

        {/* 휴지통 안내 배너 */}
        {showTrash && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-700 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.834-1.964-.834-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            휴지통의 연락처는 30일 후 영구 삭제됩니다.
          </div>
        )}

        <div className="flex-1 flex min-h-0" ref={listAreaRef}>
          <div className="flex flex-col bg-white flex-shrink-0" style={{ width: listWidth }}>
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
            {totalPages > 1 && (
              <div className="border-t border-gray-200 px-4 py-2 flex items-center justify-between bg-white">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30">이전</button>
                <span className="text-xs text-gray-500">{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30">다음</button>
              </div>
            )}
          </div>
          <ContactDetail
            contact={selectedContact}
            onEdit={() => { if (selectedContact) { setEditingContact(selectedContact); setShowForm(true); } }}
            onDelete={handleDelete}
            onClose={() => setSelectedContact(null)}
          />
        </div>
      </div>

      {/* 모달들 */}
      {showForm && (
        <ContactForm
          contact={editingContact}
          groups={groups}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingContact(null); }}
        />
      )}
      {showImport && <ImportModal onPreview={handleImportPreview} onSave={handleImportSave} onClose={() => setShowImport(false)} />}
      {showDuplicates && (
        <DuplicatesModal
          onFetch={handleFetchDuplicates}
          onMerge={handleMerge}
          onClose={() => setShowDuplicates(false)}
        />
      )}
      {showExport && (
        <ExportModal
          groups={groups}
          selectedIds={selectedIds}
          onExport={handleExport}
          onClose={() => setShowExport(false)}
        />
      )}
      {showSettings && (
        <SettingsModal
          settings={{ sortField, sortDirection, pageSize }}
          onSave={({ sortField: sf, sortDirection: sd, pageSize: ps }) => {
            setSortField(sf);
            setSortDirection(sd as 'asc' | 'desc');
            setPageSize(ps);
            setPage(1);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
