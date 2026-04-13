import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { apiError, apiSuccess, ErrorCodes } from '@/lib/errors';

// DELETE /api/v1/auth/devices/[id] — 디바이스 해제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth(request);
  if (error) return error;
  const { id } = await params;

  const { error: dbError } = await supabase
    .from('devices')
    .delete()
    .eq('id', id)
    .eq('user_id', user!.id);

  if (dbError) {
    return apiError(ErrorCodes.INTERNAL, dbError.message);
  }

  return apiSuccess({ success: true });
}
