import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'purple'
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        {
          'border-transparent bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]': variant === 'default',
          'border-transparent bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]': variant === 'secondary',
          'border-transparent bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]': variant === 'destructive',
          'border-[hsl(var(--border))]': variant === 'outline',
          'border-transparent bg-emerald-100 text-emerald-700': variant === 'success',
          'border-transparent bg-amber-100 text-amber-700': variant === 'warning',
          'border-transparent bg-blue-100 text-blue-700': variant === 'info',
          'border-transparent bg-purple-100 text-purple-700': variant === 'purple',
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
