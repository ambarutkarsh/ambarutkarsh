import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/services/activityService'
import type { ReminderType } from '@/types/database'

interface Props {
  documentId: string
  documentName: string
  onClose: () => void
}

const REMINDER_TYPES: { value: ReminderType; label: string }[] = [
  { value: 'expiry', label: 'Expiry Reminder' },
  { value: 'renewal', label: 'Renewal Reminder' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'submission_deadline', label: 'Submission Deadline' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'correction_pending', label: 'Correction Pending' },
]

export function ReminderDialog({ documentId, documentName, onClose }: Props) {
  const { user } = useAuth()
  const [reminderType, setReminderType] = useState<ReminderType>('expiry')
  const [reminderDate, setReminderDate] = useState('')
  const [frequency, setFrequency] = useState('once')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSave = async () => {
    if (!user || !reminderDate) return
    setLoading(true)
    await supabase.from('reminders').insert({
      user_id: user.id,
      document_id: documentId,
      reminder_type: reminderType,
      reminder_date: new Date(reminderDate).toISOString(),
      frequency,
      notes: notes || null,
      status: 'active',
    })
    await logActivity(user.id, 'reminder_created', documentId)
    setSuccess(true)
    setLoading(false)
    setTimeout(onClose, 1500)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle>Add Reminder</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">✓</span>
            </div>
            <p className="font-medium text-gray-900">Reminder saved!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">For: <strong className="text-gray-700">{documentName}</strong></p>

            <div className="space-y-1.5">
              <Label>Reminder type</Label>
              <Select value={reminderType} onValueChange={v => setReminderType(v as ReminderType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REMINDER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Remind me on</Label>
              <Input type="datetime-local" value={reminderDate} onChange={e => setReminderDate(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Once</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea placeholder="Additional notes..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSave} loading={loading} disabled={!reminderDate}>Save Reminder</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
