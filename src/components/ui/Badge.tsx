import { clsx } from 'clsx'

// ─── Variantes de Badge ───────────────────────────────────────────────────────
const variants = {
  default:  'bg-gray-100 text-gray-700',
  primary:  'bg-blue-100 text-blue-800',
  success:  'bg-green-100 text-green-800',
  warning:  'bg-yellow-100 text-yellow-800',
  danger:   'bg-red-100 text-red-800',
  info:     'bg-cyan-100 text-cyan-800',
  purple:   'bg-purple-100 text-purple-800',
}

const sizes = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
  lg: 'text-sm px-3 py-1',
}

interface BadgeProps {
  children: React.ReactNode
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  dot?: boolean
  className?: string
}

export const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className,
}: BadgeProps) => (
  <span
    className={clsx(
      'inline-flex items-center gap-1.5 rounded-full font-medium',
      variants[variant],
      sizes[size],
      className
    )}
  >
    {dot && (
      <span className={clsx('w-1.5 h-1.5 rounded-full', {
        'bg-gray-500': variant === 'default',
        'bg-blue-600': variant === 'primary',
        'bg-green-600': variant === 'success',
        'bg-yellow-500': variant === 'warning',
        'bg-red-600': variant === 'danger',
        'bg-cyan-600': variant === 'info',
        'bg-purple-600': variant === 'purple',
      })} />
    )}
    {children}
  </span>
)

// ─── Badges semánticos de estado ──────────────────────────────────────────────
export const EstadoIncidenciaBadge = ({ estado }: { estado: string }) => {
  const map: Record<string, { label: string; variant: keyof typeof variants }> = {
    pendiente:   { label: 'Pendiente',   variant: 'warning' },
    notificado:  { label: 'Notificado',  variant: 'info' },
    atendido:    { label: 'Atendido',    variant: 'success' },
    archivado:   { label: 'Archivado',   variant: 'default' },
  }
  const { label, variant } = map[estado] ?? { label: estado, variant: 'default' }
  return <Badge variant={variant} dot>{label}</Badge>
}

export const EstadoNotificacionBadge = ({ estado }: { estado: string }) => {
  const map: Record<string, { label: string; variant: keyof typeof variants }> = {
    enviado:    { label: 'Enviado',    variant: 'info' },
    entregado:  { label: 'Entregado', variant: 'success' },
    leido:      { label: 'Leído',     variant: 'success' },
    fallido:    { label: 'Fallido',   variant: 'danger' },
    pendiente:  { label: 'Pendiente', variant: 'warning' },
  }
  const { label, variant } = map[estado] ?? { label: estado, variant: 'default' }
  return <Badge variant={variant} dot>{label}</Badge>
}
