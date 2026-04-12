'use client';

import { useState, useEffect, useCallback } from 'react';
import { Group } from '@/lib/supabase';

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/groups');
    const data = await res.json();
    setGroups(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const createGroup = async (name: string, color?: string) => {
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    });
    const data = await res.json();
    setGroups(prev => [...prev, { ...data, contact_count: 0 }]);
    return data;
  };

  const deleteGroup = async (id: string) => {
    await fetch(`/api/groups?id=${id}`, { method: 'DELETE' });
    setGroups(prev => prev.filter(g => g.id !== id));
  };

  return { groups, loading, fetchGroups, createGroup, deleteGroup };
}
