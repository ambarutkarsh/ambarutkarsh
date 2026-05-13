import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, Lock, Cloud, HardDrive, Download, Trash2, Bell,
  Shield, FileText, ChevronRight, LogOut, Smartphone, Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

export function SettingsPage() {
  const { user, userProfile, signOut, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [editingProfile, setEditingProfile] = useState(false)
  const [fullName, setFullName] = useState(userProfile?.full_name || '')
  const [mobile, setMobile] = useState(userProfile?.mobile || '')
  const [saving, setSaving] = useState(false)
  const [cloudSync, setCloudSync] = useState(true)
  const [notifications, setNotifications] = useState(true)
  const [appLock, setAppLock] = useState(false)

  const handleSaveProfile = async () => {
    if (!user) return
    setSaving(true)
    await supabase
      .from('users_profile')
      .update({ full_name: fullName, mobile, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
    await refreshProfile()
    setSaving(false)
    setEditingProfile(false)
  }

  const handleExportData = async () => {
    if (!user) return
    const { data: docs } = await supabase.from('documents').select('*').eq('user_id', user.id)
    const { data: profiles } = await supabase.from('lifevault_profiles').select('*').eq('user_id', user.id)
    const exportData = { documents: docs, profiles, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lifevault-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you absolutely sure? This will permanently delete your account and all documents.')) return
    if (!window.confirm('This action cannot be undone. Type DELETE to confirm.')) return
    // In production, this would call an edge function to handle full account deletion
    alert('Account deletion request submitted. You will receive an email confirmation.')
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Profile */}
        <SettingsSection title="Account">
          {editingProfile ? (
            <div className="p-4 space-y-3">
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Mobile</Label>
                <Input type="tel" value={mobile} onChange={e => setMobile(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled className="opacity-60" />
                <p className="text-xs text-gray-400">Email cannot be changed</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setEditingProfile(false)}>Cancel</Button>
                <Button onClick={handleSaveProfile} loading={saving}>Save</Button>
              </div>
            </div>
          ) : (
            <SettingsRow
              icon={<User className="h-4 w-4" />}
              label="Profile"
              description={userProfile?.full_name || user?.email || ''}
              onClick={() => setEditingProfile(true)}
            />
          )}
          <SettingsRow
            icon={<Lock className="h-4 w-4" />}
            label="Change Password"
            description="Update your account password"
            onClick={async () => {
              if (user?.email) {
                await supabase.auth.resetPasswordForEmail(user.email)
                alert('Password reset email sent!')
              }
            }}
          />
        </SettingsSection>

        {/* Security */}
        <SettingsSection title="Security">
          <SettingsToggle
            icon={<Smartphone className="h-4 w-4" />}
            label="App Lock"
            description="Biometric / PIN lock (coming soon)"
            checked={appLock}
            onCheckedChange={setAppLock}
            disabled
          />
          <SettingsToggle
            icon={<Bell className="h-4 w-4" />}
            label="Notifications"
            description="Expiry and reminder alerts"
            checked={notifications}
            onCheckedChange={setNotifications}
          />
        </SettingsSection>

        {/* Storage */}
        <SettingsSection title="Storage & Sync">
          <SettingsToggle
            icon={<Cloud className="h-4 w-4" />}
            label="Cloud Sync"
            description="Automatically sync to Supabase cloud"
            checked={cloudSync}
            onCheckedChange={setCloudSync}
          />
          <SettingsRow
            icon={<HardDrive className="h-4 w-4" />}
            label="Storage Usage"
            description="View your storage consumption"
            onClick={() => navigate('/')}
          />
        </SettingsSection>

        {/* Data */}
        <SettingsSection title="Your Data">
          <SettingsRow
            icon={<Download className="h-4 w-4" />}
            label="Export My Data"
            description="Download all your documents as JSON"
            onClick={handleExportData}
          />
          <SettingsRow
            icon={<Eye className="h-4 w-4" />}
            label="Privacy Policy"
            description="How we protect your data"
            onClick={() => {}}
          />
          <SettingsRow
            icon={<FileText className="h-4 w-4" />}
            label="Terms of Service"
            description="Usage terms and conditions"
            onClick={() => {}}
          />
        </SettingsSection>

        {/* Danger Zone */}
        <SettingsSection title="Danger Zone">
          <button
            onClick={handleDeleteAccount}
            className="flex items-center gap-3 w-full p-4 text-left"
          >
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50">
              <Trash2 className="h-4 w-4 text-red-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-600">Delete Account</p>
              <p className="text-xs text-gray-400">Permanently delete all data</p>
            </div>
          </button>
        </SettingsSection>

        {/* Sign out */}
        <Button
          variant="outline"
          className="w-full gap-2 text-gray-600 border-gray-200"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>

        <p className="text-center text-xs text-gray-300 pb-4">LifeVault v1.0.0</p>
      </div>
    </div>
  )
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">{title}</p>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
        {children}
      </div>
    </div>
  )
}

function SettingsRow({ icon, label, description, onClick }: {
  icon: React.ReactNode; label: string; description: string; onClick: () => void
}) {
  return (
    <button className="flex items-center gap-3 w-full p-4 text-left hover:bg-gray-50 transition-colors" onClick={onClick}>
      <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-400 truncate">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
    </button>
  )
}

function SettingsToggle({ icon, label, description, checked, onCheckedChange, disabled }: {
  icon: React.ReactNode; label: string; description: string
  checked: boolean; onCheckedChange: (v: boolean) => void; disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-400 truncate">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  )
}
