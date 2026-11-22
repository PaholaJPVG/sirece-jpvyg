import { NavLink, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  FileSpreadsheet,
  AlertTriangle,
  ClipboardList,
  RefreshCw,
  Building2,
  BarChart3,
  Settings,
  X,
  ChevronRight,
} from 'lucide-react'
import logo from '@/assets/logo.jpg'

// ─── Definición del menú ──────────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    section: 'Principal',
    items: [
      { to: '/',                  icon: LayoutDashboard, label: 'Panel Principal' },
    ],
  },
  {
    section: 'Gestión',
    items: [
      { to: '/personal',          icon: Users,           label: 'Personal' },
      { to: '/estudiantes',       icon: GraduationCap,   label: 'Estudiantes' },
      { to: '/importar',          icon: FileSpreadsheet, label: 'Importar desde Excel' },
    ],
  },
  {
    section: 'Incidencias',
    items: [
      { to: '/registrar-falta',   icon: AlertTriangle,   label: 'Registrar Falta Leve' },
      { to: '/historial',         icon: ClipboardList,   label: 'Historial de Incidencias' },
      { to: '/reincidencias',     icon: RefreshCw,       label: 'Seguimiento Reincidencias' },
      { to: '/seguimiento',       icon: Building2,       label: 'Seguimiento Institucional' },
    ],
  },
  {
    section: 'Administración',
    items: [
      { to: '/informes',          icon: BarChart3,       label: 'Informes y Estadísticas' },
      { to: '/configuracion',     icon: Settings,        label: 'Configuración' },
    ],
  },
]

// ─── Props ────────────────────────────────────────────────────────────────────
interface SidebarProps {
  open: boolean
  onClose: () => void
}

// ─── Componente ───────────────────────────────────────────────────────────────
export const Sidebar = ({ open, onClose }: SidebarProps) => {
  const location = useLocation()

  return (
    <>
      {/* Overlay móvil */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed top-0 left-0 z-30 h-full w-64 flex flex-col',
          'bg-gradient-to-b from-[#0f1e30] via-[#1a2e4a] to-[#1e3a5f]',
          'transition-transform duration-300 ease-in-out',
          'shadow-2xl',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 lg:static lg:z-auto'
        )}
      >
        {/* Logo institucional */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
          <div className="flex-shrink-0 w-11 h-11 rounded-full overflow-hidden border-2 border-[#2980b9] shadow-lg">
            <img
              src={logo}
              alt="Escudo I.E. Juan Pablo Viscardo y Guzmán"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <span className="block text-white font-bold text-base tracking-wide leading-tight">
              SIRECE
            </span>
            <span className="block text-[#5bafd6] text-[10px] leading-tight mt-0.5 truncate">
              I.E. Juan Pablo Viscardo y Guzmán
            </span>
          </div>
          {/* Botón cerrar en móvil */}
          <button
            onClick={onClose}
            className="ml-auto lg:hidden text-white/50 hover:text-white p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {NAV_ITEMS.map((group) => (
            <div key={group.section}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 px-2 mb-1.5">
                {group.section}
              </p>
              <ul className="space-y-0.5">
                {group.items.map(({ to, icon: Icon, label }) => {
                  // Determinar si está activo (exacto para Dashboard, startsWith para el resto)
                  const isActive =
                    to === '/'
                      ? location.pathname === '/'
                      : location.pathname.startsWith(to)

                  return (
                    <li key={to}>
                      <NavLink
                        to={to}
                        onClick={onClose}
                        className={clsx(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm',
                          'transition-all duration-150 group relative',
                          isActive
                            ? 'bg-[#2980b9] text-white font-medium shadow-sm'
                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                        )}
                      >
                        <Icon
                          size={17}
                          className={clsx(
                            'flex-shrink-0 transition-colors',
                            isActive ? 'text-white' : 'text-white/50 group-hover:text-white'
                          )}
                        />
                        <span className="truncate">{label}</span>
                        {isActive && (
                          <ChevronRight size={14} className="ml-auto opacity-70" />
                        )}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer del sidebar */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#2980b9] flex items-center justify-center text-white text-xs font-bold">
              AD
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-medium truncate">Administrador</p>
              <p className="text-white/40 text-[10px] truncate">admin@jpvyg.edu.pe</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
