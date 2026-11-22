import { type ButtonHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

// ─── Variantes ────────────────────────────────────────────────────────────────
const variants = {
  primary:
    'bg-[#1e3a5f] text-white hover:bg-[#2563a0] active:bg-[#163050] shadow-sm',
  secondary:
    'bg-white text-[#1e3a5f] border border-[#1e3a5f] hover:bg-blue-50 active:bg-blue-100',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm',
  ghost:
    'text-[#1e3a5f] hover:bg-blue-50 active:bg-blue-100',
  success:
    'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 shadow-sm',
  warning:
    'bg-yellow-500 text-white hover:bg-yellow-600 active:bg-yellow-700 shadow-sm',
}

const sizes = {
  xs: 'h-7 px-2.5 text-xs gap-1',
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-10 px-5 text-base gap-2',
  xl: 'h-12 px-6 text-base gap-2.5',
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

// ─── Componente ───────────────────────────────────────────────────────────────
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={clsx(
          'inline-flex items-center justify-center rounded-lg font-medium',
          'transition-colors duration-150 cursor-pointer',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="animate-spin" size={size === 'xs' ? 12 : size === 'sm' ? 14 : 16} />
        ) : leftIcon ? (
          leftIcon
        ) : null}
        {children}
        {!loading && rightIcon}
      </button>
    )
  }
)

Button.displayName = 'Button'
