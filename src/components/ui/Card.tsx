import { type HTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

// ─── Card ─────────────────────────────────────────────────────────────────────
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
  shadow?: 'none' | 'sm' | 'md' | 'lg'
  border?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ padding = 'md', shadow = 'sm', border = true, className, children, ...props }, ref) => {
    const paddingMap = { none: '', sm: 'p-3', md: 'p-5', lg: 'p-6' }
    const shadowMap = { none: '', sm: 'shadow-sm', md: 'shadow-md', lg: 'shadow-lg' }
    return (
      <div
        ref={ref}
        className={clsx(
          'bg-white rounded-xl',
          paddingMap[padding],
          shadowMap[shadow],
          border && 'border border-gray-200',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Card.displayName = 'Card'

// ─── CardHeader ───────────────────────────────────────────────────────────────
export const CardHeader = ({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={clsx('flex items-center justify-between mb-4', className)}
    {...props}
  >
    {children}
  </div>
)

// ─── CardTitle ────────────────────────────────────────────────────────────────
export const CardTitle = ({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={clsx('text-base font-semibold text-gray-900', className)} {...props}>
    {children}
  </h3>
)

// ─── CardContent ─────────────────────────────────────────────────────────────
export const CardContent = ({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={clsx(className)} {...props}>
    {children}
  </div>
)

// ─── StatCard ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  change?: { value: number; label: string }
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
  className?: string
}

const colorMap = {
  blue:   { bg: 'bg-blue-50',   icon: 'bg-[#1e3a5f] text-white', text: 'text-[#1e3a5f]' },
  green:  { bg: 'bg-green-50',  icon: 'bg-green-600 text-white',  text: 'text-green-700' },
  yellow: { bg: 'bg-yellow-50', icon: 'bg-yellow-500 text-white', text: 'text-yellow-700' },
  red:    { bg: 'bg-red-50',    icon: 'bg-red-600 text-white',    text: 'text-red-700' },
  purple: { bg: 'bg-purple-50', icon: 'bg-purple-600 text-white', text: 'text-purple-700' },
}

export const StatCard = ({ label, value, icon, change, color = 'blue', className }: StatCardProps) => {
  const c = colorMap[color]
  return (
    <Card className={clsx(c.bg, 'border-0', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className={clsx('text-2xl font-bold mt-1', c.text)}>{value}</p>
          {change && (
            <p className={clsx('text-xs mt-1', change.value >= 0 ? 'text-green-600' : 'text-red-500')}>
              {change.value >= 0 ? '▲' : '▼'} {Math.abs(change.value)} {change.label}
            </p>
          )}
        </div>
        <div className={clsx('p-2.5 rounded-lg', c.icon)}>
          {icon}
        </div>
      </div>
    </Card>
  )
}
