import { CheckCircle, Upload, Scan, AlertCircle, AlertTriangle, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { VerificationStatus } from '@/types/database'

const STATUS_CONFIG: Record<VerificationStatus, {
  label: string
  variant: 'success' | 'info' | 'secondary' | 'destructive' | 'warning' | 'outline'
  icon: React.ComponentType<{ className?: string }>
}> = {
  verified: { label: 'Verified', variant: 'success', icon: CheckCircle },
  self_uploaded: { label: 'Self Uploaded', variant: 'info', icon: Upload },
  ocr_extracted: { label: 'OCR Extracted', variant: 'secondary', icon: Scan },
  expired: { label: 'Expired', variant: 'destructive', icon: XCircle },
  needs_correction: { label: 'Needs Correction', variant: 'warning', icon: AlertTriangle },
  mismatch_detected: { label: 'Mismatch', variant: 'destructive', icon: AlertCircle },
}

export function VerificationBadge({ status, showIcon = true }: { status: VerificationStatus; showIcon?: boolean }) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  return (
    <Badge variant={config.variant as Parameters<typeof Badge>[0]['variant']} className="gap-1">
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  )
}
