import {
  CreditCard, GraduationCap, Heart, Home, Car, Stethoscope,
  PawPrint, DollarSign, Scale, Shield, FileText
} from 'lucide-react'
import type { DocumentCategory } from '@/types/database'
import { cn } from '@/lib/utils'

const CATEGORY_CONFIG: Record<DocumentCategory, {
  icon: React.ComponentType<{ className?: string }>
  color: string
  bg: string
  label: string
}> = {
  identity: { icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Identity' },
  education: { icon: GraduationCap, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Education' },
  family: { icon: Heart, color: 'text-pink-600', bg: 'bg-pink-50', label: 'Family' },
  property: { icon: Home, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Property' },
  vehicle: { icon: Car, color: 'text-cyan-600', bg: 'bg-cyan-50', label: 'Vehicle' },
  medical: { icon: Stethoscope, color: 'text-red-600', bg: 'bg-red-50', label: 'Medical' },
  pet: { icon: PawPrint, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Pet' },
  finance: { icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50', label: 'Finance' },
  legal: { icon: Scale, color: 'text-slate-600', bg: 'bg-slate-50', label: 'Legal' },
  insurance: { icon: Shield, color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Insurance' },
  other: { icon: FileText, color: 'text-gray-600', bg: 'bg-gray-50', label: 'Other' },
}

export function CategoryIcon({ category, size = 'md' }: { category: DocumentCategory; size?: 'sm' | 'md' | 'lg' }) {
  const config = CATEGORY_CONFIG[category]
  const Icon = config.icon
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  }
  const iconClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-7 w-7',
  }

  return (
    <div className={cn('rounded-xl flex items-center justify-center flex-shrink-0', sizeClasses[size], config.bg)}>
      <Icon className={cn(iconClasses[size], config.color)} />
    </div>
  )
}

export function getCategoryLabel(category: DocumentCategory): string {
  return CATEGORY_CONFIG[category].label
}

export { CATEGORY_CONFIG }
