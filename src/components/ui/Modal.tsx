import { useEffect, useRef } from 'react'
import { clsx } from 'clsx'
import { X } from 'lucide-react'
import { Button } from './Button'

// ─── Props ────────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  hideCloseButton?: boolean
  footer?: React.ReactNode
}

const sizeMap = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-lg',
  xl:   'max-w-2xl',
  full: 'max-w-5xl',
}

// ─── Componente ───────────────────────────────────────────────────────────────
export const Modal = ({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  hideCloseButton = false,
  footer,
}: ModalProps) => {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Bloquear scroll del body
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        className={clsx(
          'relative z-10 w-full bg-white rounded-2xl shadow-xl',
          'flex flex-col max-h-[90vh]',
          sizeMap[size]
        )}
      >
        {/* Header */}
        {(title || !hideCloseButton) && (
          <div className="flex items-start justify-between p-5 border-b border-gray-100">
            <div>
              {title && (
                <h2 id="modal-title" className="text-base font-semibold text-gray-900">{title}</h2>
              )}
              {description && (
                <p className="text-sm text-gray-500 mt-0.5">{description}</p>
              )}
            </div>
            {!hideCloseButton && (
              <button
                onClick={onClose}
                className="ml-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-100">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ConfirmModal ─────────────────────────────────────────────────────────────
interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'primary'
  loading?: boolean
}

export const ConfirmModal = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  loading = false,
}: ConfirmModalProps) => (
  <Modal
    open={open}
    onClose={onClose}
    title={title}
    size="sm"
    footer={
      <>
        <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant={variant} size="sm" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </>
    }
  >
    <p className="text-sm text-gray-600">{message}</p>
  </Modal>
)
