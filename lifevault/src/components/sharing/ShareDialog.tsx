import { useState } from 'react'
import { Share2, Copy, Mail, MessageCircle, Phone, Download, Check, X, Lock, Clock, Eye } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { logActivity } from '@/services/activityService'
import { generateShareMessage } from '@/services/aiService'
import type { Document, ShareChannel } from '@/types/database'

interface Props {
  doc: Document
  onClose: () => void
}

export function ShareDialog({ doc, onClose }: Props) {
  const { user } = useAuth()
  const [channel, setChannel] = useState<ShareChannel>('link')
  const [recipientName, setRecipientName] = useState('')
  const [recipientContact, setRecipientContact] = useState('')
  const [purpose, setPurpose] = useState('')
  const [isPasswordProtected, setIsPasswordProtected] = useState(false)
  const [password, setPassword] = useState('')
  const [expiryHours, setExpiryHours] = useState('24')
  const [isWatermarked, setIsWatermarked] = useState(false)
  const [allowDownload, setAllowDownload] = useState(true)
  const [isOneTime, setIsOneTime] = useState(false)
  const [loading, setLoading] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    if (!user) return
    setLoading(true)
    try {
      const expiryAt = new Date(Date.now() + parseInt(expiryHours) * 60 * 60 * 1000).toISOString()

      const { data: signedData } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.storage_path, parseInt(expiryHours) * 3600)

      const signedUrl = signedData?.signedUrl || null

      const { data: share } = await supabase
        .from('document_shares')
        .insert({
          user_id: user.id,
          document_id: doc.id,
          recipient_name: recipientName || null,
          recipient_contact: recipientContact || null,
          channel,
          purpose: purpose || null,
          is_password_protected: isPasswordProtected,
          password_hash: isPasswordProtected ? btoa(password) : null,
          expiry_at: expiryAt,
          max_access_count: isOneTime ? 1 : null,
          is_watermarked: isWatermarked,
          allow_download: allowDownload,
          signed_url: signedUrl,
          status: 'active',
        })
        .select()
        .single()

      if (signedUrl) {
        setShareUrl(signedUrl)
        await logActivity(user.id, 'shared', doc.id, { channel, recipient: recipientName || recipientContact })

        if (channel === 'whatsapp' && recipientContact) {
          const message = generateShareMessage(doc.document_name, purpose || 'verification', expiryAt)
          const waUrl = `https://wa.me/${recipientContact.replace(/\D/g, '')}?text=${encodeURIComponent(message + '\n\n' + signedUrl)}`
          window.open(waUrl, '_blank')
        } else if (channel === 'email' && recipientContact) {
          const subject = `${doc.document_name} — shared securely`
          const body = generateShareMessage(doc.document_name, purpose || 'verification', expiryAt) + '\n\n' + signedUrl
          window.location.href = `mailto:${recipientContact}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
        } else if (channel === 'sms' && recipientContact) {
          const message = generateShareMessage(doc.document_name, purpose || 'verification') + '\n' + signedUrl
          window.location.href = `sms:${recipientContact}?body=${encodeURIComponent(message)}`
        }
      }
    } catch (err) {
      console.error('Share failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share Document</DialogTitle>
        </DialogHeader>

        {shareUrl ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 rounded-xl p-4 text-center">
              <Check className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-medium text-emerald-700">Secure link generated</p>
              <p className="text-xs text-emerald-500 mt-1">Expires in {expiryHours} hours</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
              <p className="text-xs text-gray-500 flex-1 truncate font-mono">{shareUrl}</p>
              <button onClick={handleCopy} className="flex-shrink-0">
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-gray-400" />}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <ChannelButton icon={<Mail className="h-5 w-5" />} label="Email" onClick={() => {
                const body = `Please find the document: ${shareUrl}`
                window.location.href = `mailto:?subject=${encodeURIComponent(doc.document_name)}&body=${encodeURIComponent(body)}`
              }} />
              <ChannelButton icon={<MessageCircle className="h-5 w-5" />} label="WhatsApp" onClick={() => {
                window.open(`https://wa.me/?text=${encodeURIComponent(doc.document_name + ': ' + shareUrl)}`, '_blank')
              }} />
              <ChannelButton icon={<Copy className="h-5 w-5" />} label="Copy" onClick={handleCopy} />
            </div>

            <Button className="w-full" variant="outline" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Channel Selection */}
            <div>
              <Label className="text-xs text-gray-500 mb-2 block">Share via</Label>
              <div className="grid grid-cols-4 gap-2">
                {(['email', 'whatsapp', 'sms', 'link'] as ShareChannel[]).map(ch => (
                  <button
                    key={ch}
                    onClick={() => setChannel(ch)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-medium transition-colors ${
                      channel === ch ? 'border-slate-900 bg-slate-900 text-white' : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    {ch === 'email' && <Mail className="h-4 w-4" />}
                    {ch === 'whatsapp' && <MessageCircle className="h-4 w-4" />}
                    {ch === 'sms' && <Phone className="h-4 w-4" />}
                    {ch === 'link' && <Copy className="h-4 w-4" />}
                    {ch === 'email' ? 'Email' : ch === 'whatsapp' ? 'WhatsApp' : ch === 'sms' ? 'SMS' : 'Link'}
                  </button>
                ))}
              </div>
            </div>

            {channel !== 'link' && (
              <div className="space-y-1.5">
                <Label>Recipient {channel === 'email' ? 'email' : 'phone'}</Label>
                <Input
                  placeholder={channel === 'email' ? 'recipient@email.com' : '+91 98765 43210'}
                  value={recipientContact}
                  onChange={e => setRecipientContact(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Recipient name</Label>
              <Input placeholder="Optional" value={recipientName} onChange={e => setRecipientName(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Purpose</Label>
              <Input placeholder="e.g. KYC verification, visa application" value={purpose} onChange={e => setPurpose(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Link expires in</Label>
              <Select value={expiryHours} onValueChange={setExpiryHours}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="6">6 hours</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="72">3 days</SelectItem>
                  <SelectItem value="168">7 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Protection Options */}
            <div className="space-y-3 bg-gray-50 rounded-xl p-4">
              <h4 className="text-sm font-medium text-gray-700">Protection</h4>
              <ToggleRow
                icon={<Lock className="h-4 w-4" />}
                label="Password protect"
                checked={isPasswordProtected}
                onCheckedChange={setIsPasswordProtected}
              />
              {isPasswordProtected && (
                <Input type="password" placeholder="Set access password" value={password} onChange={e => setPassword(e.target.value)} />
              )}
              <ToggleRow
                icon={<Eye className="h-4 w-4" />}
                label="One-time access"
                checked={isOneTime}
                onCheckedChange={setIsOneTime}
              />
              <ToggleRow
                icon={<Share2 className="h-4 w-4" />}
                label="Add watermark"
                checked={isWatermarked}
                onCheckedChange={setIsWatermarked}
              />
              <ToggleRow
                icon={<Download className="h-4 w-4" />}
                label="Allow download"
                checked={allowDownload}
                onCheckedChange={setAllowDownload}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleShare} loading={loading}>Generate Link</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ChannelButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 p-3 bg-gray-50 rounded-xl text-xs font-medium text-gray-600 active:scale-95 transition-transform">
      {icon}
      {label}
    </button>
  )
}

function ToggleRow({ icon, label, checked, onCheckedChange }: {
  icon: React.ReactNode; label: string; checked: boolean; onCheckedChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        {icon} {label}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}
