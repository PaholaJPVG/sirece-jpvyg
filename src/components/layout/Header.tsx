import { useState } from 'react'
import { Menu, Bell, Search, LogOut, LogIn, User as UserIcon } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import logo from '@/assets/logo.jpg'
import { useAuth } from '@/context/AuthContext'
import { LoginModal } from '@/components/auth/LoginModal'
import { Button } from '@/components/ui/Button'

// ─── Mapa de títulos de páginas ───────────────────────────────────────────────
const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/':                  { title: 'Panel Principal',              subtitle: 'Resumen general del sistema' },
  '/personal':          { title: 'Personal',                     subtitle: 'Gestión de directivos, docentes y auxiliares' },
  '/estudiantes':       { title: 'Estudiantes',                  subtitle: 'Registro y gestión de estudiantes' },
  '/importar':          { title: 'Importar desde Excel',         subtitle: 'Carga masiva de datos de estudiantes' },
  '/registrar-falta':   { title: 'Registrar Falta Leve',         subtitle: 'Registro de incidencia estudiantil' },
  '/historial':         { title: 'Historial de Incidencias',     subtitle: 'Registro histórico completo' },
  '/reincidencias':     { title: 'Seguimiento de Reincidencias', subtitle: 'Estudiantes con faltas repetidas' },
  '/seguimiento':       { title: 'Seguimiento Institucional',    subtitle: 'Vista directiva consolidada' },
  '/informes':          { title: 'Informes y Estadísticas',      subtitle: 'Análisis y reportes del sistema' },
  '/configuracion':     { title: 'Configuración',                subtitle: 'Parámetros del sistema' },
}

interface HeaderProps {
  onMenuToggle: () => void
}

export const Header = ({ onMenuToggle }: HeaderProps) => {
  const location = useLocation()
  const pageInfo = PAGE_TITLES[location.pathname] ?? { title: 'SIRECE', subtitle: '' }
  const { user, profile, signOut } = useAuth()
  const [loginModalOpen, setLoginModalOpen] = useState(false)

  // Obtener iniciales y nombre para mostrar
  const displayName = profile
    ? `${profile.nombres} ${profile.apellidos}`
    : user?.email
    ? user.email.split('@')[0]
    : 'Modo Directivo'

  const displayRole = profile?.rol
    ? profile.rol.toUpperCase()
    : user
    ? 'Usuario Autenticado'
    : 'Acceso Local'

  const initials = profile
    ? `${profile.nombres[0] || ''}${profile.apellidos[0] || ''}`.toUpperCase()
    : user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'AD'

  return (
    <>
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-4 px-4 py-3">
          {/* Botón hamburger (móvil) */}
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>

          {/* Logo + nombre de institución (visible solo en móvil) */}
          <div className="flex items-center gap-2 lg:hidden">
            <img src={logo} alt="Logo" className="w-7 h-7 rounded-full object-cover border border-blue-300" />
            <span className="text-sm font-bold text-[#1e3a5f]">SIRECE</span>
          </div>

          {/* Título de página (visible en desktop) */}
          <div className="hidden lg:block">
            <h1 className="text-lg font-semibold text-gray-900 leading-tight">{pageInfo.title}</h1>
            {pageInfo.subtitle && (
              <p className="text-xs text-gray-500 leading-tight">{pageInfo.subtitle}</p>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Barra de búsqueda rápida */}
          <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 w-56">
            <Search size={14} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar estudiante..."
              className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full"
            />
          </div>

          {/* Notificaciones */}
          <button className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* Sección de usuario / Auth */}
          {user ? (
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-2 cursor-pointer group"
                title={`Sesión iniciada como: ${user.email}`}
              >
                <div className="w-8 h-8 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  {initials}
                </div>
                <div className="hidden md:block">
                  <p className="text-xs font-semibold text-gray-800 leading-tight max-w-[130px] truncate">
                    {displayName}
                  </p>
                  <p className="text-[10px] text-gray-400 leading-tight">{displayRole}</p>
                </div>
              </div>

              {/* Botón Logout */}
              <button
                onClick={() => signOut()}
                className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Cerrar sesión"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLoginModalOpen(true)}
                className="hidden sm:flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                title="Iniciar sesión"
              >
                <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold shadow-sm">
                  <UserIcon size={16} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-gray-700 leading-tight">Sin sesión</p>
                  <p className="text-[10px] text-[#2980b9] leading-tight font-medium">Conectar cuenta</p>
                </div>
              </button>
              <Button
                size="xs"
                variant="primary"
                leftIcon={<LogIn size={13} />}
                onClick={() => setLoginModalOpen(true)}
              >
                Iniciar Sesión
              </Button>
            </div>
          )}
        </div>

        {/* Título de página en móvil */}
        <div className="lg:hidden px-4 pb-2.5">
          <h1 className="text-sm font-semibold text-gray-900">{pageInfo.title}</h1>
          {pageInfo.subtitle && <p className="text-xs text-gray-500">{pageInfo.subtitle}</p>}
        </div>
      </header>

      {/* Modal de login institucional */}
      <LoginModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
    </>
  )
}
