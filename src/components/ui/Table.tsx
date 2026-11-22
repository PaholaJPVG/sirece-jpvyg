import { clsx } from 'clsx'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// ─── Table ────────────────────────────────────────────────────────────────────
interface Column<T> {
  key: string
  header: string
  width?: string
  align?: 'left' | 'center' | 'right'
  render?: (value: T[keyof T], row: T, index: number) => React.ReactNode
}

interface TableProps<T extends Record<string, unknown>> {
  columns: Column<T>[]
  data: T[]
  keyField: keyof T
  loading?: boolean
  emptyMessage?: string
  emptyIcon?: React.ReactNode
  onRowClick?: (row: T) => void
  striped?: boolean
  compact?: boolean
  className?: string
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  keyField,
  loading = false,
  emptyMessage = 'No hay datos disponibles',
  emptyIcon,
  onRowClick,
  striped = true,
  compact = false,
  className,
}: TableProps<T>) {
  const cellPadding = compact ? 'px-3 py-2' : 'px-4 py-3'

  return (
    <div className={clsx('overflow-x-auto rounded-xl border border-gray-200', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#1e3a5f] text-white">
            {columns.map((col) => (
              <th
                key={col.key}
                style={col.width ? { width: col.width } : undefined}
                className={clsx(
                  cellPadding,
                  'text-xs font-semibold uppercase tracking-wide',
                  col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left',
                  'first:rounded-tl-xl last:rounded-tr-xl'
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-12 text-gray-400">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">Cargando...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-12 text-gray-400">
                <div className="flex flex-col items-center gap-2">
                  {emptyIcon}
                  <span className="text-sm">{emptyMessage}</span>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={String(row[keyField])}
                onClick={() => onRowClick?.(row)}
                className={clsx(
                  'border-t border-gray-100 transition-colors',
                  striped && idx % 2 === 1 ? 'bg-gray-50' : 'bg-white',
                  onRowClick && 'cursor-pointer hover:bg-blue-50',
                  'last:rounded-b-xl'
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={clsx(
                      cellPadding,
                      'text-gray-700',
                      col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                    )}
                  >
                    {col.render
                      ? col.render(row[col.key as keyof T] as T[keyof T], row, idx)
                      : String(row[col.key as keyof T] ?? '-')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────
interface PaginationProps {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  className?: string
}

export const Pagination = ({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  className,
}: PaginationProps) => {
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div className={clsx('flex items-center justify-between text-sm text-gray-500', className)}>
      <span>
        Mostrando {start}–{end} de {total} registros
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          const p = i + 1
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={clsx(
                'w-8 h-8 rounded-lg text-xs font-medium transition-colors',
                p === page
                  ? 'bg-[#1e3a5f] text-white'
                  : 'hover:bg-gray-100 text-gray-600'
              )}
            >
              {p}
            </button>
          )
        })}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
