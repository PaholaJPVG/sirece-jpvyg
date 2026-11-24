import { useState, useEffect, useRef } from 'react'
import {
  Menu, Bell, Search, LogOut, LogIn, User as UserIcon,
  X, AlertTriangle, History, Loader2, Phone,
  ShieldAlert, CheckCircle2
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import logo from '@/assets/logo.jpg'
import { useAuth } from '@/context/AuthContext'
import { LoginModal } from '@/components/auth/LoginModal'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { supabase } from '@/lib/supabase'
import type { Estudiante } from '@/types'

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

interface EstudianteConFaltas {
  estudiante: Estudiante
  totalFaltas: number
}

interface HeaderProps {
  onMenuToggle: () => void
}

export const Header = ({ onMenuToggle }: HeaderProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const pageInfo = PAGE_TITLES[location.pathname] ?? { title: 'SIRECE', subtitle: '' }
  const { user, profile, signOut } = useAuth()
  const [loginModalOpen, setLoginModalOpen] = useState(false)

  // ─── Estado del Buscador Global ──────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<EstudianteConFaltas[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<EstudianteConFaltas | null>(null)
  const [summaryModalOpen, setSummaryModalOpen] = useState(false)

  const searchContainerRef = useRef<HTMLDivElement>(null)

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

  // ─── Cerrar dropdown al hacer clic fuera o presionar Escape ──────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // ─── Búsqueda en tiempo real desde Supabase ─────────────────────────────────
  useEffect(() => {
    const q = searchQuery.trim()

    if (q.length < 2) {
      setSearchResults([])
      setIsSearching(false)
      setShowDropdown(false)
      return
    }

    setIsSearching(true)
    const timer = setTimeout(async () => {
      try {
        // Buscar estudiantes por código, nombres o apellidos
        const { data: estData, error: estError } = await supabase
          .from('estudiantes')
          .select('*')
          .or(`codigo_estudiante.ilike.%${q}%,nombres.ilike.%${q}%,apellidos.ilike.%${q}%`)
          .limit(8)

        if (estError || !estData) {
          console.error('[Header Search] Error buscando estudiantes:', estError)
          setSearchResults([])
          setShowDropdown(true)
          setIsSearching(false)
          return
        }

        const studentIds = estData.map((e) => e.id)
        const counts: Record<string, number> = {}

        if (studentIds.length > 0) {
          const { data: incData, error: incError } = await supabase
            .from('incidencias')
            .select('estudiante_id')
            .in('estudiante_id', studentIds)

          if (!incError && incData) {
            incData.forEach((row) => {
              counts[row.estudiante_id] = (counts[row.estudiante_id] || 0) + 1
            })
          }
        }

        const items: EstudianteConFaltas[] = estData.map((est) => ({
          estudiante: est as Estudiante,
          totalFaltas: counts[est.id] || 0,
        }))

        setSearchResults(items)
        setShowDropdown(true)
      } catch (err) {
        console.error('[Header Search] Error inesperado:', err)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Manejo de selección de estudiante
  const handleSelectEstudiante = (item: EstudianteConFaltas) => {
    setSelectedStudent(item)
    setShowDropdown(false)
    setSummaryModalOpen(true)
  }

  // Navegar a Registrar Falta con el estudiante precargado
  const handleIrARegistrarFalta = () => {
    if (!selectedStudent) return
    setSummaryModalOpen(false)
    setSearchQuery('')
    navigate('/registrar-falta', {
      state: { estudianteId: selectedStudent.estudiante.id },
    })
  }

  // Navegar a Historial con filtro por código o apellido
  const handleIrAHistorial = () => {
    if (!selectedStudent) return
    setSummaryModalOpen(false)
    setSearchQuery('')
    const query =
      selectedStudent.estudiante.codigo_estudiante ||
      `${selectedStudent.estudiante.apellidos} ${selectedStudent.estudiante.nombres}`
    navigate('/historial', {
      state: { busqueda: query },
    })
  }

  return (
    <>
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
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

          {/* Barra de búsqueda rápida en tiempo real */}
          <div ref={searchContainerRef} className="relative hidden sm:block w-64 md:w-80">
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 border border-transparent focus-within:border-blue-400 focus-within:bg-white transition-all shadow-inner">
              {isSearching ? (
                <Loader2 size={15} className="text-blue-600 animate-spin flex-shrink-0" />
              ) : (
                <Search size={15} className="text-gray-400 flex-shrink-0" />
              )}
              <input
                type="text"
                placeholder="Buscar estudiante (código o nombre)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchQuery.trim().length >= 2) setShowDropdown(true)
                }}
                className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setSearchResults([])
                    setShowDropdown(false)
                  }}
                  className="text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Menú Desplegable Flotante de Resultados */}
            {showDropdown && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden max-h-[380px] flex flex-col">
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span className="font-semibold text-gray-700">
                    {isSearching
                      ? 'Buscando en Supabase...'
                      : `${searchResults.length} estudiante(s) encontrado(s)`}
                  </span>
                  <span className="text-[11px] text-gray-400">Esc para cerrar</span>
                </div>

                <div className="overflow-y-auto divide-y divide-gray-100">
                  {searchResults.length === 0 && !isSearching ? (
                    <div className="p-4 text-center text-xs text-gray-500">
                      No se encontraron estudiantes para <span className="font-semibold text-gray-700">"{searchQuery}"</span>
                    </div>
                  ) : (
                    searchResults.map((item) => {
                      const est = item.estudiante
                      return (
                        <div
                          key={est.id}
                          onClick={() => handleSelectEstudiante(item)}
                          className="p-3 hover:bg-blue-50/70 cursor-pointer transition-colors flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-[#1e3a5f] font-bold text-xs flex items-center justify-center flex-shrink-0 group-hover:bg-[#1e3a5f] group-hover:text-white transition-colors">
                              {est.codigo_estudiante?.slice(-3) || est.nombres[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-blue-900">
                                {est.apellidos}, {est.nombres}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                <span className="font-mono text-gray-600 bg-gray-100 px-1.5 py-0.2 rounded text-[11px]">
                                  {est.codigo_estudiante || 'S/C'}
                                </span>
                                <span>•</span>
                                <span className="font-medium text-gray-600">
                                  {est.grado} "{est.seccion}"
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Badge de faltas */}
                          <div className="flex-shrink-0">
                            {item.totalFaltas === 0 ? (
                              <Badge variant="success" size="sm">
                                0 faltas
                              </Badge>
                            ) : item.totalFaltas === 1 ? (
                              <Badge variant="warning" size="sm">
                                1 falta
                              </Badge>
                            ) : (
                              <Badge variant="danger" size="sm" dot>
                                {item.totalFaltas} reincidencias
                              </Badge>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}
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

      {/* Modal de Resumen Rápido del Estudiante */}
      {selectedStudent && (
        <Modal
          open={summaryModalOpen}
          onClose={() => setSummaryModalOpen(false)}
          title="Ficha Rápida del Estudiante"
          description="Acceso directo disciplinario institucional"
          size="md"
        >
          <div className="space-y-4">
            {/* Cabecera del estudiante */}
            <div className="flex items-start gap-3 p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl">
              <div className="w-12 h-12 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center font-bold text-base shadow flex-shrink-0">
                {selectedStudent.estudiante.codigo_estudiante?.slice(-3) || selectedStudent.estudiante.nombres[0]}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-gray-900 text-base leading-snug">
                  {selectedStudent.estudiante.apellidos}, {selectedStudent.estudiante.nombres}
                </h3>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <Badge variant="primary" size="sm">
                    {selectedStudent.estudiante.grado} de Secundaria "{selectedStudent.estudiante.seccion}"
                  </Badge>
                  {selectedStudent.estudiante.codigo_estudiante && (
                    <span className="font-mono text-xs font-semibold text-blue-900 bg-white/80 px-2 py-0.5 rounded border border-blue-200">
                      Cód: {selectedStudent.estudiante.codigo_estudiante}
                    </span>
                  )}
                  {selectedStudent.estudiante.dni && (
                    <span className="text-xs text-gray-600 bg-white/80 px-2 py-0.5 rounded border border-gray-200">
                      DNI: {selectedStudent.estudiante.dni}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Estado disciplinario */}
            <div className="p-3.5 rounded-xl border bg-gray-50 border-gray-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Historial Disciplinario
                </span>
                {selectedStudent.totalFaltas === 0 ? (
                  <Badge variant="success" size="sm">
                    Sin faltas registradas
                  </Badge>
                ) : selectedStudent.totalFaltas === 1 ? (
                  <Badge variant="warning" size="sm">
                    1 falta leve
                  </Badge>
                ) : (
                  <Badge variant="danger" size="sm" dot>
                    {selectedStudent.totalFaltas} reincidencias
                  </Badge>
                )}
              </div>

              {selectedStudent.totalFaltas >= 2 ? (
                <div className="flex items-start gap-2 mt-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                  <ShieldAlert size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Atención:</strong> Estudiante clasificado como <strong>reincidente</strong>. Requiere seguimiento de Convivencia Escolar o citación de apoderado.
                  </span>
                </div>
              ) : selectedStudent.totalFaltas === 1 ? (
                <p className="text-xs text-gray-600 mt-1">
                  El estudiante cuenta con 1 falta leve registrada en el periodo lectivo.
                </p>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-green-700 mt-1">
                  <CheckCircle2 size={14} className="text-green-600" />
                  <span>El estudiante no registra faltas leves en el sistema.</span>
                </div>
              )}
            </div>

            {/* Datos del apoderado */}
            <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Apoderado:</span>
                <span className="font-medium text-gray-800">
                  {selectedStudent.estudiante.apoderado_nombre || 'No registrado'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">WhatsApp oficial de contacto:</span>
                <span className="font-mono font-semibold text-[#1e3a5f] flex items-center gap-1">
                  <Phone size={12} className="text-green-600" />
                  {selectedStudent.estudiante.apoderado_whatsapp || 'Sin número registrado'}
                </span>
              </div>
            </div>

            {/* Botones de acción rápida */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <Button
                variant="primary"
                className="flex-1 justify-center bg-[#1e3a5f] hover:bg-[#162a45]"
                leftIcon={<AlertTriangle size={15} />}
                onClick={handleIrARegistrarFalta}
              >
                Registrar Falta
              </Button>
              <Button
                variant="secondary"
                className="flex-1 justify-center"
                leftIcon={<History size={15} />}
                onClick={handleIrAHistorial}
              >
                Ver Historial
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de login institucional */}
      <LoginModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
    </>
  )
}
