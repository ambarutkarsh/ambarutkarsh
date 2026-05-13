import { supabase } from '@/lib/supabase'
import type { ActivityAction } from '@/types/database'

export async function logActivity(
  userId: string,
  action: ActivityAction,
  documentId?: string,
  details?: Record<string, unknown>
) {
  await supabase.from('activity_logs').insert({
    user_id: userId,
    document_id: documentId || null,
    action,
    details: details || {},
  })
}
