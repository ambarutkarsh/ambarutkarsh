import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, Download, Share2, Trash2, Edit, ExternalLink,
  Clock, Tag, User, Building, Hash, Calendar, Shield,
  ChevronDown, ChevronUp, History, Bell, AlertTriangle,
  Plus, RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useDocuments } from '@/hooks/useDocuments'
import { useProfiles } from '@/hooks/useProfiles'
import { useAuth } from '@/context/AuthContext'
import { VerificationBadge } from '@/components/documents/VerificationBadge'
import { CategoryIcon } from '@/components/documents/CategoryIcon'
import { ShareDialog } from '@/components/sharing/ShareDialog'
import { ReminderDialog } from '@/components/reminders/ReminderDialog'
import { ActivityLogPanel } from '@/components/documents/ActivityLogPanel'
import { CorrectionDialog } from '@/components/corrections/CorrectionDialog'
import { supabase } from '@/lib/supabase'
import { formatDate, formatDateTime, formatFileSize, isExpired, isExpiringSoon } from '@/lib/utils'
import { logActivity } from '@/services/activityService'
import type { Document } from '@/types/database'

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getDocument, deleteDocument, getSignedUrl } = useDocuments()
  const { profiles, fetchProfiles } = useProfiles()
  const [doc, setDoc] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [showOcr, setShowOcr] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [showReminderDialog, setShowReminderDialog] = useState(false)
  const [showActivityLog, setShowActivityLog] = useState(false)
  const [showCorrectionDialog, setShowCorrectionDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchProfiles()
    if (id) loadDocument(id)
  }, [id])

  const loadDocument = async (docId: string) => {
    setLoading(true)
    const document = await getDocument(docId)
    setDoc(document)
    if (document) {
      const url = await getSignedUrl(document.storage_path, 3600)
      setSignedUrl(url)
      if (user) logActivity(user.id, 'viewed', docId)
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!doc || !window.confirm('Delete this document permanently? This cannot be undone.')) return
    setDeleting(true)
    await deleteDocument(doc.id, doc.storage_path)
    if (user) logActivity(user.id, 'deleted', doc.id, { documentName: doc.document_name })
    navigate('/documents')
  }

  const handleDownload = async () => {
    if (!signedUrl || !doc) return
    const a = document.createElement('a')
    a.href = signedUrl
    a.download = doc.document_name
    a.click()
    if (user) logActivity(user.id, 'downloaded', doc.id)
  }

  const ownerProfile = profiles.find(p => p.id === doc?.profile_id)
  const expired = isExpired(doc?.expiry_date)
  const expiring = isExpiringSoon(doc?.expiry_date)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-slate-900 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <p className="text-gray-500 mb-4">Document not found</p>
        <Button onClick={() => navigate('/documents')}>Back to Documents</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100"
          >
            <Download className="h-4 w-4 text-gray-600" />
          </button>
          <button
            onClick={() => setShowShareDialog(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-900"
          >
            <Share2 className="h-4 w-4 text-white" />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </button>
        </div>
      </div>

      {/* Document Preview */}
      <div className="bg-white mx-4 mt-4 rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {signedUrl && doc.file_type.startsWith('image/') ? (
          <img src={signedUrl} alt={doc.document_name} className="w-full max-h-72 object-contain bg-gray-50" />
        ) : signedUrl && doc.file_type === 'application/pdf' ? (
          <div className="h-72 bg-gray-50 flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center">
              <ExternalLink className="h-8 w-8 text-red-500" />
            </div>
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-slate-600 underline"
            >
              Open PDF in browser
            </a>
          </div>
        ) : (
          <div className="h-48 bg-gray-50 flex items-center justify-center">
            <CategoryIcon category={doc.category} size="lg" />
          </div>
        )}
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Title and badges */}
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{doc.document_name}</h1>
          <div className="flex flex-wrap gap-2">
            <VerificationBadge status={doc.verification_status} />
            {expired && <Badge variant="destructive">Expired</Badge>}
            {!expired && expiring && <Badge variant="warning">Expiring Soon</Badge>}
            {doc.tags.map(tag => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>
        </div>

        {/* Expiry alert */}
        {(expired || expiring) && (
          <div className={`flex items-center gap-3 rounded-xl p-4 ${expired ? 'bg-red-50 border border-red-100' : 'bg-amber-50 border border-amber-100'}`}>
            <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${expired ? 'text-red-500' : 'text-amber-500'}`} />
            <div>
              <p className={`text-sm font-medium ${expired ? 'text-red-700' : 'text-amber-700'}`}>
                {expired ? 'This document has expired' : 'This document is expiring soon'}
              </p>
              <p className={`text-xs mt-0.5 ${expired ? 'text-red-500' : 'text-amber-500'}`}>
                {expired ? 'Expired on' : 'Expires on'} {formatDate(doc.expiry_date)}
              </p>
            </div>
          </div>
        )}

        {/* Metadata */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm">Document Details</h3>

            <MetaRow icon={<CategoryIcon category={doc.category} size="sm" />} label="Category">
              <span className="text-sm text-gray-900">{doc.category} {doc.sub_category && `/ ${doc.sub_category}`}</span>
            </MetaRow>

            {ownerProfile && (
              <MetaRow icon={<User className="h-4 w-4 text-gray-400" />} label="Owner">
                <span className="text-sm text-gray-900">{ownerProfile.name}</span>
                <Badge variant="secondary" className="text-xs ml-1">{ownerProfile.profile_type}</Badge>
              </MetaRow>
            )}

            {doc.issuer && (
              <MetaRow icon={<Building className="h-4 w-4 text-gray-400" />} label="Issuer">
                <span className="text-sm text-gray-900">{doc.issuer}</span>
              </MetaRow>
            )}

            {doc.document_number && (
              <MetaRow icon={<Hash className="h-4 w-4 text-gray-400" />} label="Document No.">
                <span className="text-sm font-mono text-gray-900">{doc.document_number}</span>
              </MetaRow>
            )}

            {doc.issue_date && (
              <MetaRow icon={<Calendar className="h-4 w-4 text-gray-400" />} label="Issue Date">
                <span className="text-sm text-gray-900">{formatDate(doc.issue_date)}</span>
              </MetaRow>
            )}

            {doc.expiry_date && (
              <MetaRow icon={<Clock className="h-4 w-4 text-gray-400" />} label="Expiry Date">
                <span className={`text-sm font-medium ${expired ? 'text-red-600' : expiring ? 'text-amber-600' : 'text-gray-900'}`}>
                  {formatDate(doc.expiry_date)}
                </span>
              </MetaRow>
            )}

            <MetaRow icon={<Shield className="h-4 w-4 text-gray-400" />} label="Status">
              <VerificationBadge status={doc.verification_status} />
            </MetaRow>

            <div className="pt-2 border-t border-gray-100 text-xs text-gray-400 space-y-1">
              <p>Added {formatDateTime(doc.created_at)}</p>
              <p>Updated {formatDateTime(doc.updated_at)}</p>
              <p>Size: {formatFileSize(doc.file_size)}</p>
            </div>
          </CardContent>
        </Card>

        {/* OCR Text */}
        {doc.ocr_text && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <button
                className="flex items-center justify-between w-full"
                onClick={() => setShowOcr(!showOcr)}
              >
                <h3 className="font-semibold text-gray-900 text-sm">Extracted Text</h3>
                {showOcr ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
              </button>
              {showOcr && (
                <p className="mt-3 text-xs text-gray-600 font-mono whitespace-pre-wrap bg-gray-50 rounded-xl p-3">
                  {doc.ocr_text}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Panel */}
        <div className="grid grid-cols-2 gap-3">
          <ActionButton icon={<Share2 className="h-5 w-5" />} label="Share Securely" onClick={() => setShowShareDialog(true)} />
          <ActionButton icon={<Bell className="h-5 w-5" />} label="Add Reminder" onClick={() => setShowReminderDialog(true)} />
          <ActionButton icon={<RefreshCw className="h-5 w-5" />} label="Correction Workflow" onClick={() => setShowCorrectionDialog(true)} />
          <ActionButton icon={<History className="h-5 w-5" />} label="Activity Log" onClick={() => setShowActivityLog(!showActivityLog)} />
        </div>

        {/* Activity Log */}
        {showActivityLog && <ActivityLogPanel documentId={doc.id} />}
      </div>

      {/* Dialogs */}
      {showShareDialog && (
        <ShareDialog doc={doc} onClose={() => setShowShareDialog(false)} />
      )}
      {showReminderDialog && (
        <ReminderDialog documentId={doc.id} documentName={doc.document_name} onClose={() => setShowReminderDialog(false)} />
      )}
      {showCorrectionDialog && (
        <CorrectionDialog doc={doc} onClose={() => setShowCorrectionDialog(false)} />
      )}
    </div>
  )
}

function MetaRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 flex items-center justify-center flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <div className="flex items-center gap-1 flex-wrap">{children}</div>
      </div>
    </div>
  )
}

function ActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-100 shadow-sm text-center active:scale-95 transition-transform"
    >
      <div className="text-slate-600">{icon}</div>
      <span className="text-xs font-medium text-gray-700">{label}</span>
    </button>
  )
}
