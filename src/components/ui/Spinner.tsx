import { clsx } from 'clsx'

interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  color?: 'blue' | 'white' | 'gray'
  className?: string
  label?: string
}

const sizeMap = {
  xs: 'w-3 h-3 border',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-[3px]',
  xl: 'w-12 h-12 border-4',
}

const colorMap = {
  blue:  'border-blue-200 border-t-[#1e3a5f]',
  white: 'border-white/30 border-t-white',
  gray:  'border-gray-200 border-t-gray-500',
}

export const Spinner = ({ size = 'md', color = 'blue', className, label }: SpinnerProps) => (
  <div className={clsx('flex flex-col items-center justify-center gap-2', className)}>
    <div
      role="status"
      aria-label={label ?? 'Cargando...'}
      className={clsx('rounded-full animate-spin', sizeMap[size], colorMap[color])}
    />
    {label && <span className="text-xs text-gray-500">{label}</span>}
  </div>
)

// ─── PageLoader ───────────────────────────────────────────────────────────────
export const PageLoader = ({ label = 'Cargando...' }: { label?: string }) => (
  <div className="flex-1 flex items-center justify-center min-h-64">
    <Spinner size="lg" label={label} />
  </div>
)
