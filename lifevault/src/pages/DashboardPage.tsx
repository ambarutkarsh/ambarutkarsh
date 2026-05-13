import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, CheckCircle, Clock, Share2, AlertTriangle,
  Upload, Scan, Search, ChevronRight, Bell, Users,
  PawPrint, Car, Home as HomeIcon, Stethoscope, GraduationCap, Scale, DollarSign, Shield
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useDocuments } from '@/hooks/useDocuments'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatFileSize, isExpired, isExpiringSoon, formatDate } from '@/lib/utils'
import { CategoryIcon } from '@/components/documents/CategoryIcon'
import { VerificationBadge } from '@/components/documents/VerificationBadge'
import type { Document, DocumentCategory } from '@/types/database'
import { supabase } from '@/lib/supabase'

const QUICK_SECTIONS = [
  { label: 'Family', icon: Users, category: 'family' as DocumentCategory, color: 'bg-pink-50 text-pink-600' },
  { label: 'Pets', icon: PawPrint, category: 'pet' as DocumentCategory, color: 'bg-amber-50 text-amber-600' },
  { label: 'Vehicles', icon: Car, category: 'vehicle' as DocumentCategory, color: 'bg-cyan-50 text-cyan-600' },
  { label: 'Property', icon: HomeIcon, category: 'property' as DocumentCategory, color: 'bg-orange-50 text-orange-600' },
  { label: 'Medical', icon: Stethoscope, category: 'medical' as DocumentCategory, color: 'bg-red-50 text-red-600' },
  { label: 'Education', icon: GraduationCap, category: 'education' as DocumentCategory, color: 'bg-purple-50 text-purple-600' },
  { label: 'Legal', icon: Scale, category: 'legal' as DocumentCategory, color: 'bg-slate-50 text-slate-600' },
  { label: 'Finance', icon: DollarSign, category: 'finance' as DocumentCategory, color: 'bg-green-50 text-green-600' },
  { label: 'Insurance', icon: Shield, category: 'insurance' as DocumentCategory, color: 'bg-indigo-50 text-indigo-600' },
]

