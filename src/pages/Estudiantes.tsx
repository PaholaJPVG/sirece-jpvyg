import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, Search, Pencil, Trash2, GraduationCap,
  MessageCircle, Phone, User, AlertCircle, CheckCircle,
  RefreshCw, Upload, X, ExternalLink
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import {
  estudianteService,
  normalizarWhatsApp,
  formatearWhatsApp,
  generarCodigoEstudiante,
  type CreateEstudianteInput
} from '@/lib/estudianteService'
import type { Estudiante } from '@/types'

const GRADO_OPTIONS = [
  { value: '1ro', label: '1ro de Secundaria' },
  { value: '2do', label: '2do de Secundaria' },
  { value: '3ro', label: '3ro de Secundaria' },
  { value: '4to', label: '4to de Secundaria' },
  { value: '5to', label: '5to de Secundaria' },
]

const SECCION_OPTIONS = [
  { value: 'A', label: 'Sección "A"' },
  { value: 'B', label: 'Sección "B"' },
  { value: 'C', label: 'Sección "C"' },
  { value: 'D', label: 'Sección "D"' },
  { value: 'E', label: 'Sección "E"' },
]

interface FormState {
  id?: string
  nombres: string
  apellidos: string
  grado: string
  seccion: string
  numero_orden: string
  foto_url: string
  apoderado_nombre: string
  apoderado_whatsapp: string
  activo: boolean
}

const INITIAL_FORM: FormState = {
  nombres: '',
  apellidos: '',
  grado: '1ro',
  seccion: 'A',
  numero_orden: '',
  foto_url: '',
  apoderado_nombre: '',
  apoderado_whatsapp: '',
  activo: true,
}

