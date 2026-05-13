import { useState } from 'react'
import { ChevronRight, ExternalLink } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/services/activityService'
import type { Document, DocumentCategory } from '@/types/database'

interface CorrectionTemplate {
  type: string
  authority: string
  requiredDocs: string[]
  steps: string[]
  timeline: string
  fee: string
  process: 'online' | 'offline' | 'both'
}

const CORRECTION_TEMPLATES: Partial<Record<DocumentCategory, Record<string, CorrectionTemplate>>> = {
  identity: {
    'Name Correction': {
      type: 'Name Correction',
      authority: 'Registrar / Issuing Authority',
      requiredDocs: ['Affidavit from notary', 'Supporting ID proof', 'Old document copy', 'Application form'],
      steps: [
        'Prepare a notarised affidavit for name correction',
        'Fill the official correction application form',
        'Attach supporting documents',
        'Visit nearest issuing authority office',
        'Pay applicable fee',
        'Collect acknowledgement receipt',
        'Collect corrected document after processing',
      ],
      timeline: '15–30 working days',
      fee: '₹50–₹500 depending on document',
      process: 'offline',
    },
    'Address Change': {
      type: 'Address Change',
      authority: 'Issuing Authority / Online Portal',
      requiredDocs: ['Proof of new address (utility bill, bank statement)', 'Old document', 'Application form'],
      steps: [
        'Visit official portal or nearest office',
        'Fill address update form',
        'Upload/submit address proof',
        'Pay fee if applicable',
        'Receive OTP confirmation',
        'Updated document will be mailed or downloadable',
      ],
      timeline: '7–21 working days',
      fee: '₹25–₹200',
      process: 'both',
    },
  },
  vehicle: {
    'RC Update': {
      type: 'RC Update',
      authority: 'Regional Transport Office (RTO)',
      requiredDocs: ['Original RC', 'Insurance copy', 'PUC certificate', 'Address proof', 'Application form (Form 33)'],
      steps: [
        'Visit your RTO with all documents',
        'Submit Form 33 duly filled',
        'Pay applicable fee at the counter',
        'Vehicle inspection if required',
        'Collect updated RC within specified time',
      ],
      timeline: '7–15 working days',
      fee: '₹300–₹1000',
      process: 'offline',
    },
  },
  family: {
    'Marriage Certificate Correction': {
      type: 'Marriage Certificate Correction',
      authority: 'Municipal Corporation / Registrar of Marriages',
      requiredDocs: ['Original marriage certificate', 'Proof of correct information', 'Affidavit', 'Joint application by both parties'],
      steps: [
        'Obtain affidavit from notary stating the error and correct information',
        'Fill correction application at Registrar office',
        'Submit original certificate along with documents',
        'Pay correction fee',
        'Await verification',
        'Collect corrected certificate',
      ],
      timeline: '15–45 working days',
      fee: '₹200–₹1000',
      process: 'offline',
    },
  },
  medical: {
    'Medical Record Correction': {
      type: 'Medical Record Correction',
      authority: 'Hospital / Medical Records Department',
      requiredDocs: ['Patient ID', 'Written request letter', 'Supporting documents'],
      steps: [
        'Write a formal correction request to the hospital\'s Medical Records Department',
        'Attach supporting documents proving correct information',
        'Submit request at the records desk',
        'Await review by treating doctor',
        'Receive amended record or correction note',
      ],
      timeline: '5–15 working days',
      fee: 'May vary',
      process: 'offline',
    },
  },
  pet: {
    'Pet Licence Update': {
      type: 'Pet Licence Update',
      authority: 'Municipal Corporation / Local Body',
      requiredDocs: ['Existing pet licence', 'Vaccination certificate', 'Proof of address', 'Photo of pet'],
      steps: [
        'Visit your local municipal corporation',
        'Submit renewal/update application form',
        'Attach updated vaccination records',
        'Pay licence fee',
        'Collect updated pet licence',
      ],
      timeline: '3–7 working days',
      fee: '₹100–₹500 per year',
      process: 'both',
    },
  },
}

const CORRECTION_TYPES = [
  'Name Correction',
  'Date of Birth Correction',
  'Address Change',
  'Spouse Name Correction',
  'Ownership Transfer',
  'Expiry Renewal',
  'Lost Document Replacement',
  'Pet Licence Update',
  'RC Update',
  'Marriage Certificate Correction',
  'Medical Record Correction',
  'Other',
]

export function CorrectionDialog({ doc, onClose }: { doc: Document; onClose: () => void }) {
  const { user } = useAuth()
  const [correctionType, setCorrectionType] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const template = CORRECTION_TEMPLATES[doc.category]?.[correctionType]

  const handleStart = async () => {
    if (!user || !correctionType) return
    setLoading(true)
    await supabase.from('correction_workflows').insert({
      user_id: user.id,
      document_id: doc.id,
      correction_type: correctionType,
      authority: template?.authority || null,
      required_documents: template?.requiredDocs || [],
      process_steps: template?.steps || [],
      expected_timeline: template?.timeline || null,
      fee: template?.fee || null,
      status: 'not_started',
      notes: notes || null,
    })
    await logActivity(user.id, 'correction_started', doc.id, { correctionType })
    setSaved(true)
    setLoading(false)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Correction Workflow</DialogTitle>
        </DialogHeader>

        {saved ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">✓</span>
            </div>
            <p className="font-medium text-gray-900">Workflow started!</p>
            <p className="text-sm text-gray-500 mt-1">Follow the steps to complete your correction</p>
            <Button className="mt-4 w-full" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              What needs to be corrected in <strong className="text-gray-700">{doc.document_name}</strong>?
            </p>

            <div className="space-y-1.5">
              <Label>Correction type</Label>
              <Select value={correctionType} onValueChange={setCorrectionType}>
                <SelectTrigger><SelectValue placeholder="Select correction type" /></SelectTrigger>
                <SelectContent>
                  {CORRECTION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {template && (
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Authority</span>
                    <Badge variant="info" className="text-xs">{template.process}</Badge>
                  </div>
                  <p className="text-sm font-medium text-blue-900">{template.authority}</p>

                  <div>
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Required Documents</p>
                    <ul className="space-y-1">
                      {template.requiredDocs.map((d, i) => (
                        <li key={i} className="text-xs text-blue-700 flex items-start gap-1.5">
                          <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Steps</p>
                    <ol className="space-y-1">
                      {template.steps.map((s, i) => (
                        <li key={i} className="text-xs text-blue-700 flex items-start gap-2">
                          <span className="w-4 h-4 bg-blue-200 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          {s}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-blue-100">
                    <div>
                      <p className="text-xs text-blue-500">Timeline</p>
                      <p className="text-xs font-medium text-blue-800">{template.timeline}</p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-500">Approx. Fee</p>
                      <p className="text-xs font-medium text-blue-800">{template.fee}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea placeholder="Add any specific notes..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleStart} loading={loading} disabled={!correctionType}>
                Start Workflow
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
