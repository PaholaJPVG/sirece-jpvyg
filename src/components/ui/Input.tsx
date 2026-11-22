import { type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

// ─── Input ────────────────────────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftAddon?: React.ReactNode
  rightAddon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftAddon, rightAddon, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leftAddon && (
            <div className="absolute left-3 text-gray-400 pointer-events-none">{leftAddon}</div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={clsx(
              'w-full rounded-lg border bg-white text-sm text-gray-900 placeholder-gray-400',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-[#2563a0] focus:border-[#2563a0]',
              error
                ? 'border-red-400 focus:ring-red-400'
                : 'border-gray-300 hover:border-gray-400',
              leftAddon ? 'pl-9' : 'pl-3',
              rightAddon ? 'pr-9' : 'pr-3',
              'py-2 h-9',
              'disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70',
              className
            )}
            {...props}
          />
          {rightAddon && (
            <div className="absolute right-3 text-gray-400">{rightAddon}</div>
          )}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

// ─── Select ───────────────────────────────────────────────────────────────────
interface SelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options: { value: string; label: string; disabled?: boolean }[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full rounded-lg border bg-white text-sm text-gray-900',
            'h-9 px-3 cursor-pointer',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-[#2563a0] focus:border-[#2563a0]',
            error
              ? 'border-red-400 focus:ring-red-400'
              : 'border-gray-300 hover:border-gray-400',
            'disabled:bg-gray-50 disabled:cursor-not-allowed',
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-500">{error}</p>}
        {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'

// ─── Textarea ─────────────────────────────────────────────────────────────────
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full rounded-lg border bg-white text-sm text-gray-900 placeholder-gray-400',
            'px-3 py-2 min-h-[80px] resize-y',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-[#2563a0] focus:border-[#2563a0]',
            error
              ? 'border-red-400 focus:ring-red-400'
              : 'border-gray-300 hover:border-gray-400',
            'disabled:bg-gray-50 disabled:cursor-not-allowed',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