export default function Estudiantes() {
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [tableMissing, setTableMissing] = useState(false)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [gradoFiltro, setGradoFiltro] = useState('')
  const [seccionFiltro, setSeccionFiltro] = useState('')

  // Modales
  const [modalOpen, setModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Confirmar eliminación
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedEstudiante, setSelectedEstudiante] = useState<Estudiante | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Mensaje de éxito temporal
  const [successToast, setSuccessToast] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const showSuccess = (msg: string) => {
    setSuccessToast(msg)
    setTimeout(() => setSuccessToast(null), 3500)
  }

  // Cargar estudiantes desde Supabase
  const cargarEstudiantes = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    setTableMissing(false)

    const res = await estudianteService.getAll()

    if (res.tableMissing) {
      setTableMissing(true)
    } else if (res.error) {
      setErrorMsg(res.error)
    } else {
      setEstudiantes(res.data)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    cargarEstudiantes()
  }, [cargarEstudiantes])

  // Abrir modal para crear
  const handleOpenCreate = () => {
    setIsEditing(false)
    setForm(INITIAL_FORM)
    setFormErrors({})
    setModalOpen(true)
  }

  // Abrir modal para editar
  const handleOpenEdit = (e: Estudiante) => {
    setIsEditing(true)
    setForm({
      id: e.id,
      nombres: e.nombres || '',
      apellidos: e.apellidos || '',
      grado: e.grado || '1ro',
      seccion: e.seccion || 'A',
      numero_orden: e.numero_orden !== undefined && e.numero_orden !== null ? String(e.numero_orden) : '',
      foto_url: e.foto_url || '',
      apoderado_nombre: e.apoderado_nombre || '',
      apoderado_whatsapp: e.apoderado_whatsapp || '',
      activo: e.activo !== undefined ? e.activo : true,
    })
    setFormErrors({})
    setModalOpen(true)
  }

  // Manejo de carga de foto (conversión a Data URL para guardado y vista previa inmediata)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setFormErrors((prev) => ({ ...prev, foto: 'Solo se permiten archivos de imagen (JPG, PNG, WebP).' }))
      return
    }

    // Límite de 2MB
    if (file.size > 2 * 1024 * 1024) {
      setFormErrors((prev) => ({ ...prev, foto: 'La imagen debe pesar menos de 2 MB.' }))
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      setForm((prev) => ({ ...prev, foto_url: result }))
      setFormErrors((prev) => {
        const copy = { ...prev }
        delete copy.foto
        return copy
      })
    }
    reader.readAsDataURL(file)
  }

  const handleRemovePhoto = () => {
    setForm((prev) => ({ ...prev, foto_url: '' }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Guardar (crear o actualizar)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const errors: Record<string, string> = {}

    if (!form.nombres.trim()) errors.nombres = 'Los nombres son obligatorios.'
    if (!form.apellidos.trim()) errors.apellidos = 'Los apellidos son obligatorios.'
    if (!form.grado.trim()) errors.grado = 'Selecciona el grado escolar.'
    if (!form.seccion.trim()) errors.seccion = 'Selecciona la sección.'

    if (form.apoderado_whatsapp.trim()) {
      const soloDigitos = form.apoderado_whatsapp.replace(/\D/g, '')
      if (soloDigitos.length !== 9 && soloDigitos.length !== 11) {
        errors.apoderado_whatsapp = 'Si ingresas WhatsApp, debe tener 9 dígitos de Perú (ej: 987654321).'
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setSaving(true)
    setFormErrors({})

    const numOrden = form.numero_orden.trim() ? parseInt(form.numero_orden.trim(), 10) : null
    const codEstudiante = generarCodigoEstudiante(form.grado, form.seccion, numOrden)

    if (isEditing && form.id) {
      const res = await estudianteService.update({
        id: form.id,
        nombres: form.nombres,
        apellidos: form.apellidos,
        grado: form.grado,
        seccion: form.seccion,
        numero_orden: numOrden,
        codigo_estudiante: codEstudiante,
        foto_url: form.foto_url || null,
        apoderado_nombre: form.apoderado_nombre,
        apoderado_whatsapp: form.apoderado_whatsapp,
        activo: form.activo,
      })

      if (res.error) {
        setFormErrors({ general: res.error })
      } else {
        setModalOpen(false)
        showSuccess('Datos del estudiante actualizados correctamente en Supabase.')
        cargarEstudiantes()
      }
    } else {
      const input: CreateEstudianteInput = {
        nombres: form.nombres,
        apellidos: form.apellidos,
        grado: form.grado,
        seccion: form.seccion,
        numero_orden: numOrden,
        codigo_estudiante: codEstudiante,
        foto_url: form.foto_url || null,
        apoderado_nombre: form.apoderado_nombre,
        apoderado_whatsapp: form.apoderado_whatsapp,
        activo: form.activo,
      }
      const res = await estudianteService.create(input)

      if (res.error) {
        setFormErrors({ general: res.error })
      } else {
        setModalOpen(false)
        showSuccess('Estudiante registrado exitosamente en Supabase.')
        cargarEstudiantes()
      }
    }

    setSaving(false)
  }

  // Eliminar
  const handleConfirmDelete = async () => {
    if (!selectedEstudiante) return
    setDeleting(true)
    const res = await estudianteService.delete(selectedEstudiante.id)
    if (res.error) {
      setErrorMsg(res.error)
    } else {
      setDeleteModalOpen(false)
      setSelectedEstudiante(null)
      showSuccess(`Estudiante ${selectedEstudiante.nombres} ${selectedEstudiante.apellidos} eliminado correctamente.`)
      cargarEstudiantes()
    }
    setDeleting(false)
  }

  // Filtrado de estudiantes en tiempo real
  const estudiantesFiltrados = estudiantes.filter((e) => {
    // 1. Filtro de Grado
    const matchGrado = !gradoFiltro || e.grado === gradoFiltro

    // 2. Filtro de Sección
    const matchSeccion = !seccionFiltro || e.seccion === seccionFiltro

    if (!matchGrado || !matchSeccion) return false

    // 3. Filtro de Búsqueda de texto libre
    const q = busqueda.trim().toLowerCase()
    if (!q) return true

    // Extraer campos de manera segura (tolerante a null/undefined)
    const codEstudiante = (e.codigo_estudiante || '').trim().toLowerCase()
    const codGenerado = generarCodigoEstudiante(e.grado || '', e.seccion || '', e.numero_orden).trim().toLowerCase()
    const nombres = (e.nombres || '').trim().toLowerCase()
    const apellidos = (e.apellidos || '').trim().toLowerCase()
    const apoderado = (e.apoderado_nombre || '').trim().toLowerCase()
    const apoderadoWa = (e.apoderado_whatsapp || '').trim().toLowerCase()
    const dni = ((e as any).dni || (e as any).numero_documento || '').toString().trim().toLowerCase()
    const orden = (e.numero_orden !== undefined && e.numero_orden !== null ? String(e.numero_orden) : '').trim().toLowerCase()

    const grado = (e.grado || '').trim().toLowerCase()
    const gradoNum = grado.replace(/\D/g, '')
    const seccion = (e.seccion || '').trim().toLowerCase()

    // Variantes combinadas de grado y sección (ej: "5to b", "5b", "5 to b")
    const gradoSec = `${grado} ${seccion}`
    const gradoSecDirecto = `${grado}${seccion}`
    const gradoSecCorto = `${gradoNum}${seccion}`
    const gradoSecCortoEspacio = `${gradoNum} ${seccion}`

    // Nombre completo en ambos sentidos
    const nombreCompleto = `${apellidos} ${nombres}`
    const nombreCompletoInverso = `${nombres} ${apellidos}`

    // Bolsa de texto indexable
    const searchable = [
      codEstudiante,
      codGenerado,
      nombres,
      apellidos,
      nombreCompleto,
      nombreCompletoInverso,
      dni,
      grado,
      seccion,
      gradoSec,
      gradoSecDirecto,
      gradoSecCorto,
      gradoSecCortoEspacio,
      apoderado,
      apoderadoWa,
      orden
    ].join(' ')

    // Si la búsqueda tiene múltiples palabras (ej: "5a1", "5b13", "canales 5b" o "portugal melany"),
    // cada palabra debe coincidir con alguna parte del estudiante
    const tokens = q.split(/\s+/).filter(Boolean)
    return tokens.every((token) => searchable.includes(token))
  })

  return (
    <div className="space-y-5">
      {/* Toast de confirmación */}
      {successToast && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm transition-all animate-fade-in shadow-sm">
          <CheckCircle size={18} className="text-green-600 flex-shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Banner si la tabla está pendiente en Supabase */}
      {tableMissing && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl p-4 shadow-sm">
          <AlertCircle size={22} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Tabla "estudiantes" pendiente de creación en Supabase</h4>
            <p className="text-xs text-amber-800 mt-1">
              Ejecuta el script SQL en el <strong>SQL Editor</strong> de Supabase para crear la tabla de estudiantes con sus permisos y RLS.
            </p>
            <Button
              variant="secondary"
              size="xs"
              className="mt-3 bg-white border-amber-300 text-amber-900 hover:bg-amber-100"
              leftIcon={<RefreshCw size={13} />}
              onClick={cargarEstudiantes}
            >
              Comprobar nuevamente
            </Button>
          </div>
        </div>
      )}

      {/* Error de consulta */}
      {errorMsg && !tableMissing && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm">
          <AlertCircle size={18} className="text-red-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap size={20} className="text-[#1e3a5f]" />
              Gestión de Estudiantes
            </CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              Padrón estudiantil, asignación de grado/sección y contacto WhatsApp de apoderados
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
              onClick={cargarEstudiantes}
              disabled={loading}
              title="Recargar listado"
            >
              Actualizar
            </Button>
            <Button size="sm" leftIcon={<Plus size={15} />} onClick={handleOpenCreate}>
              Registrar Estudiante
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Barra de filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
            <div className="sm:col-span-2">
              <Input
                placeholder="Buscar por código (ej: 5A1, 5B13), apellidos, nombres, DNI..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                leftAddon={<Search size={14} />}
                rightAddon={
                  busqueda ? (
                    <button
                      type="button"
                      onClick={() => setBusqueda('')}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-0.5 rounded-full hover:bg-gray-100 cursor-pointer"
                      title="Borrar búsqueda"
                    >
                      <X size={14} />
                    </button>
                  ) : null
                }
              />
            </div>
            <div>
              <Select
                value={gradoFiltro}
                onChange={(e) => setGradoFiltro(e.target.value)}
                options={[{ value: '', label: 'Todos los grados' }, ...GRADO_OPTIONS]}
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Select
                  value={seccionFiltro}
                  onChange={(e) => setSeccionFiltro(e.target.value)}
                  options={[{ value: '', label: 'Todas las secciones' }, ...SECCION_OPTIONS]}
                />
              </div>
              {(busqueda || gradoFiltro || seccionFiltro) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setBusqueda('')
                    setGradoFiltro('')
                    setSeccionFiltro('')
                  }}
                  className="text-gray-500 hover:text-gray-800 px-2.5 h-9 flex-shrink-0"
                  title="Limpiar búsqueda y filtros"
                >
                  <X size={15} />
                </Button>
              )}
            </div>
          </div>

          {/* Barra de estado / conteo y botón rápido de limpiar */}
          {!loading && estudiantes.length > 0 && (
            <div className="flex items-center justify-between text-xs text-gray-500 mb-4 px-1">
              <span>
                Mostrando <strong className="text-gray-800">{estudiantesFiltrados.length}</strong> de <strong className="text-gray-800">{estudiantes.length}</strong> estudiantes matriculados
              </span>
              {(busqueda || gradoFiltro || seccionFiltro) && (
                <button
                  type="button"
                  onClick={() => {
                    setBusqueda('')
                    setGradoFiltro('')
                    setSeccionFiltro('')
                  }}
                  className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 font-medium transition-colors cursor-pointer"
                >
                  <X size={13} />
                  <span>Limpiar filtros</span>
                </button>
              )}
            </div>
          )}

          {/* Estado de carga */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Spinner size="lg" />
              <p className="text-xs text-gray-500">Consultando estudiantes en Supabase...</p>
            </div>
          ) : estudiantesFiltrados.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {estudiantesFiltrados.map((est) => {
                const initials = (est.nombres[0] || '') + (est.apellidos[0] || '')
                const waLink = `https://wa.me/${normalizarWhatsApp(est.apoderado_whatsapp)}`

                return (
                  <div
                    key={est.id}
                    className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow bg-white flex flex-col justify-between space-y-3"
                  >
                    <div>
                      {/* Cabecera con Foto / Iniciales */}
                      <div className="flex items-start gap-3">
                        {est.foto_url ? (
                          <img
                            src={est.foto_url}
                            alt={`${est.nombres} ${est.apellidos}`}
                            className="w-12 h-12 rounded-full object-cover border-2 border-blue-200 shadow-sm flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2563a0] text-white flex items-center justify-center text-sm font-bold uppercase shadow-sm flex-shrink-0">
                            {initials}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 leading-tight truncate">
                            {est.apellidos}, {est.nombres}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {est.codigo_estudiante ? (
                              <Badge variant="purple" size="sm" className="font-mono font-bold tracking-wider">
                                {est.codigo_estudiante}
                              </Badge>
                            ) : (
                              <Badge variant="purple" size="sm" className="font-mono font-bold tracking-wider">
                                {generarCodigoEstudiante(est.grado, est.seccion, est.numero_orden)}
                              </Badge>
                            )}
                            <Badge variant="primary" size="sm">
                              {est.grado} &ldquo;{est.seccion}&rdquo;
                            </Badge>
                            {!est.activo && <Badge variant="default" size="sm">Inactivo</Badge>}
                          </div>
                        </div>
                      </div>

                      {/* Datos del Apoderado */}
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5 text-xs text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <User size={13} className="text-gray-400 flex-shrink-0" />
                          <span className="font-medium text-gray-700 truncate">
                            Apoderado: {est.apoderado_nombre || <span className="text-gray-400 italic">Sin registrar</span>}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-1 pt-0.5">
                          <span className="flex items-center gap-1.5 font-mono text-gray-600">
                            <Phone size={12} className="text-gray-400" />
                            {est.apoderado_whatsapp ? (
                              formatearWhatsApp(est.apoderado_whatsapp)
                            ) : (
                              <span className="text-gray-400 italic">Sin teléfono</span>
                            )}
                          </span>

                          {/* Botón de prueba rápida de WhatsApp (solo si tiene número) */}
                          {est.apoderado_whatsapp ? (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg text-[11px] font-medium transition-colors"
                              title="Abrir chat en WhatsApp Web / Móvil"
                            >
                              <MessageCircle size={12} className="text-green-600" />
                              <span>Probar WA</span>
                              <ExternalLink size={10} className="text-green-500" />
                            </a>
                          ) : (
                            <span className="text-[10px] text-gray-400">Sin WhatsApp</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <Button
                        variant="ghost"
                        size="xs"
                        leftIcon={<Pencil size={12} />}
                        onClick={() => handleOpenEdit(est)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        leftIcon={<Trash2 size={12} />}
                        className="text-red-500 hover:bg-red-50 ml-auto"
                        onClick={() => {
                          setSelectedEstudiante(est)
                          setDeleteModalOpen(true)
                        }}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
              <GraduationCap size={36} className="mx-auto mb-2 opacity-30 text-gray-400" />
              <p className="text-sm font-medium text-gray-700">
                {estudiantes.length === 0
                  ? 'No hay estudiantes registrados en la base de datos'
                  : 'No se encontraron estudiantes con los filtros seleccionados'}
              </p>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                {estudiantes.length === 0
                  ? 'Haz clic en "Registrar Estudiante" para añadir al primer alumno.'
                  : `No hay coincidencias para "${busqueda.trim() || [gradoFiltro, seccionFiltro].filter(Boolean).join(' - ')}". Verifica que el código o nombre esté bien escrito o limpia los filtros.`}
              </p>
              {estudiantes.length > 0 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-white border-gray-300 text-gray-700 hover:bg-gray-100 shadow-sm"
                    leftIcon={<X size={14} />}
                    onClick={() => {
                      setBusqueda('')
                      setGradoFiltro('')
                      setSeccionFiltro('')
                    }}
                  >
                    Limpiar búsqueda y filtros
                  </Button>
                </div>
              )}
              {estudiantes.length === 0 && (
                <Button size="sm" className="mt-3" leftIcon={<Plus size={14} />} onClick={handleOpenCreate}>
                  Registrar primer estudiante
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Registro / Edición de Estudiante */}
      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={isEditing ? 'Editar Estudiante' : 'Registrar Nuevo Estudiante'}
        description={
          isEditing
            ? 'Actualiza los datos académicos y de contacto del apoderado en Supabase.'
            : 'Completa la información institucional del estudiante y su apoderado.'
        }
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formErrors.general && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>{formErrors.general}</span>
            </div>
          )}

          {/* Carga y Vista Previa de Fotografía */}
          <div className="flex items-center gap-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="relative flex-shrink-0">
              {form.foto_url ? (
                <div className="relative">
                  <img
                    src={form.foto_url}
                    alt="Vista previa"
                    className="w-16 h-16 rounded-full object-cover border-2 border-blue-400 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow transition-colors"
                    title="Eliminar foto"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2563a0] text-white flex items-center justify-center text-lg font-bold uppercase shadow-sm">
                  {(form.nombres[0] || '') + (form.apellidos[0] || '') || <User size={24} />}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <label className="text-xs font-semibold text-gray-700 block">Fotografía del estudiante</label>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Opcional. Formatos JPG o PNG hasta 2MB. Si no se sube foto, se mostrarán las iniciales institucionales.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="foto-estudiante-input"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  leftIcon={<Upload size={12} />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {form.foto_url ? 'Cambiar imagen' : 'Seleccionar fotografía'}
                </Button>
                {form.foto_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="text-red-500 hover:bg-red-50"
                    onClick={handleRemovePhoto}
                  >
                    Quitar foto
                  </Button>
                )}
              </div>
              {formErrors.foto && <p className="text-xs text-red-500 mt-1">{formErrors.foto}</p>}
            </div>
          </div>

          {/* Nombres y Apellidos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nombres"
              placeholder="Ej: David Alejandro"
              value={form.nombres}
              onChange={(e) => setForm({ ...form, nombres: e.target.value })}
              error={formErrors.nombres}
              required
            />
            <Input
              label="Apellidos"
              placeholder="Ej: Quispe Mendoza"
              value={form.apellidos}
              onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
              error={formErrors.apellidos}
              required
            />
          </div>

          {/* Grado, Sección y Número de Orden */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Grado Escolar"
              options={GRADO_OPTIONS}
              value={form.grado}
              onChange={(e) => setForm({ ...form, grado: e.target.value })}
              required
            />
            <Select
              label="Sección"
              options={SECCION_OPTIONS}
              value={form.seccion}
              onChange={(e) => setForm({ ...form, seccion: e.target.value })}
              required
            />
            <div>
              <Input
                label="N° de Orden"
                placeholder="Ej: 12"
                type="number"
                min={1}
                max={99}
                value={form.numero_orden}
                onChange={(e) => setForm({ ...form, numero_orden: e.target.value })}
                hint="N° en nómina"
              />
            </div>
          </div>

          {/* Insignia visual del código generado */}
          <div className="flex items-center justify-between p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
            <span className="font-medium">Código de estudiante generado:</span>
            <span className="font-mono font-bold text-sm bg-white px-2.5 py-0.5 rounded-lg border border-blue-300 text-[#1e3a5f] shadow-xs">
              {generarCodigoEstudiante(form.grado, form.seccion, form.numero_orden) || '—'}
            </span>
          </div>

          {/* Datos del Apoderado */}
          <div className="pt-2 border-t border-gray-100">
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Datos del Apoderado (Padre / Madre / Tutor)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Nombre completo del Apoderado (opcional)"
                placeholder="Ej: Roberto Quispe Palomino"
                value={form.apoderado_nombre}
                onChange={(e) => setForm({ ...form, apoderado_nombre: e.target.value })}
                error={formErrors.apoderado_nombre}
                leftAddon={<User size={14} />}
              />
              <div>
                <Input
                  label="WhatsApp del Apoderado (opcional)"
                  placeholder="Ej: 956123456"
                  maxLength={11}
                  value={form.apoderado_whatsapp}
                  onChange={(e) => setForm({ ...form, apoderado_whatsapp: e.target.value.replace(/\D/g, '') })}
                  error={formErrors.apoderado_whatsapp}
                  leftAddon={
                    <span className="text-xs font-bold text-[#1e3a5f] bg-blue-100 px-1 py-0.5 rounded">
                      +51 🇵🇪
                    </span>
                  }
                  hint="Opcional. 9 dígitos móviles de Perú"
                />
              </div>
            </div>
          </div>

          {/* Estado Activo */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="estudiante-activo"
              checked={form.activo}
              onChange={(e) => setForm({ ...form, activo: e.target.checked })}
              className="rounded border-gray-300 text-[#1e3a5f] focus:ring-[#2980b9] h-4 w-4"
            />
            <label htmlFor="estudiante-activo" className="text-sm font-medium text-gray-700 cursor-pointer">
              Estudiante matriculado y activo en la institución
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" loading={saving}>
              {isEditing ? 'Guardar Cambios' : 'Registrar Estudiante'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de confirmación para eliminar */}
      <ConfirmModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Estudiante"
        message={`¿Estás seguro de que deseas eliminar al estudiante ${selectedEstudiante?.nombres} ${selectedEstudiante?.apellidos} (${selectedEstudiante?.grado} "${selectedEstudiante?.seccion}")? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}
