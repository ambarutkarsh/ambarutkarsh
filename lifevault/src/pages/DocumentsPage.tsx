import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Filter, FileText, ChevronRight } from 'lucide-react'
import { useDocuments } from '@/hooks/useDocuments'
import { useProfiles } from '@/hooks/useProfiles'
import { CategoryIcon, getCategoryLabel } from '@/components/documents/CategoryIcon'
import { VerificationBadge } from '@/components/documents/VerificationBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, isExpired, isExpiringSoon, formatFileSize } from '@/lib/utils'
import type { Document, DocumentCategory } from '@/types/database'

const CATEGORIES: DocumentCategory[] = [
  'identity', 'education', 'family', 'property', 'vehicle',
  'medical', 'pet', 'finance', 'legal', 'insurance', 'other'
]

export function DocumentsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { documents, loading, fetchDocuments } = useDocuments()
  const { profiles, fetchProfiles } = useProfiles()
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'all'>('all')
  const [filterMode, setFilterMode] = useState<string>('')

  useEffect(() => {
    fetchDocuments()
    fetchProfiles()
  }, [fetchDocuments, fetchProfiles])

  useEffect(() => {
    const cat = searchParams.get('category') as DocumentCategory
    const filter = searchParams.get('filter') || ''
    if (cat && CATEGORIES.includes(cat)) setSelectedCategory(cat)
    setFilterMode(filter)
  }, [searchParams])

  const filteredDocs = documents.filter(doc => {
    if (selectedCategory !== 'all' && doc.category !== selectedCategory) return false
    if (filterMode === 'expiring') return isExpiringSoon(doc.expiry_date) || isExpired(doc.expiry_date)
    if (filterMode === 'verified') return doc.verification_status === 'verified'
    if (filterMode === 'action') return doc.verification_status === 'needs_correction' || isExpired(doc.expiry_date)
    return true
  })

  const getProfileName = (profileId: string | null) => {
    if (!profileId) return null
    return profiles.find(p => p.id === profileId)?.name || null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 border-b border-gray-100">
        <div className="px-4 pt-12 pb-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Documents</h1>
            <span className="text-sm text-gray-400">{filteredDocs.length} docs</span>
          </div>
        </div>

        {/* Category filter tabs */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
          <CategoryChip
            label="All"
            active={selectedCategory === 'all'}
            onClick={() => setSelectedCategory('all')}
          />
          {CATEGORIES.map(cat => (
            <CategoryChip
              key={cat}
              label={getCategoryLabel(cat)}
              active={selectedCategory === cat}
              onClick={() => setSelectedCategory(cat)}
            />
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-slate-900 border-t-transparent rounded-full" />
          </div>
        )}

        {!loading && filteredDocs.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-gray-500 text-sm">No documents found</p>
            <Button className="mt-4 gap-2" onClick={() => navigate('/upload')}>
              Upload first document
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {filteredDocs.map(doc => (
            <DocumentListItem
              key={doc.id}
              doc={doc}
              ownerName={getProfileName(doc.profile_id)}
              onClick={() => navigate(`/documents/${doc.id}`)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        active
          ? 'bg-slate-900 text-white'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  )
}

function DocumentListItem({ doc, ownerName, onClick }: { doc: Document; ownerName: string | null; onClick: () => void }) {
  const expired = isExpired(doc.expiry_date)
  const expiring = isExpiringSoon(doc.expiry_date)

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm text-left active:scale-[0.98] transition-transform"
    >
      <CategoryIcon category={doc.category} size="md" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 line-clamp-1 text-sm">{doc.document_name}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {ownerName && (
            <span className="text-xs text-gray-400">{ownerName}</span>
          )}
          {doc.issuer && (
            <span className="text-xs text-gray-400">· {doc.issuer}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <VerificationBadge status={doc.verification_status} showIcon={false} />
          {doc.expiry_date && (
            <span className={`text-xs ${expired ? 'text-red-500 font-medium' : expiring ? 'text-amber-500' : 'text-gray-400'}`}>
              {expired ? '⚠ Expired ' : expiring ? '⏰ ' : ''}{formatDate(doc.expiry_date)}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
    </button>
  )
}
