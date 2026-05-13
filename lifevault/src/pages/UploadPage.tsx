import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import {
  Upload, Camera, FileText, X, ChevronRight, ChevronLeft,
  Loader2, Check, AlertCircle, Image, File
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/context/AuthContext'
import { useProfiles } from '@/hooks/useProfiles'
import { supabase } from '@/lib/supabase'
import { processDocument } from '@/services/ocrService'
import { classifyDocument, extractMetadata, suggestTags } from '@/services/aiService'
import { logActivity } from '@/services/activityService'
import { formatFileSize } from '@/lib/utils'
import type { DocumentCategory, VerificationStatus } from '@/types/database'

const CATEGORIES: { value: DocumentCategory; label: string }[] = [
  { value: 'identity', label: 'Identity' },
  { value: 'education', label: 'Education' },
  { value: 'family', label: 'Family' },
  { value: 'property', label: 'Property' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'medical', label: 'Medical' },
  { value: 'pet', label: 'Pet' },
  { value: 'finance', label: 'Finance' },
  { value: 'legal', label: 'Legal' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'other', label: 'Other' },
]

type Step = 'upload' | 'ocr' | 'classify' | 'review' | 'saving'

interface FormData {
  documentName: string
  category: DocumentCategory
  subCategory: string
  profileId: string
  issuer: string
  documentNumber: string
  issueDate: string
  expiryDate: string
  tags: string
  notes: string
  verificationStatus: VerificationStatus
}

export function UploadPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profiles, fetchProfiles } = useProfiles()
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [ocrText, setOcrText] = useState('')
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrError, setOcrError] = useState('')
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    documentName: '',
    category: 'other',
    subCategory: '',
    profileId: '',
    issuer: '',
    documentNumber: '',
    issueDate: '',
    expiryDate: '',
    tags: '',
    notes: '',
    verificationStatus: 'self_uploaded',
  })
  const cameraRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchProfiles() }, [fetchProfiles])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) handleFileSelect(acceptedFiles[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'application/pdf': [] },
    maxSize: 50 * 1024 * 1024,
    multiple: false,
  })

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile)
    setFormData(f => ({ ...f, documentName: selectedFile.name.replace(/\.[^/.]+$/, '') }))
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = e => setPreview(e.target?.result as string)
      reader.readAsDataURL(selectedFile)
    } else {
      setPreview(null)
    }
    setStep('ocr')
    runOCR(selectedFile)
  }

  const runOCR = async (f: File) => {
    setOcrProgress(0)
    setOcrError('')
    try {
      const result = await processDocument(f, setOcrProgress)
      setOcrText(result.text)

      if (result.text) {
        const classification = classifyDocument(result.text)
        const metadata = extractMetadata(result.text)
        const tags = suggestTags(result.text, classification.category)

        setFormData(prev => ({
          ...prev,
          category: classification.category,
          subCategory: classification.subCategory,
          issuer: metadata.issuer || '',
          documentNumber: metadata.documentNumber || '',
          issueDate: metadata.issueDate || '',
          expiryDate: metadata.expiryDate || '',
          tags: tags.join(', '),
          verificationStatus: result.confidence > 70 ? 'ocr_extracted' : 'self_uploaded',
        }))
      }
      setStep('classify')
    } catch {
      setOcrError('OCR failed. You can still add document details manually.')
      setStep('classify')
    }
  }

  const handleSave = async () => {
    if (!user || !file) return
    setSaving(true)
    setStep('saving')

    try {
      const ext = file.name.split('.').pop()
      const storagePath = `${user.id}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file, { cacheControl: '3600', upsert: false })

      if (uploadError) throw uploadError

      const tagArray = formData.tags.split(',').map(t => t.trim()).filter(Boolean)

      const { data: doc, error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          profile_id: formData.profileId || null,
          document_name: formData.documentName,
          category: formData.category,
          sub_category: formData.subCategory || null,
          issuer: formData.issuer || null,
          document_number: formData.documentNumber || null,
          issue_date: formData.issueDate || null,
          expiry_date: formData.expiryDate || null,
          verification_status: formData.verificationStatus,
          source: 'upload',
          storage_path: storagePath,
          file_type: file.type,
          file_size: file.size,
          ocr_text: ocrText || null,
          tags: tagArray,
          metadata: { notes: formData.notes },
        })
        .select()
        .single()

      if (dbError) throw dbError

      await logActivity(user.id, 'uploaded', doc.id, { documentName: doc.document_name })
      if (ocrText) await logActivity(user.id, 'ocr_processed', doc.id)

      navigate(`/documents/${doc.id}`)
    } catch (err) {
      console.error('Upload failed:', err)
      setSaving(false)
      setStep('review')
    }
  }

  const update = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Step: Upload
  if (step === 'upload') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Upload Document" onBack={() => navigate(-1)} />
        <div className="px-4 py-6 space-y-4">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-slate-900 bg-slate-50' : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <input {...getInputProps()} />
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Upload className="h-8 w-8 text-gray-400" />
            </div>
            <p className="font-medium text-gray-900 mb-1">Drop file here or tap to browse</p>
            <p className="text-sm text-gray-400">PDF, JPG, PNG up to 50MB</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => cameraRef.current?.click()}
              className="flex flex-col items-center gap-3 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm active:scale-95 transition-transform"
            >
              <Camera className="h-8 w-8 text-slate-600" />
              <span className="text-sm font-medium text-gray-700">Use Camera</span>
            </button>
            <button
              onClick={() => (document.querySelector('input[type=file]') as HTMLInputElement)?.click()}
              className="flex flex-col items-center gap-3 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm active:scale-95 transition-transform"
            >
              <FileText className="h-8 w-8 text-slate-600" />
              <span className="text-sm font-medium text-gray-700">Browse Files</span>
            </button>
          </div>

          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />
        </div>
      </div>
    )
  }

  // Step: OCR Processing
  if (step === 'ocr') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Processing Document" />
        <div className="px-4 py-12 flex flex-col items-center text-center">
          {preview && (
            <img src={preview} alt="Preview" className="w-48 h-48 object-cover rounded-2xl mb-6 shadow-md" />
          )}
          {!preview && file && (
            <div className="w-48 h-48 bg-gray-100 rounded-2xl flex flex-col items-center justify-center mb-6">
              <File className="h-12 w-12 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">{file.name}</span>
            </div>
          )}
          <div className="w-full max-w-sm space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Extracting text (OCR)...</span>
              <span className="font-medium">{ocrProgress}%</span>
            </div>
            <Progress value={ocrProgress} />
            <p className="text-xs text-gray-400">Analysing document contents automatically</p>
          </div>
        </div>
      </div>
    )
  }

  // Step: Classify + Review
  if (step === 'classify' || step === 'review') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Document Details" onBack={() => setStep('upload')} />
        <div className="px-4 py-4 space-y-4 pb-24">

          {/* File preview */}
          {file && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              {preview ? (
                <img src={preview} alt="" className="w-14 h-14 object-cover rounded-xl flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <File className="h-7 w-7 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 line-clamp-1">{file.name}</p>
                <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
              </div>
              <button onClick={() => { setFile(null); setStep('upload') }}>
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          )}

          {ocrError && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {ocrError}
            </div>
          )}

          {ocrText && (
            <details className="bg-blue-50 rounded-xl border border-blue-100">
              <summary className="p-4 text-sm font-medium text-blue-700 cursor-pointer">
                Extracted text preview
              </summary>
              <div className="px-4 pb-4">
                <p className="text-xs text-blue-600 font-mono whitespace-pre-wrap line-clamp-6">{ocrText}</p>
              </div>
            </details>
          )}

          <div className="space-y-4">
            <FormField label="Document Name *">
              <Input value={formData.documentName} onChange={e => update('documentName', e.target.value)} placeholder="e.g. Aadhaar Card" required />
            </FormField>

            <FormField label="Category *">
              <Select value={formData.category} onValueChange={v => update('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Sub-category">
              <Input value={formData.subCategory} onChange={e => update('subCategory', e.target.value)} placeholder="e.g. National ID" />
            </FormField>

            <FormField label="Assigned to Profile">
              <Select value={formData.profileId} onValueChange={v => update('profileId', v)}>
                <SelectTrigger><SelectValue placeholder="Select profile" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— None —</SelectItem>
                  {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.profile_type})</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Issuer / Authority">
              <Input value={formData.issuer} onChange={e => update('issuer', e.target.value)} placeholder="e.g. Government of India" />
            </FormField>

            <FormField label="Document Number">
              <Input value={formData.documentNumber} onChange={e => update('documentNumber', e.target.value)} placeholder="e.g. XXXX-XXXX-XXXX" />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Issue Date">
                <Input type="date" value={formData.issueDate} onChange={e => update('issueDate', e.target.value)} />
              </FormField>
              <FormField label="Expiry Date">
                <Input type="date" value={formData.expiryDate} onChange={e => update('expiryDate', e.target.value)} />
              </FormField>
            </div>

            <FormField label="Tags (comma separated)">
              <Input value={formData.tags} onChange={e => update('tags', e.target.value)} placeholder="e.g. government, id, renewal" />
            </FormField>

            <FormField label="Verification Status">
              <Select value={formData.verificationStatus} onValueChange={v => update('verificationStatus', v as VerificationStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="self_uploaded">Self Uploaded</SelectItem>
                  <SelectItem value="ocr_extracted">OCR Extracted</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="needs_correction">Needs Correction</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Notes">
              <Textarea value={formData.notes} onChange={e => update('notes', e.target.value)} placeholder="Any additional notes..." rows={3} />
            </FormField>
          </div>
        </div>

        {/* Fixed bottom action */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-gray-100 px-4 py-4 safe-bottom">
          <Button
            className="w-full h-12"
            onClick={handleSave}
            disabled={!formData.documentName || !file}
            loading={saving}
          >
            <Check className="h-4 w-4 mr-2" />
            Save to Vault
          </Button>
        </div>
      </div>
    )
  }

  // Step: Saving
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-slate-900 mb-4" />
      <p className="text-gray-600 font-medium">Saving to your vault...</p>
    </div>
  )
}

function Header({ title, onBack }: { title: string; onBack?: () => void }) {
  const navigate = useNavigate()
  return (
    <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 flex items-center gap-3">
      <button
        onClick={onBack || (() => navigate(-1))}
        className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 active:scale-95 transition-transform"
      >
        <ChevronLeft className="h-5 w-5 text-gray-600" />
      </button>
      <h1 className="text-lg font-bold text-gray-900">{title}</h1>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
