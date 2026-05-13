import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { Document, DocumentCategory, VerificationStatus } from '@/types/database'

export function useDocuments() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDocuments = useCallback(async (filters?: {
    category?: DocumentCategory
    profileId?: string
    search?: string
    verificationStatus?: VerificationStatus
  }) => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (filters?.category) query = query.eq('category', filters.category)
      if (filters?.profileId) query = query.eq('profile_id', filters.profileId)
      if (filters?.verificationStatus) query = query.eq('verification_status', filters.verificationStatus)
      if (filters?.search) {
        query = query.or(
          `document_name.ilike.%${filters.search}%,issuer.ilike.%${filters.search}%,document_number.ilike.%${filters.search}%,ocr_text.ilike.%${filters.search}%`
        )
      }

      const { data, error } = await query
      if (error) throw error
      setDocuments(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch documents')
    } finally {
      setLoading(false)
    }
  }, [user])

  const getDocument = useCallback(async (id: string) => {
    if (!user) return null
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()
    if (error) return null
    return data
  }, [user])

  const updateDocument = useCallback(async (id: string, updates: Partial<Document>) => {
    if (!user) return { error: 'Not authenticated' }
    const { error } = await supabase
      .from('documents')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
    return { error: error?.message || null }
  }, [user])

  const deleteDocument = useCallback(async (id: string, storagePath: string) => {
    if (!user) return { error: 'Not authenticated' }
    await supabase.storage.from('documents').remove([storagePath])
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    return { error: error?.message || null }
  }, [user])

  const getSignedUrl = useCallback(async (storagePath: string, expiresIn = 3600) => {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, expiresIn)
    if (error) return null
    return data.signedUrl
  }, [])

  return { documents, loading, error, fetchDocuments, getDocument, updateDocument, deleteDocument, getSignedUrl }
}
