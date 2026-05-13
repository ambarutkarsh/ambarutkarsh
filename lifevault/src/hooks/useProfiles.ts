import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { Profile, ProfileType } from '@/types/database'

export function useProfiles() {
  const { user } = useAuth()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)

  const fetchProfiles = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('lifevault_profiles')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    setProfiles(data || [])
    setLoading(false)
  }, [user])

  const createProfile = useCallback(async (profile: {
    profile_type: ProfileType
    name: string
    relationship?: string
    metadata?: Record<string, unknown>
  }) => {
    if (!user) return { error: 'Not authenticated', data: null }
    const { data, error } = await supabase
      .from('lifevault_profiles')
      .insert({ ...profile, user_id: user.id, metadata: profile.metadata || {} })
      .select()
      .single()
    if (!error) setProfiles(prev => [...prev, data])
    return { error: error?.message || null, data }
  }, [user])

  const updateProfile = useCallback(async (id: string, updates: Partial<Profile>) => {
    if (!user) return { error: 'Not authenticated' }
    const { error } = await supabase
      .from('lifevault_profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
    if (!error) setProfiles(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
    return { error: error?.message || null }
  }, [user])

  const deleteProfile = useCallback(async (id: string) => {
    if (!user) return { error: 'Not authenticated' }
    const { error } = await supabase
      .from('lifevault_profiles')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    if (!error) setProfiles(prev => prev.filter(p => p.id !== id))
    return { error: error?.message || null }
  }, [user])

  return { profiles, loading, fetchProfiles, createProfile, updateProfile, deleteProfile }
}
