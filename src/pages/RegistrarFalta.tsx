import { useState, useEffect, useCallback } from 'react'
import {
  Search, AlertTriangle, MessageSquare, CheckCircle,
  Clock, Calendar, ArrowRight, RefreshCw, AlertCircle, Phone, X,
  CheckSquare, Check, Send, ShieldCheck
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { estudianteService, formatearWhatsApp } from '@/lib/estudianteService'
import {
  enviarWhatsAppGreenApi,
  normalizarNumeroParaGreenApi,
  WHATSAPP_OFICIAL_NUMERO,
} from '@/lib/greenApiService'
import {
  incidenciaService,
  generarMensajeWhatsApp,
  generarEnlaceWhatsApp
} from '@/lib/incidenciaService'
import {
  FALTAS_LEVES_OFICIALES,
  SUB_OPCIONES_FALTAS,
  type Estudiante,
  type TipoFaltaLeve
} from '@/types'

const GRADO_OPTIONS = [
  { value: '', label: 'Todos los grados' },
  { value: '1ro', label: '1ro de Secundaria' },
  { value: '2do', label: '2do de Secundaria' },
  { value: '3ro', label: '3ro de Secundaria' },
  { value: '4to', label: '4to de Secundaria' },
  { value: '5to', label: '5to de Secundaria' },
]

const SECCION_OPTIONS = [
  { value: '', label: 'Todas las secciones' },
  { value: 'A', label: 'Sección "A"' },
  { value: 'B', label: 'Sección "B"' },
  { value: 'C', label: 'Sección "C"' },
  { value: 'D', label: 'Sección "D"' },
  { value: 'E', label: 'Sección "E"' },
]

export default function RegistrarFalta() {
  const navigate = useNavigate()

  // Lista de estudiantes desde Supabase
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([])
  const [loadingEstudiantes, setLoadingEstudiantes] = useState(true)

  // Filtros de búsqueda de estudiante
  const [busqueda, setBusqueda] = useState('')
  const [filtroGrado, setFiltroGrado] = useState('')
  const [filtroSeccion, setFiltroSeccion] = useState('')

  // Estudiante seleccionado
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState<Estudiante | null>(null)

  // Datos del formulario de falta leve
  const [tipoFalta, setTipoFalta] = useState<TipoFaltaLeve | ''>('')
  const [subMotivosSeleccionados, setSubMotivosSeleccionados] = useState<string[]>([])
  const [descripcion, setDescripcion] = useState('')
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0])
  const [hora, setHora] = useState(() =>
    new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })
  )

  // Estados de envío y resultados
  const [guardando, setGuardando] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [resultadoExitoso, setResultadoExitoso] = useState<{
    estudiante: Estudiante
    tipoFalta: string
    subMotivos: string[]
    tieneWhatsapp: boolean
    enviadoGreenApi: boolean
    idMessage?: string
    errorGreenApi?: string | null
    enlaceWaManual?: string | null
  } | null>(null)

  // Cargar estudiantes desde Supabase
  const cargarEstudiantes = useCallback(async () => {
    setLoadingEstudiantes(true)
    const res = await estudianteService.getAll()
    if (!res.error) {
      setEstudiantes(res.data)
    }
    setLoadingEstudiantes(false)
  }, [])

  useEffect(() => {
    cargarEstudiantes()
  }, [cargarEstudiantes])

  // Filtrado de estudiantes para el buscador rápido
  const estudiantesFiltrados = estudiantes.filter((e) => {
    const q = busqueda.toLowerCase().trim()
    const matchQ =
      !q ||
      e.nombres.toLowerCase().includes(q) ||
      e.apellidos.toLowerCase().includes(q) ||
      (e.codigo_estudiante ? e.codigo_estudiante.toLowerCase().includes(q) : false)

    const matchG = !filtroGrado || e.grado === filtroGrado
    const matchS = !filtroSeccion || e.seccion === filtroSeccion

    return matchQ && matchG && matchS
  })

  // Manejo de cambio de falta principal
  const handleSelectFalta = (falta: TipoFaltaLeve) => {
    if (tipoFalta !== falta) {
      setTipoFalta(falta)
      setSubMotivosSeleccionados([])
      setFormError(null)
    }
  }

  // Toggle de un chip de sub-motivo
  const handleToggleSubMotivo = (sub: string) => {
    setSubMotivosSeleccionados((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    )
    setFormError(null)
  }

  // Manejo de envío
  const handleGuardarIncidencia = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!estudianteSeleccionado) {
      setFormError('Debes seleccionar un estudiante para registrar la falta.')
      return
    }

    if (!tipoFalta) {
      setFormError('Debes seleccionar una de las 5 faltas leves oficiales.')
      return
    }

    // Validación obligatoria para presentación personal
    if (
      (tipoFalta === 'Presentación personal' ||
       tipoFalta.startsWith('Incumplimiento de presentación personal')) &&
      subMotivosSeleccionados.length === 0
    ) {
      setFormError(
        'Para la falta de Presentación personal, debes seleccionar obligatoriamente al menos una subcategoría (Corte de cabello no reglamentario, Cabello teñido, Maquillaje o Piercings).'
      )
      return
    }

    setGuardando(true)

    const apoderadoWa = estudianteSeleccionado.apoderado_whatsapp?.trim() || ''
    const tieneNumeroValido = Boolean(
      apoderadoWa && normalizarNumeroParaGreenApi(apoderadoWa)
    )

    // Construcción del detalle a guardar en Supabase
    let descripcionFinal = ''
    if (subMotivosSeleccionados.length > 0) {
      descripcionFinal += `Motivo específico: ${subMotivosSeleccionados.join(', ')}.`
    }
    if (descripcion.trim()) {
      descripcionFinal += (descripcionFinal ? ' ' : '') + `Obs: ${descripcion.trim()}`
    }

    // 1. Guardar primero en Supabase con notificado_whatsapp = false
    const res = await incidenciaService.create({
      estudiante_id: estudianteSeleccionado.id,
      tipo_falta: tipoFalta,
      descripcion: descripcionFinal.trim() || null,
      fecha,
      hora,
      notificado_whatsapp: false,
    })

    if (res.error) {
      setFormError(`Error al guardar en Supabase: ${res.error}`)
      setGuardando(false)
      return
    }

    const incidenciaCreada = res.data

    // 2. Si el alumno tiene número de WhatsApp, disparar envío automático vía Green-API
    if (tieneNumeroValido && apoderadoWa) {
      const mensaje = generarMensajeWhatsApp(
        estudianteSeleccionado,
        tipoFalta,
        descripcion.trim() || null,
        fecha,
        hora,
        subMotivosSeleccionados
      )

      // Envío en segundo plano mediante Green-API
      const resGreen = await enviarWhatsAppGreenApi(apoderadoWa, mensaje)

      if (resGreen.success) {
        // Actualizar notificado_whatsapp = true en Supabase
        if (incidenciaCreada?.id) {
          await incidenciaService.updateNotificado(incidenciaCreada.id, true)
        }

        setResultadoExitoso({
          estudiante: estudianteSeleccionado,
          tipoFalta,
          subMotivos: subMotivosSeleccionados,
          tieneWhatsapp: true,
          enviadoGreenApi: true,
          idMessage: resGreen.idMessage,
          errorGreenApi: null,
          enlaceWaManual: null,
        })
      } else {
        // Falló Green-API: se queda notificado_whatsapp = false y se ofrece fallback manual
        const enlaceManual = generarEnlaceWhatsApp(apoderadoWa, mensaje)
        setResultadoExitoso({
          estudiante: estudianteSeleccionado,
          tipoFalta,
          subMotivos: subMotivosSeleccionados,
          tieneWhatsapp: true,
          enviadoGreenApi: false,
          errorGreenApi: resGreen.error,
          enlaceWaManual: enlaceManual,
        })
      }
    } else {
      // Estudiante sin número de WhatsApp
      setResultadoExitoso({
        estudiante: estudianteSeleccionado,
        tipoFalta,
        subMotivos: subMotivosSeleccionados,
        tieneWhatsapp: false,
        enviadoGreenApi: false,
        errorGreenApi: null,
        enlaceWaManual: null,
      })
    }

    setGuardando(false)
  }

  // Reiniciar formulario para registrar otra falta
  const handleRegistrarOtra = () => {
    setResultadoExitoso(null)
    setEstudianteSeleccionado(null)
    setTipoFalta('')
    setSubMotivosSeleccionados([])
    setDescripcion('')
    setBusqueda('')
    setFecha(new Date().toISOString().split('T')[0])
    setHora(new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false }))
  }

  // ─── PANTALLA DE ÉXITO ────────────────────────────────────────────────────────
  if (resultadoExitoso) {
    const est = resultadoExitoso.estudiante
    return (
      <div className="max-w-2xl mx-auto space-y-6 pt-4 animate-fade-in">
        <Card className="text-center p-8 border-green-200 bg-white shadow-md">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 shadow-xs">
            <CheckCircle size={36} />
          </div>

          <h2 className="text-xl font-bold text-gray-900">¡Falta Leve Registrada Exitosamente!</h2>
          <p className="text-sm text-gray-500 mt-1">
            La incidencia quedó asentada en el sistema de la I.E. Juan Pablo Viscardo y Guzmán.
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-left my-6 space-y-2 text-xs">
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-500">Estudiante:</span>
              <span className="font-semibold text-gray-900">{est.apellidos}, {est.nombres}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-500">Código / Grado:</span>
              <span className="font-mono font-bold text-purple-700">
                {est.codigo_estudiante || '—'} · {est.grado} &ldquo;{est.seccion}&rdquo;
              </span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-gray-500">Falta registrada:</span>
              <span className="font-semibold text-red-700">{resultadoExitoso.tipoFalta}</span>
            </div>
            {resultadoExitoso.subMotivos && resultadoExitoso.subMotivos.length > 0 && (
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-500">Motivo(s) específico(s):</span>
                <span className="font-semibold text-purple-700">
                  {resultadoExitoso.subMotivos.join(', ')}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Notificación WhatsApp:</span>
              <span>
                {resultadoExitoso.enviadoGreenApi ? (
                  <Badge variant="success" size="sm">✓ Enviado desde WhatsApp Oficial</Badge>
                ) : resultadoExitoso.tieneWhatsapp ? (
                  <Badge variant="warning" size="sm">Pendiente / Falló envío automático</Badge>
                ) : (
                  <Badge variant="default" size="sm">Sin WhatsApp (solo en BD)</Badge>
                )}
              </span>
            </div>
          </div>

          {/* BANNER 1: ENVÍO AUTOMÁTICO EXITOSO DESDE GREEN-API */}
          {resultadoExitoso.enviadoGreenApi && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 text-left space-y-2.5 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 flex-shrink-0">
                  <Send size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-950 text-sm">
                    ¡Comunicado despachado automáticamente por WhatsApp!
                  </h4>
                  <p className="text-emerald-700 text-[11px]">
                    Enviado en segundo plano desde el WhatsApp oficial del colegio ({WHATSAPP_OFICIAL_NUMERO})
                  </p>
                </div>
              </div>

              <div className="bg-white/80 border border-emerald-200 rounded-xl p-3 space-y-1.5 text-gray-700 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Apoderado destinatario:</span>
                  <span className="font-semibold text-gray-900">
                    {est.apoderado_nombre || 'Apoderado'} ({formatearWhatsApp(est.apoderado_whatsapp || '')})
                  </span>
                </div>
                {resultadoExitoso.idMessage && (
                  <div className="flex justify-between items-center pt-1 border-t border-emerald-100">
                    <span className="text-gray-500">ID de Confirmación Green-API:</span>
                    <span className="font-mono text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 truncate max-w-[200px]">
                      {resultadoExitoso.idMessage}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-emerald-800 font-medium">
                ✓ Enviado automáticamente sin abrir pestañas externas ni depender de tu teléfono móvil.
              </p>
            </div>
          )}

          {/* BANNER 2: ERROR AL ENVIAR POR GREEN-API (CON BOTÓN MANUAL DE RESPALDO) */}
          {resultadoExitoso.tieneWhatsapp && !resultadoExitoso.enviadoGreenApi && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-950 text-left space-y-3 shadow-xs">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-900 text-sm">
                    Incidencia guardada en el sistema, pero el envío automático por WhatsApp falló
                  </h4>
                  <p className="text-amber-800 text-[11px] mt-0.5">
                    {resultadoExitoso.errorGreenApi || 'No se pudo completar la conexión con Green-API.'}
                  </p>
                </div>
              </div>

              {resultadoExitoso.enlaceWaManual && (
                <div className="pt-2 border-t border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <span className="text-amber-800 text-[11px]">
                    Puedes abrir el comunicado directamente en WhatsApp Web como respaldo:
                  </span>
                  <a
                    href={resultadoExitoso.enlaceWaManual}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg text-xs shadow-xs transition-colors flex-shrink-0"
                  >
                    <MessageSquare size={13} />
                    Abrir WhatsApp Manual (wa.me)
                  </a>
                </div>
              )}
            </div>
          )}

          {/* BANNER 3: ALUMNO SIN WHATSAPP */}
          {!resultadoExitoso.tieneWhatsapp && (
            <div className="mb-6 p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-gray-700 text-left flex items-start gap-2.5">
              <AlertCircle size={16} className="text-gray-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Aviso:</strong> El estudiante no tiene número de WhatsApp registrado para su apoderado. La falta leve quedó guardada correctamente en el historial interno.
              </span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="primary"
              leftIcon={<RefreshCw size={15} />}
              onClick={handleRegistrarOtra}
            >
              Registrar otra falta leve
            </Button>
            <Button
              variant="secondary"
              rightIcon={<ArrowRight size={14} />}
              onClick={() => navigate('/historial')}
            >
              Ver historial de incidencias
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // ─── FORMULARIO PRINCIPAL ────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <AlertTriangle className="text-amber-500" size={24} />
          Registrar Falta Leve
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          I.E. Juan Pablo Viscardo y Guzmán — Sistema SIRECE de Registro y Comunicación Inmediata
        </p>
      </div>

      {formError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2 shadow-xs">
          <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
          <span>{formError}</span>
        </div>
      )}

      {/* PASO 1: SELECCIONAR ESTUDIANTE */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-xs font-bold">
              1
            </div>
            <CardTitle>Identificación del Estudiante</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {!estudianteSeleccionado ? (
            <>
              {/* Filtros de búsqueda */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <Input
                    placeholder="Buscar por código (ej: 5B1), apellido o nombre..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    leftAddon={<Search size={14} />}
                    autoFocus
                  />
                </div>
                <div>
                  <Select
                    value={filtroGrado}
                    onChange={(e) => setFiltroGrado(e.target.value)}
                    options={GRADO_OPTIONS}
                  />
                </div>
                <div>
                  <Select
                    value={filtroSeccion}
                    onChange={(e) => setFiltroSeccion(e.target.value)}
                    options={SECCION_OPTIONS}
                  />
                </div>
              </div>

              {/* Lista de resultados de búsqueda */}
              <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-64 overflow-y-auto">
                {loadingEstudiantes ? (
                  <div className="py-8 text-center text-gray-400 flex flex-col items-center gap-2">
                    <Spinner size="md" />
                    <span className="text-xs">Cargando nómina de estudiantes...</span>
                  </div>
                ) : estudiantesFiltrados.length > 0 ? (
                  estudiantesFiltrados.slice(0, 15).map((est) => {
                    const initials = (est.nombres[0] || '') + (est.apellidos[0] || '')
                    return (
                      <button
                        key={est.id}
                        type="button"
                        onClick={() => setEstudianteSeleccionado(est)}
                        className="w-full text-left p-3 hover:bg-blue-50/70 transition-colors flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {est.foto_url ? (
                            <img
                              src={est.foto_url}
                              alt=""
                              className="w-9 h-9 rounded-full object-cover border border-blue-200 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                              {initials}
                            </div>
                          )}
                          <div className="truncate">
                            <p className="text-xs font-semibold text-gray-900 truncate">
                              {est.apellidos}, {est.nombres}
                            </p>
                            <p className="text-[11px] text-gray-500">
                              Apoderado: {est.apoderado_nombre || 'Sin registrar'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {est.codigo_estudiante && (
                            <span className="font-mono font-bold text-[11px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded">
                              {est.codigo_estudiante}
                            </span>
                          )}
                          <Badge variant="primary" size="sm">
                            {est.grado} &ldquo;{est.seccion}&rdquo;
                          </Badge>
                        </div>
                      </button>
                    )
                  })
                ) : (
                  <div className="p-6 text-center text-gray-400 text-xs">
                    No se encontraron estudiantes con los criterios de búsqueda.
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Ficha del estudiante seleccionado */
            <div className="p-4 bg-gradient-to-r from-blue-50/80 to-white border border-blue-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                {estudianteSeleccionado.foto_url ? (
                  <img
                    src={estudianteSeleccionado.foto_url}
                    alt=""
                    className="w-14 h-14 rounded-full object-cover border-2 border-blue-400 shadow-sm"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2563a0] text-white flex items-center justify-center font-bold text-base shadow-sm">
                    {(estudianteSeleccionado.nombres[0] || '') + (estudianteSeleccionado.apellidos[0] || '')}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm text-gray-900">
                      {estudianteSeleccionado.apellidos}, {estudianteSeleccionado.nombres}
                    </h3>
                    {estudianteSeleccionado.codigo_estudiante && (
                      <span className="font-mono font-bold text-xs bg-purple-100 text-purple-800 border border-purple-300 px-2 py-0.5 rounded-md">
                        {estudianteSeleccionado.codigo_estudiante}
                      </span>
                    )}
                    <Badge variant="primary" size="sm">
                      {estudianteSeleccionado.grado} &ldquo;{estudianteSeleccionado.seccion}&rdquo;
                    </Badge>
                  </div>

                  <p className="text-xs text-gray-600 mt-1">
                    <strong>Apoderado:</strong> {estudianteSeleccionado.apoderado_nombre || 'Sin registrar'}
                  </p>

                  <div className="flex items-center gap-2 mt-1">
                    {estudianteSeleccionado.apoderado_whatsapp ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                        <Phone size={12} className="text-green-600" />
                        WhatsApp: {formatearWhatsApp(estudianteSeleccionado.apoderado_whatsapp)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <AlertCircle size={12} />
                        Sin WhatsApp registrado
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="xs"
                leftIcon={<X size={12} />}
                onClick={() => setEstudianteSeleccionado(null)}
              >
                Cambiar estudiante
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PASO 2: SELECCIÓN DE FALTA LEVE OFICIAL Y SUB-OPCIONES ESPECÍFICAS */}
      <form onSubmit={handleGuardarIncidencia} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-xs font-bold">
                2
              </div>
              <CardTitle>Selección de Falta Leve y Motivos Específicos</CardTitle>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-xs text-gray-500">
              Selecciona una de las 5 opciones reglamentarias y marca los motivos específicos correspondientes:
            </p>

            {/* Las 5 faltas oficiales en tarjetas interactivas */}
            <div className="space-y-3">
              {FALTAS_LEVES_OFICIALES.map((falta, idx) => {
                const isSelected = tipoFalta === falta
                const subOpciones = SUB_OPCIONES_FALTAS[falta] || []
                const esObligatorio = falta === 'Presentación personal' || falta.startsWith('Incumplimiento')

                return (
                  <div
                    key={falta}
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      isSelected
                        ? 'border-[#1e3a5f] bg-blue-50/40 shadow-sm ring-1 ring-[#1e3a5f]'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectFalta(falta)}
                      className="w-full text-left p-4 flex items-start gap-3 cursor-pointer"
                    >
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isSelected
                            ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white'
                            : 'border-gray-300 bg-white'
                        }`}
                      >
                        {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-[#1e3a5f]">Opción {idx + 1}</span>
                          {esObligatorio && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                              Requiere marcar motivo(s)
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-gray-900 mt-0.5 leading-snug">
                          {falta}
                        </p>
                      </div>
                    </button>

                    {/* Chips de sub-opciones cuando está seleccionada */}
                    {isSelected && subOpciones.length > 0 && (
                      <div className="px-4 pb-4 pt-1 border-t border-blue-200/50 space-y-2.5 animate-fade-in bg-white/70">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-[#1e3a5f] uppercase tracking-wider flex items-center gap-1.5">
                            <CheckSquare size={13} className="text-[#2563a0]" />
                            {esObligatorio
                              ? 'Selecciona la subcategoría específica (obligatorio):'
                              : 'Detalles específicos opcionales (marca uno o varios):'}
                          </span>
                          {subMotivosSeleccionados.length > 0 && (
                            <span className="text-[11px] font-semibold text-[#1e3a5f] bg-blue-100 px-2 py-0.5 rounded-full">
                              {subMotivosSeleccionados.length} marcado(s)
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {subOpciones.map((sub) => {
                            const isChecked = subMotivosSeleccionados.includes(sub)
                            return (
                              <button
                                key={sub}
                                type="button"
                                onClick={() => handleToggleSubMotivo(sub)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                                  isChecked
                                    ? 'bg-[#1e3a5f] text-white shadow-xs scale-[1.02]'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200/80 border border-transparent'
                                }`}
                              >
                                <span>{sub}</span>
                                {isChecked && <Check size={13} className="text-white" />}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Fecha y Hora */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-100">
              <Input
                label="Fecha de la falta"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                leftAddon={<Calendar size={14} />}
                required
              />
              <Input
                label="Hora registrada"
                type="text"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                leftAddon={<Clock size={14} />}
                placeholder="HH:MM"
                required
              />
            </div>

            {/* Observación / Detalle adicional */}
            <div>
              <Textarea
                label="Observación / Detalle adicional del docente o auxiliar (opcional)"
                placeholder="Escribe comentarios u observaciones adicionales..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={2}
                hint="Se incluirá junto a los motivos específicos en el comunicado de WhatsApp enviado al apoderado."
              />
            </div>
          </CardContent>
        </Card>

        {/* BOTÓN PRINCIPAL DE GUARDADO */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-white border border-gray-200 rounded-2xl shadow-sm gap-3">
          <div className="text-xs text-gray-500">
            {estudianteSeleccionado?.apoderado_whatsapp ? (
              <span className="text-green-700 font-medium flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-green-600 flex-shrink-0" />
                <span>
                  Envío automático desde WhatsApp Oficial de la I.E. ({WHATSAPP_OFICIAL_NUMERO})
                </span>
              </span>
            ) : (
              <span className="text-amber-700 flex items-center gap-1.5">
                <AlertCircle size={15} className="text-amber-600 flex-shrink-0" />
                <span>Se registrará en el sistema (estudiante sin WhatsApp registrado)</span>
              </span>
            )}
          </div>

          <Button
            type="submit"
            size="md"
            variant="primary"
            loading={guardando}
            disabled={!estudianteSeleccionado || !tipoFalta}
            leftIcon={<Send size={15} />}
            className="shadow-sm w-full sm:w-auto"
          >
            {guardando ? 'Guardando y enviando por WhatsApp...' : 'Guardar y Enviar por WhatsApp Oficial'}
          </Button>
        </div>
      </form>
    </div>
  )
}
