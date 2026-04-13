import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { apiError, ErrorCodes } from '@/lib/errors';
import { NextResponse } from 'next/server';
import type { SyncPushResult } from '@/lib/types';

// POST /api/v1/sync/push — 로컬 변경사항 일괄 전송
export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth(request);
  if (error) return error;

  const { device_id, changes } = await request.json();
  const userId = user!.id;
  const serverTime = new Date().toISOString();
  const results: SyncPushResult[] = [];

  if (!Array.isArray(changes) || changes.length === 0) {
    return apiError(ErrorCodes.VALIDATION, 'changes 배열이 필요합니다');
  }

  for (const change of changes) {
    try {
      const result = await processChange(change, userId, device_id);
      results.push(result);
    } catch (e) {
      results.push({
        client_id: change.client_id,
        id: change.id,
        status: 'error',
        error: (e as Error).message,
      });
    }
  }

  // 디바이스 last_synced_at 업데이트
  if (device_id) {
    await supabase
      .from('devices')
      .update({ last_synced_at: serverTime })
      .eq('id', device_id)
      .eq('user_id', userId);
  }

  return NextResponse.json({
    server_time: serverTime,
    results,
  });
}

async function processChange(
  change: { type: string; action: string; id?: string; client_id?: string; data?: Record<string, unknown>; base_version?: number },
  userId: string,
  deviceId?: string,
): Promise<SyncPushResult> {

  switch (change.type) {
    // ============================================
    // Contact 처리
    // ============================================
    case 'contact': {
      switch (change.action) {
        case 'create': {
          const { data, error } = await supabase
            .from('contacts')
            .insert({ ...change.data, user_id: userId })
            .select()
            .single();

          if (error) throw new Error(error.message);

          await logSyncEvent(userId, deviceId, 'contact', data.id, 'create');

          return {
            client_id: change.client_id,
            server_id: data.id,
            status: 'created',
            version: data.version,
          };
        }

        case 'update': {
          // 충돌 감지
          if (change.base_version !== undefined) {
            const { data: current } = await supabase
              .from('contacts')
              .select('version, updated_at')
              .eq('id', change.id)
              .eq('user_id', userId)
              .single();

            if (current && current.version !== change.base_version) {
              // Last-Write-Wins: 서버 버전이 우선
              const { data: serverData } = await supabase
                .from('contacts')
                .select('*')
                .eq('id', change.id)
                .single();

              return {
                id: change.id,
                status: 'conflict',
                version: current.version,
                server_data: serverData as unknown as Record<string, unknown>,
              };
            }
          }

          const { data, error } = await supabase
            .from('contacts')
            .update(change.data!)
            .eq('id', change.id)
            .eq('user_id', userId)
            .is('deleted_at', null)
            .select()
            .single();

          if (error) throw new Error(error.message);

          await logSyncEvent(userId, deviceId, 'contact', change.id!, 'update', change.data);

          return {
            id: data.id,
            status: 'updated',
            version: data.version,
          };
        }

        case 'delete': {
          await supabase
            .from('contacts')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', change.id)
            .eq('user_id', userId);

          // 그룹 연결도 soft delete
          await supabase
            .from('contact_groups')
            .update({ removed_at: new Date().toISOString() })
            .eq('contact_id', change.id)
            .is('removed_at', null);

          await logSyncEvent(userId, deviceId, 'contact', change.id!, 'delete');

          return { id: change.id, status: 'deleted' };
        }

        default:
          throw new Error(`Unknown contact action: ${change.action}`);
      }
    }

    // ============================================
    // Group 처리
    // ============================================
    case 'group': {
      switch (change.action) {
        case 'create': {
          const { data, error } = await supabase
            .from('groups')
            .insert({ ...change.data, user_id: userId })
            .select()
            .single();

          if (error) throw new Error(error.message);

          await logSyncEvent(userId, deviceId, 'group', data.id, 'create');

          return {
            client_id: change.client_id,
            server_id: data.id,
            status: 'created',
            version: data.version,
          };
        }

        case 'update': {
          const { data, error } = await supabase
            .from('groups')
            .update(change.data!)
            .eq('id', change.id)
            .eq('user_id', userId)
            .is('deleted_at', null)
            .select()
            .single();

          if (error) throw new Error(error.message);

          await logSyncEvent(userId, deviceId, 'group', change.id!, 'update');

          return { id: data.id, status: 'updated', version: data.version };
        }

        case 'delete': {
          const now = new Date().toISOString();
          await supabase
            .from('groups')
            .update({ deleted_at: now })
            .eq('id', change.id)
            .eq('user_id', userId);

          await supabase
            .from('contact_groups')
            .update({ removed_at: now })
            .eq('group_id', change.id)
            .is('removed_at', null);

          await logSyncEvent(userId, deviceId, 'group', change.id!, 'delete');

          return { id: change.id, status: 'deleted' };
        }

        default:
          throw new Error(`Unknown group action: ${change.action}`);
      }
    }

    // ============================================
    // Contact-Group 연결 처리
    // ============================================
    case 'contact_group': {
      const contactId = change.data?.contact_id as string;
      const groupId = change.data?.group_id as string;

      if (change.action === 'add') {
        await supabase
          .from('contact_groups')
          .insert({ contact_id: contactId, group_id: groupId });

        await logSyncEvent(userId, deviceId, 'contact_group', `${contactId}:${groupId}`, 'create');

        return { status: 'added' };
      }

      if (change.action === 'remove') {
        await supabase
          .from('contact_groups')
          .update({ removed_at: new Date().toISOString() })
          .eq('contact_id', contactId)
          .eq('group_id', groupId)
          .is('removed_at', null);

        await logSyncEvent(userId, deviceId, 'contact_group', `${contactId}:${groupId}`, 'delete');

        return { status: 'removed' };
      }

      throw new Error(`Unknown contact_group action: ${change.action}`);
    }

    default:
      throw new Error(`Unknown type: ${change.type}`);
  }
}

async function logSyncEvent(
  userId: string,
  deviceId: string | undefined,
  entityType: string,
  entityId: string,
  action: string,
  changes?: Record<string, unknown>,
) {
  await supabase.from('sync_events').insert({
    user_id: userId,
    device_id: deviceId || null,
    entity_type: entityType,
    entity_id: entityId,
    action,
    changes: changes || null,
  });
}
