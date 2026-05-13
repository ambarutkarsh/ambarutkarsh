import { useEffect, useState } from 'react'
import {
  User, Heart, Baby, Users, PawPrint, Car, Home, Plus,
  ChevronRight, Trash2, X, ChevronLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useProfiles } from '@/hooks/useProfiles'
import type { Profile, ProfileType } from '@/types/database'
import { formatDate } from '@/lib/utils'

const PROFILE_ICONS: Record<ProfileType, React.ComponentType<{ className?: string }>> = {
  self: User,
  spouse: Heart,
  child: Baby,
  parent: Users,
  pet: PawPrint,
  vehicle: Car,
  property: Home,
  other: User,
}

const PROFILE_COLORS: Record<ProfileType, string> = {
  self: 'bg-blue-50 text-blue-600',
  spouse: 'bg-pink-50 text-pink-600',
  child: 'bg-purple-50 text-purple-600',
  parent: 'bg-amber-50 text-amber-600',
  pet: 'bg-orange-50 text-orange-600',
  vehicle: 'bg-cyan-50 text-cyan-600',
  property: 'bg-emerald-50 text-emerald-600',
  other: 'bg-gray-50 text-gray-600',
}

const PROFILE_TYPES: { value: ProfileType; label: string }[] = [
  { value: 'self', label: 'Self' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'child', label: 'Child' },
  { value: 'parent', label: 'Parent' },
  { value: 'pet', label: 'Pet' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'property', label: 'Property' },
  { value: 'other', label: 'Other' },
]

export function ProfilesPage() {
  const { profiles, loading, fetchProfiles, createProfile, deleteProfile } = useProfiles()
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => { fetchProfiles() }, [fetchProfiles])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Profiles</h1>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add Profile
        </Button>
      </div>

      <div className="px-4 py-4 space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-slate-900 border-t-transparent rounded-full" />
          </div>
        )}

        {!loading && profiles.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <User className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-gray-500 text-sm mb-4">No profiles yet</p>
            <Button onClick={() => setShowCreate(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Add your first profile
            </Button>
          </div>
        )}

        {profiles.map(profile => (
          <ProfileCard key={profile.id} profile={profile} onDelete={() => deleteProfile(profile.id)} />
        ))}
      </div>

      {showCreate && (
        <CreateProfileDialog onClose={() => { setShowCreate(false); fetchProfiles() }} />
      )}
    </div>
  )
}

function ProfileCard({ profile, onDelete }: { profile: Profile; onDelete: () => void }) {
  const Icon = PROFILE_ICONS[profile.profile_type]
  const color = PROFILE_COLORS[profile.profile_type]
  const meta = profile.metadata as Record<string, string>

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">{profile.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="secondary" className="text-xs capitalize">{profile.profile_type}</Badge>
            {profile.relationship && <span className="text-xs text-gray-400">{profile.relationship}</span>}
          </div>
        </div>
        <button
          onClick={() => window.confirm('Delete this profile?') && onDelete()}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-400"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Profile specific metadata */}
      {Object.keys(meta).length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-50 grid grid-cols-2 gap-2">
          {meta.dob && (
            <div><p className="text-xs text-gray-400">Date of Birth</p><p className="text-xs font-medium">{meta.dob}</p></div>
          )}
          {meta.mobile && (
            <div><p className="text-xs text-gray-400">Mobile</p><p className="text-xs font-medium">{meta.mobile}</p></div>
          )}
          {meta.species && (
            <div><p className="text-xs text-gray-400">Species</p><p className="text-xs font-medium">{meta.species}</p></div>
          )}
          {meta.breed && (
            <div><p className="text-xs text-gray-400">Breed</p><p className="text-xs font-medium">{meta.breed}</p></div>
          )}
          {meta.registration && (
            <div><p className="text-xs text-gray-400">Registration</p><p className="text-xs font-medium font-mono">{meta.registration}</p></div>
          )}
          {meta.make && (
            <div><p className="text-xs text-gray-400">Make/Model</p><p className="text-xs font-medium">{meta.make} {meta.model}</p></div>
          )}
          {meta.address && (
            <div className="col-span-2"><p className="text-xs text-gray-400">Address</p><p className="text-xs font-medium">{meta.address}</p></div>
          )}
        </div>
      )}
    </div>
  )
}

function CreateProfileDialog({ onClose }: { onClose: () => void }) {
  const { createProfile } = useProfiles()
  const [profileType, setProfileType] = useState<ProfileType>('self')
  const [name, setName] = useState('')
  const [relationship, setRelationship] = useState('')
  const [meta, setMeta] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const updateMeta = (key: string, value: string) => setMeta(prev => ({ ...prev, [key]: value }))

  const handleCreate = async () => {
    if (!name.trim()) return
    setLoading(true)
    await createProfile({ profile_type: profileType, name, relationship, metadata: meta })
    setLoading(false)
    onClose()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Profile type</Label>
            <Select value={profileType} onValueChange={v => setProfileType(v as ProfileType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROFILE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{profileType === 'pet' ? 'Pet name' : profileType === 'vehicle' ? 'Vehicle name' : profileType === 'property' ? 'Property name' : 'Full name'} *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Enter name" />
          </div>

          {['self', 'spouse', 'child', 'parent', 'other'].includes(profileType) && (
            <>
              <div className="space-y-1.5">
                <Label>Relationship</Label>
                <Input value={relationship} onChange={e => setRelationship(e.target.value)} placeholder="e.g. Spouse, Child, Father" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Date of birth</Label>
                  <Input type="date" onChange={e => updateMeta('dob', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Gender</Label>
                  <Select onValueChange={v => updateMeta('gender', v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Mobile</Label>
                <Input type="tel" placeholder="+91 98765 43210" onChange={e => updateMeta('mobile', e.target.value)} />
              </div>
            </>
          )}

          {profileType === 'pet' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Species</Label>
                  <Input placeholder="Dog, Cat, etc." onChange={e => updateMeta('species', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Breed</Label>
                  <Input placeholder="e.g. Labrador" onChange={e => updateMeta('breed', e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Microchip number</Label>
                <Input placeholder="Optional" onChange={e => updateMeta('microchip', e.target.value)} />
              </div>
            </>
          )}

          {profileType === 'vehicle' && (
            <>
              <div className="space-y-1.5">
                <Label>Registration number</Label>
                <Input placeholder="e.g. MH01AB1234" onChange={e => updateMeta('registration', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Make</Label>
                  <Input placeholder="e.g. Maruti" onChange={e => updateMeta('make', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Model</Label>
                  <Input placeholder="e.g. Swift" onChange={e => updateMeta('model', e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Year</Label>
                <Input placeholder="e.g. 2022" onChange={e => updateMeta('year', e.target.value)} />
              </div>
            </>
          )}

          {profileType === 'property' && (
            <>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Textarea placeholder="Full address" onChange={e => updateMeta('address', e.target.value)} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label>Property type</Label>
                <Select onValueChange={v => updateMeta('propertyType', v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">Flat/Apartment</SelectItem>
                    <SelectItem value="house">Independent House</SelectItem>
                    <SelectItem value="land">Land/Plot</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleCreate} loading={loading} disabled={!name.trim()}>Create Profile</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
