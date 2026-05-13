import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, Trash2, ChevronRight, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatDateTime } from '@/lib/utils'
import type { Reminder, ReminderType } from '@/types/database'

const REMINDER_LABELS: Record<ReminderType, string> = {
  expiry: 'Expiry Reminder',
  renewal: 'Renewal',
  follow_up: 'Follow-up',
  submission_deadline: 'Submission Deadline',
  appointment: 'Appointment',
  correction_pending: 'Correction Pending',
}

const REMINDER_COLORS: Record<ReminderType, string> = {
  expiry: 'bg-red-50 text-red-600',
  renewal: 'bg-amber-50 text-amber-600',
  follow_up: 'bg-blue-50 text-blue-600',
  submission_deadline: 'bg-orange-50 text-orange-600',
  appointment: 'bg-purple-50 text-purple-600',
  correction_pending: 'bg-gray-50 text-gray-600',
}

interface ReminderWithDoc extends Reminder {
  documentName?: string
}

export function RemindersPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [reminders, setReminders] = useState<ReminderWithDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReminders()
  }, [user])

  const fetchReminders = async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'dismissed')
      .order('reminder_date', { ascending: true })

    if (data) {
      // Fetch document names
      const docIds = [...new Set(data.map(r => r.document_id))]
      const { data: docs } = await supabase
        .from('documents')
        .select('id, document_name')
        .in('id', docIds)

      const docMap = Object.fromEntries((docs || []).map(d => [d.id, d.document_name]))
      setReminders(data.map(r => ({ ...r, documentName: docMap[r.document_id] })))
    }
    setLoading(false)
  }

  const dismissReminder = async (id: string) => {
    await supabase.from('reminders').update({ status: 'dismissed' }).eq('id', id)
    setReminders(prev => prev.filter(r => r.id !== id))
  }

  const completeReminder = async (id: string) => {
    await supabase.from('reminders').update({ status: 'completed' }).eq('id', id)
    setReminders(prev => prev.filter(r => r.id !== id))
  }

  const now = new Date()
  const overdue = reminders.filter(r => new Date(r.reminder_date) < now)
  const upcoming = reminders.filter(r => new Date(r.reminder_date) >= now)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Reminders</h1>
          {reminders.length > 0 && (
            <Badge variant="destructive">{reminders.length}</Badge>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-slate-900 border-t-transparent rounded-full" />
          </div>
        )}

        {!loading && reminders.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Bell className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-gray-500 text-sm">No active reminders</p>
            <p className="text-xs text-gray-400 mt-1">Add reminders from document detail pages</p>
          </div>
        )}

        {overdue.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> Overdue ({overdue.length})
            </h2>
            <div className="space-y-2">
              {overdue.map(r => (
                <ReminderCard key={r.id} reminder={r} onDismiss={() => dismissReminder(r.id)} onComplete={() => completeReminder(r.id)} onView={() => navigate(`/documents/${r.document_id}`)} overdue />
              ))}
            </div>
          </div>
        )}

        {upcoming.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Upcoming</h2>
            <div className="space-y-2">
              {upcoming.map(r => (
                <ReminderCard key={r.id} reminder={r} onDismiss={() => dismissReminder(r.id)} onComplete={() => completeReminder(r.id)} onView={() => navigate(`/documents/${r.document_id}`)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ReminderCard({ reminder, onDismiss, onComplete, onView, overdue }: {
  reminder: ReminderWithDoc
  onDismiss: () => void
  onComplete: () => void
  onView: () => void
  overdue?: boolean
}) {
  const color = REMINDER_COLORS[reminder.reminder_type]

  return (
    <div className={`bg-white rounded-xl border shadow-sm p-4 ${overdue ? 'border-red-100' : 'border-gray-100'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
          <Bell className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{REMINDER_LABELS[reminder.reminder_type]}</p>
          {reminder.documentName && (
            <button onClick={onView} className="text-xs text-blue-600 hover:underline mt-0.5 flex items-center gap-1">
              {reminder.documentName} <ChevronRight className="h-3 w-3" />
            </button>
          )}
          <p className={`text-xs mt-1 ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
            {overdue ? '⚠ Overdue · ' : ''}{formatDateTime(reminder.reminder_date)}
          </p>
          {reminder.notes && <p className="text-xs text-gray-400 mt-1">{reminder.notes}</p>}
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={onComplete}
          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-medium"
        >
          <Check className="h-3.5 w-3.5" /> Done
        </button>
        <button
          onClick={onDismiss}
          className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-xs font-medium"
        >
          <Trash2 className="h-3.5 w-3.5" /> Dismiss
        </button>
      </div>
    </div>
  )
}
