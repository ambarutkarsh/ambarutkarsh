import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Filter, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CategoryIcon, getCategoryLabel } from '@/components/documents/CategoryIcon'
import { VerificationBadge } from '@/components/documents/VerificationBadge'
import { useDocuments } from '@/hooks/useDocuments'
import { useProfiles } from '@/hooks/useProfiles'
import { formatDate, isExpired, isExpiringSoon } from '@/lib/utils'
import type { Document, DocumentCategory, VerificationStatus } from '@/types/database'

const CATEGORIES: DocumentCategory[] = [
  'identity', 'education', 'family', 'property', 'vehicle',
  'medical', 'pet', 'finance', 'legal', 'insurance', 'other'
]

export function SearchPage() {
  const navigate = useNavigate()
  const { documents, fetchDocuments } = useDocuments()
  const { profiles, fetchProfiles } = useProfiles()
  const [query, setQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filterCategory, setFilterCategory] = useState<DocumentCategory | ''>('')
  const [filterStatus, setFilterStatus] = useState<VerificationStatus | ''>('')
  const [filterOwner, setFilterOwner] = useState('')
  const [filterExpiry, setFilterExpiry] = useState<'expiring' | 'expired' | ''>('')

  useEffect(() => {
    fetchDocuments()
    fetchProfiles()
  }, [fetchDocuments, fetchProfiles])

  const filteredDocuments = useCallback(() => {
    return documents.filter(doc => {
      const q = query.toLowerCase()
      const matchesQuery = !q || [
        doc.document_name,
        doc.category,
        doc.issuer || '',
        doc.document_number || '',
        doc.ocr_text || '',
        doc.sub_category || '',
        ...(doc.tags || []),
      ].some(field => field.toLowerCase().includes(q))

      const matchesCategory = !filterCategory || doc.category === filterCategory
      const matchesStatus = !filterStatus || doc.verification_status === filterStatus
      const matchesOwner = !filterOwner || doc.profile_id === filterOwner
      const matchesExpiry =
        !filterExpiry ||
        (filterExpiry === 'expiring' && isExpiringSoon(doc.expiry_date)) ||
        (filterExpiry === 'expired' && isExpired(doc.expiry_date))

      return matchesQuery && matchesCategory && matchesStatus && matchesOwner && matchesExpiry
    })
  }, [documents, query, filterCategory, filterStatus, filterOwner, filterExpiry])

  const results = filteredDocuments()
  const hasFilters = filterCategory || filterStatus || filterOwner || filterExpiry
  const getProfileName = (id: string | null) => profiles.find(p => p.id === id)?.name

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white sticky top-0 z-10 border-b border-gray-100">
        <div className="px-4 pt-12 pb-3 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                className="pl-9 pr-9"
                placeholder="Search documents, text, tags..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
              />
              {query && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => setQuery('')}
                >
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-colors ${hasFilters ? 'bg-slate-900 border-slate-900 text-white' : 'border-gray-200 text-gray-600'}`}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>

          {showFilters && (
            <div className="space-y-2 pb-2">
              <div className="grid grid-cols-2 gap-2">
                <Select value={filterCategory} onValueChange={v => setFilterCategory(v as DocumentCategory | '')}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{getCategoryLabel(c)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={v => setFilterStatus(v as VerificationStatus | '')}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="self_uploaded">Self Uploaded</SelectItem>
                    <SelectItem value="ocr_extracted">OCR Extracted</SelectItem>
                    <SelectItem value="needs_correction">Needs Correction</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterOwner} onValueChange={setFilterOwner}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Owner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Owners</SelectItem>
                    {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterExpiry} onValueChange={v => setFilterExpiry(v as typeof filterExpiry)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Expiry" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any Expiry</SelectItem>
                    <SelectItem value="expiring">Expiring Soon</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {hasFilters && (
                <button
                  onClick={() => { setFilterCategory(''); setFilterStatus(''); setFilterOwner(''); setFilterExpiry('') }}
                  className="text-xs text-red-500 hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-4">
        {(query || hasFilters) ? (
          <>
            <p className="text-sm text-gray-400 mb-3">{results.length} result{results.length !== 1 ? 's' : ''}</p>
            {results.length === 0 ? (
              <div className="text-center py-16">
                <Search className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400">No documents found</p>
                <p className="text-sm text-gray-300 mt-1">Try different keywords or filters</p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map(doc => (
                  <SearchResultCard
                    key={doc.id}
                    doc={doc}
                    ownerName={getProfileName(doc.profile_id) || undefined}
                    query={query}
                    onClick={() => navigate(`/documents/${doc.id}`)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <Search className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Search your vault</p>
            <p className="text-sm text-gray-400 mt-1">Search by name, category, tag, or document text</p>
          </div>
        )}
      </div>
    </div>
  )
}

function SearchResultCard({ doc, ownerName, query, onClick }: {
  doc: Document; ownerName?: string; query: string; onClick: () => void
}) {
  const expired = isExpired(doc.expiry_date)
  const expiring = isExpiringSoon(doc.expiry_date)

  const highlight = (text: string) => {
    if (!query) return text
    const idx = text.toLowerCase().indexOf(query.toLowerCase())
    if (idx === -1) return text
    return text.slice(0, idx) + '**' + text.slice(idx, idx + query.length) + '**' + text.slice(idx + query.length)
  }

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm text-left active:scale-[0.98] transition-transform"
    >
      <CategoryIcon category={doc.category} size="md" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-sm line-clamp-1">{doc.document_name}</p>
        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-400 flex-wrap">
          <span>{getCategoryLabel(doc.category)}</span>
          {ownerName && <><span>·</span><span>{ownerName}</span></>}
          {doc.issuer && <><span>·</span><span>{doc.issuer}</span></>}
        </div>
        {doc.ocr_text && query && doc.ocr_text.toLowerCase().includes(query.toLowerCase()) && (
          <p className="text-xs text-blue-500 mt-1 line-clamp-1">Found in document text</p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <VerificationBadge status={doc.verification_status} showIcon={false} />
          {doc.expiry_date && (
            <span className={`text-xs ${expired ? 'text-red-500' : expiring ? 'text-amber-500' : 'text-gray-400'}`}>
              {formatDate(doc.expiry_date)}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
    </button>
  )
}
