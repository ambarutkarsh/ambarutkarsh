import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDateTime } from '@/lib/utils'
import type { ActivityLog, ActivityAction } from '@/types/database'

const ACTION_LABELS: Record<ActivityAction, string> = {
  uploaded: 'Document uploaded',
  viewed: 'Document viewed',
  edited: 'Details edited',
  shared: 'Document shared',
  downloaded: 'Document downloaded',
  ocr_processed: 'OCR text extracted',
  verification_changed: 'Verification status changed',
  correction_started: 'Correction workflow started',
  reminder_created: 'Reminder added',
  share_revoked: 'Share access revoked',
  deleted: 'Document deleted',
}

const ACTION_COLORS: Record<ActivityAction, string> = {
  uploaded: 'bg-blue-400',
  viewed: 'bg-gray-400',
  edited: 'bg-purple-400',
  shared: 'bg-indigo-400',
  downloaded: 'bg-cyan-400',
  ocr_processed: 'bg-amber-400',
  verification_changed: 'bg-emerald-400',
  correction_started: 'bg-orange-400',
  reminder_created: 'bg-pink-400',
  share_revoked: 'bg-red-400',
  deleted: 'bg-red-600',
}

export function ActivityLogPanel({ documentId }: { documentId: string }) {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(20)
      setLogs(data || [])
      setLoading(false)
    }
    fetchLogs()
  }, [documentId])

  if (loading) return <div className="h-16 flex items-center justify-center"><div className="animate-spin h-5 w-5 border-2 border-slate-900 border-t-transparent rounded-full" /></div>

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <h3 className="font-semibold text-gray-900 text-sm mb-4">Activity History</h3>
      {logs.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No activity yet</p>
      ) : (
        <div className="space-y-3">
          {logs.map(log => (
            <div key={log.id} className="flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${ACTION_COLORS[log.action] || 'bg-gray-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700">{ACTION_LABELS[log.action] || log.action}</p>
                <p className="text-xs text-gray-400">{formatDateTime(log.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
