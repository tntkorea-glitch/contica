'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, Contact } from '@/lib/supabase';

interface UseContactsOptions {
  page?: number;
  limit?: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  search?: string;
  groupId?: string;
  favoriteOnly?: boolean;
}

export function useContacts(options: UseContactsOptions = {}) {
  const {
    page = 1,
    limit = 30,
    sortField = 'last_name',
    sortDirection = 'asc',
    search = '',
    groupId = '',
    favoriteOnly = false,
  } = options;

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      sortField,
      sortDirection,
    });
    if (search) params.set('search', search);
    if (groupId) params.set('groupId', groupId);
    if (favoriteOnly) params.set('favorite', 'true');

    const res = await fetch(`/api/contacts?${params}`);
    const data = await res.json();
    setContacts(data.contacts || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [page, limit, sortField, sortDirection, search, groupId, favoriteOnly]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Supabase Realtime 구독 - 다른 기기에서의 변경 실시간 반영
  useEffect(() => {
    const channel = supabase
      .channel('contacts-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contacts' },
        () => {
          fetchContacts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchContacts]);

  const toggleFavorite = async (id: string, current: boolean) => {
    await fetch(`/api/contacts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ favorite: !current }),
    });
    setContacts(prev =>
      prev.map(c => (c.id === id ? { ...c, favorite: !current } : c))
    );
  };

  const deleteContact = async (id: string) => {
    await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
    setContacts(prev => prev.filter(c => c.id !== id));
    setTotal(prev => prev - 1);
  };

  return { contacts, total, loading, fetchContacts, toggleFavorite, deleteContact };
}