export function DashboardPage() {
  const { userProfile } = useAuth()
  const { documents, fetchDocuments } = useDocuments()
  const navigate = useNavigate()
  const [storageUsed, setStorageUsed] = useState(0)
  const [remindersCount, setRemindersCount] = useState(0)

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  useEffect(() => {
    const total = documents.reduce((acc, doc) => acc + (doc.file_size || 0), 0)
    setStorageUsed(total)
  }, [documents])

  useEffect(() => {
    const fetchReminders = async () => {
      const { count } = await supabase
        .from('reminders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .lte('reminder_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
      setRemindersCount(count || 0)
    }
    fetchReminders()
  }, [])

  const verified = documents.filter(d => d.verification_status === 'verified').length
  const expiringSoon = documents.filter(d => isExpiringSoon(d.expiry_date)).length
  const needsAction = documents.filter(d => d.verification_status === 'needs_correction' || isExpired(d.expiry_date)).length
  const recentDocs = documents.slice(0, 5)
  const expiringDocs = documents.filter(d => isExpiringSoon(d.expiry_date) || isExpired(d.expiry_date)).slice(0, 3)

  const firstName = userProfile?.full_name?.split(' ')[0] || 'there'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-slate-900 px-4 pt-12 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-slate-400 text-sm">Good morning</p>
            <h1 className="text-white text-xl font-bold">Hi, {firstName} 👋</h1>
          </div>
          <button onClick={() => navigate('/reminders')} className="relative">
            <Bell className="h-6 w-6 text-slate-300" />
            {remindersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center">
                {remindersCount}
              </span>
            )}
          </button>
        </div>

        {/* Search bar */}
        <button
          onClick={() => navigate('/search')}
          className="w-full flex items-center gap-3 bg-slate-800 rounded-xl px-4 py-3 text-slate-400 text-sm"
        >
          <Search className="h-4 w-4" />
          Search any document...
        </button>
      </div>

      <div className="px-4 -mt-2 space-y-4 pb-6">
        {/* CTA Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-4">
          <Button
            onClick={() => navigate('/upload')}
            className="h-12 gap-2 bg-white text-slate-900 border border-gray-200 hover:bg-gray-50 shadow-sm"
            variant="outline"
          >
            <Upload className="h-4 w-4" />
            Upload Document
          </Button>
          <Button
            onClick={() => navigate('/upload?mode=scan')}
            className="h-12 gap-2"
          >
            <Scan className="h-4 w-4" />
            Scan Document
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Total Documents"
            value={documents.length}
            icon={<FileText className="h-5 w-5 text-blue-600" />}
            bg="bg-blue-50"
            onClick={() => navigate('/documents')}
          />
          <StatCard
            label="Verified"
            value={verified}
            icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
            bg="bg-emerald-50"
            onClick={() => navigate('/documents?filter=verified')}
          />
          <StatCard
            label="Expiring Soon"
            value={expiringSoon}
            icon={<Clock className="h-5 w-5 text-amber-600" />}
            bg="bg-amber-50"
            onClick={() => navigate('/documents?filter=expiring')}
          />
          <StatCard
            label="Needs Action"
            value={needsAction}
            icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
            bg="bg-red-50"
            onClick={() => navigate('/documents?filter=action')}
          />
        </div>

        {/* Storage Usage */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Storage Used</span>
              <span className="text-sm text-gray-500">{formatFileSize(storageUsed)}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-900 rounded-full transition-all"
                style={{ width: `${Math.min((storageUsed / (1024 * 1024 * 1024)) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">of 1 GB free storage</p>
          </CardContent>
        </Card>

        {/* Quick Sections */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">Categories</h2>
            <button onClick={() => navigate('/documents')} className="text-sm text-slate-600">See all</button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_SECTIONS.map(section => (
              <button
                key={section.category}
                onClick={() => navigate(`/documents?category=${section.category}`)}
                className="flex flex-col items-center gap-2 p-3 bg-white rounded-xl border border-gray-100 shadow-sm active:scale-95 transition-transform"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${section.color}`}>
                  <section.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-gray-700">{section.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Expiring Soon */}
        {expiringDocs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">Expiring Soon</h2>
              <button onClick={() => navigate('/documents?filter=expiring')} className="text-sm text-slate-600">View all</button>
            </div>
            <div className="space-y-2">
              {expiringDocs.map(doc => (
                <DocumentCard key={doc.id} doc={doc} onClick={() => navigate(`/documents/${doc.id}`)} />
              ))}
            </div>
          </div>
        )}

        {/* Recently Uploaded */}
        {recentDocs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">Recent Documents</h2>
              <button onClick={() => navigate('/documents')} className="text-sm text-slate-600">View all</button>
            </div>
            <div className="space-y-2">
              {recentDocs.map(doc => (
                <DocumentCard key={doc.id} doc={doc} onClick={() => navigate(`/documents/${doc.id}`)} />
              ))}
            </div>
          </div>
        )}

        {documents.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-10 w-10 text-gray-300" />
            </div>
            <h3 className="text-gray-900 font-semibold mb-1">Your vault is empty</h3>
            <p className="text-gray-500 text-sm mb-6">Start by uploading your first document</p>
            <Button onClick={() => navigate('/upload')} className="gap-2">
              <Upload className="h-4 w-4" />
              Upload Document
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, bg, onClick }: {
  label: string
  value: number
  icon: React.ReactNode
  bg: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm text-left active:scale-95 transition-transform"
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${bg} mb-3`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </button>
  )
}

function DocumentCard({ doc, onClick }: { doc: Document; onClick: () => void }) {
  const expired = isExpired(doc.expiry_date)
  const expiring = isExpiringSoon(doc.expiry_date)

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm text-left active:scale-95 transition-transform"
    >
      <CategoryIcon category={doc.category} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 line-clamp-1">{doc.document_name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {doc.expiry_date && (
            <span className={`text-xs ${expired ? 'text-red-500' : expiring ? 'text-amber-500' : 'text-gray-400'}`}>
              {expired ? 'Expired' : 'Expires'} {formatDate(doc.expiry_date)}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <VerificationBadge status={doc.verification_status} showIcon={false} />
        <ChevronRight className="h-4 w-4 text-gray-300" />
      </div>
    </button>
  )
}
