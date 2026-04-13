'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Contact } from '@/lib/types';
import { useAuth } from './useAuth';

interface UseContactsOptions {
  page?: number;
  limit?: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  search?: string;
  groupId?: string;
  favoriteOnly?: boolean;
  trashOnly?: boolean;
  noNameOnly?: boolean;
}

export function useContacts(options: UseContactsOptions = {}) {
  const {
    page = 1, limit = 30, sortField = 'last_name',
    sortDirection = 'asc', search = '', groupId = '', favoriteOnly = false,
    trashOnly = false, noNameOnly = false,
  } = options;

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const { getAccessToken } = useAuth();

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      sort: sortField,
      direction: sortDirection,
    });
    if (search) params.set('search', search);
    if (groupId) params.set('group_id', groupId);
    if (favoriteOnly) params.set('favorite', 'true');
    if (trashOnly) params.set('trash', 'true');
    if (noNameOnly) params.set('no_name', 'true');

    const token = await getAccessToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api/v1/contacts?${params}`, { headers });
    const result = await res.json();

    // v1 API returns { data: [...], meta: { total, page, limit } }
    setContacts(result.data || []);
    setTotal(result.meta?.total || 0);
    setLoading(false);
  }, [page, limit, sortField, sortDirection, search, groupId, favoriteOnly, trashOnly, noNameOnly, getAccessToken]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Supabase Realtime 구독
  useEffect(() => {
    const channel = supabase
      .channel('contacts-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contacts' },
        () => { fetchContacts(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchContacts]);

  const toggleFavorite = async (id: string, current: boolean) => {
    const token = await getAccessToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    await fetch(`/api/v1/contacts/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ favorite: !current }),
    });
    setContacts(prev =>
      prev.map(c => (c.id === id ? { ...c, favorite: !current } : c))
    );
  };

  const deleteContact = async (id: string) => {
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    await fetch(`/api/v1/contacts/${id}`, { method: 'DELETE', headers });
    setContacts(prev => prev.filter(c => c.id !== id));
    setTotal(prev => prev - 1);
  };

  return { contacts, total, loading, fetchContacts, toggleFavorite, deleteContact };
}
