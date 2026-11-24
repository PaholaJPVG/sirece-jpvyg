import { useState, useEffect, useCallback } from 'react'
import {
  Search, MessageSquare, Trash2, Eye, RefreshCw,
  AlertCircle, CheckCircle, Send, ExternalLink, AlertTriangle, ShieldCheck
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Input, Select } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import {
  incidenciaService,
  generarMensajeWhatsApp,
  generarEnlaceWhatsApp
} from '@/lib/incidenciaService'
import { supabase } from '@/lib/supabase'
import { formatearWhatsApp } from '@/lib/estudianteService'
import {
  enviarWhatsAppGreenApi,
  normalizarNumeroParaGreenApi,
  WHATSAPP_OFICIAL_NUMERO,
} from '@/lib/greenApiService'
import { FALTAS_LEVES_OFICIALES, type IncidenciaDB, type Estudiante } from '@/types'

export default function HistorialIncidencias() {
  const navigate = useNavigate()
  const [incidencias, setIncidencias] = useState<IncidenciaDB[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [tableMissing, setTableMissing] = useState(false)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [faltaFiltro, setFaltaFiltro] = useState('')
  const [notifFiltro, setNotifFiltro] = useState('')

  // Modales
  const [detalleModalOpen, setDetalleModalOpen] = useState(false)
  const [incidenciaDetalle, setIncidenciaDetalle] = useState<IncidenciaDB | null>(null)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [incidenciaAEliminar, setIncidenciaAEliminar] = useState<IncidenciaDB | null>(null)
  const [eliminando, setEliminando] = useState(false)

  // Envío Green-API
  const [enviandoWaId, setEnviandoWaId] = useState<string | null>(null)
  const [waErrorModal, setWaErrorModal] = useState<{
    incidencia: IncidenciaDB
    error: string
    enlaceManual: string | null
  } | null>(null)

  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  // Cargar incidencias desde Supabase
  const cargarIncidencias = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    setTableMissing(false)

    const res = await incidenciaService.getAll()

    if (res.tableMissing) {
      setTableMissing(true)
    } else if (res.error) {
      setErrorMsg(res.error)
    } else {
      setIncidencias(res.data)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    cargarIncidencias()
  }, [cargarIncidencias])

  // Notificar o reenviar WhatsApp automáticamente vía Green-API
  const handleReenviarWhatsApp = async (inc: IncidenciaDB) => {
    setEnviandoWaId(inc.id)

    // 1. Consultar siempre los datos actualizados del estudiante directamente en Supabase (evitar caché desactualizada)
    let estudianteActual = inc.estudiantes as Estudiante | null
    try {
      const { data: estFresh, error: estErr } = await supabase
        .from('estudiantes')
        .select('*')
        .eq('id', inc.estudiante_id)
        .single()

      if (!estErr && estFresh) {
        estudianteActual = estFresh as Estudiante
        setIncidencias((prev) =>
          prev.map((i) => (i.id === inc.id ? { ...i, estudiantes: estFresh as Estudiante } : i))
        )
      }
    } catch (err) {
      console.warn('[Historial] No se pudo refrescar el estudiante desde Supabase:', err)
    }

    if (!estudianteActual) {
      showToast('⚠️ No se encontraron los datos del estudiante en la base de datos.')
      setEnviandoWaId(null)
      return
    }

    const apoderadoWa = estudianteActual.apoderado_whatsapp?.trim() || ''
    const numLimpio = apoderadoWa ? normalizarNumeroParaGreenApi(apoderadoWa) : null

    if (!numLimpio || !apoderadoWa) {
      const aviso = `⚠️ El teléfono "${apoderadoWa || 'vacío'}" no es válido para WhatsApp (debe tener 9 dígitos y empezar con 9).`
      console.warn('[Historial]', aviso)
      showToast(aviso)
      setEnviandoWaId(null)
      return
    }

    const chatIdEsperado = `${numLimpio}@c.us`
    console.log(`[Historial] Reenviando incidencia #${inc.id} | Estudiante: ${estudianteActual.nombres} ${estudianteActual.apellidos} | Destino: "${chatIdEsperado}"`)

    const mensaje = generarMensajeWhatsApp(
      estudianteActual,
      inc.tipo_falta,
      inc.descripcion,
      inc.fecha,
      inc.hora
    )

    const resGreen = await enviarWhatsAppGreenApi(apoderadoWa, mensaje)

    if (resGreen.success) {
      // Marcar como notificado en Supabase
      if (!inc.notificado_whatsapp) {
        await incidenciaService.updateNotificado(inc.id, true)
      }
      setIncidencias((prev) =>
        prev.map((i) => (i.id === inc.id ? { ...i, notificado_whatsapp: true, estudiantes: estudianteActual } : i))
      )
      if (incidenciaDetalle?.id === inc.id) {
        setIncidenciaDetalle((prev) => (prev ? { ...prev, notificado_whatsapp: true, estudiantes: estudianteActual } : null))
      }
      showToast(`✓ ¡Comunicado enviado con éxito a ${chatIdEsperado} desde el WhatsApp Oficial!`)
    } else {
      // Si falla Green-API, abrimos modal con detalle y fallback manual
      console.error(`[Historial] Error devuelto al reenviar a ${chatIdEsperado}:`, resGreen.error)
      const manualUrl = generarEnlaceWhatsApp(apoderadoWa, mensaje)
      setWaErrorModal({
        incidencia: { ...inc, estudiantes: estudianteActual },
        error: resGreen.error || `Error al despachar mensaje a ${chatIdEsperado}.`,
        enlaceManual: manualUrl,
      })
    }

    setEnviandoWaId(null)
  }

  // Eliminar incidencia
  const handleConfirmDelete = async () => {
    if (!incidenciaAEliminar) return
    setEliminando(true)
    const res = await incidenciaService.delete(incidenciaAEliminar.id)

    if (res.error) {
      setErrorMsg(res.error)
    } else {
      setDeleteModalOpen(false)
      setIncidenciaAEliminar(null)
      showToast('Incidencia eliminada correctamente.')
      cargarIncidencias()
    }
    setEliminando(false)
  }

  // Filtrado
  const incidenciasFiltradas = incidencias.filter((inc) => {
    const est = inc.estudiantes as Estudiante | null
    const q = busqueda.toLowerCase().trim()

    const matchQ =
      !q ||
      inc.tipo_falta.toLowerCase().includes(q) ||
      (inc.descripcion ? inc.descripcion.toLowerCase().includes(q) : false) ||
      (est ? `${est.nombres} ${est.apellidos}`.toLowerCase().includes(q) : false) ||
      (est?.codigo_estudiante ? est.codigo_estudiante.toLowerCase().includes(q) : false)

    const matchFalta =
      !faltaFiltro ||
      inc.tipo_falta === faltaFiltro ||
      (faltaFiltro === 'Presentación personal' && inc.tipo_falta.toLowerCase().includes('presentación')) ||
      (faltaFiltro === 'Sin uniforme' && inc.tipo_falta.toLowerCase().includes('uniforme')) ||
      (faltaFiltro === 'Uso de celular s/autorización' && inc.tipo_falta.toLowerCase().includes('celular'))

    let matchNotif = true
    if (notifFiltro === 'notificado') {
      matchNotif = inc.notificado_whatsapp
    } else if (notifFiltro === 'pendiente') {
      matchNotif = !inc.notificado_whatsapp && Boolean(est?.apoderado_whatsapp)
    } else if (notifFiltro === 'sin_wa') {
      matchNotif = !est?.apoderado_whatsapp
    }

    return matchQ && matchFalta && matchNotif
  })

  return (
    <div className="space-y-5">
      {/* Toast flotante */}
      {toast && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 text-green-900 rounded-xl text-xs transition-all animate-fade-in shadow-sm">
          <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Banner de tabla pendiente */}
      {tableMissing && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl p-4 shadow-sm">
          <AlertCircle size={22} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Tabla "incidencias" pendiente de creación en Supabase</h4>
            <p className="text-xs text-amber-800 mt-1">
              Ejecuta el script SQL en el <strong>SQL Editor</strong> de Supabase para crear la tabla con sus relaciones y permisos.
            </p>
            <Button
              variant="secondary"
              size="xs"
              className="mt-3 bg-white border-amber-300 text-amber-900 hover:bg-amber-100"
              leftIcon={<RefreshCw size={13} />}
              onClick={cargarIncidencias}
            >
              Comprobar nuevamente
            </Button>
          </div>
        </div>
      )}

      {/* Error de consulta */}
      {errorMsg && !tableMissing && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs">
          <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Historial de Incidencias Estudiantiles</CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              Registro cronológico de faltas leves y seguimiento de comunicaciones por WhatsApp
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
              onClick={cargarIncidencias}
              disabled={loading}
              title="Recargar historial"
            >
              Actualizar
            </Button>
            <Button size="sm" variant="primary" onClick={() => navigate('/registrar-falta')}>
              Registrar Falta Leve
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Barra de filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <Input
                placeholder="Buscar por código (ej: 5B1), estudiante o falta..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                leftAddon={<Search size={14} />}
              />
            </div>
            <div>
              <Select
                value={faltaFiltro}
                onChange={(e) => setFaltaFiltro(e.target.value)}
                options={[
                  { value: '', label: 'Todas las faltas leves' },
                  ...FALTAS_LEVES_OFICIALES.map((f) => ({ value: f, label: f })),
                ]}
              />
            </div>
            <div>
              <Select
                value={notifFiltro}
                onChange={(e) => setNotifFiltro(e.target.value)}
                options={[
                  { value: '', label: 'Todos los estados WA' },
                  { value: 'notificado', label: 'Notificado por WhatsApp' },
                  { value: 'pendiente', label: 'Pendiente de envío' },
                  { value: 'sin_wa', label: 'Sin WhatsApp' },
                ]}
              />
            </div>
          </div>

          {/* Tabla de incidencias */}
          {loading ? (
            <div className="py-16 text-center text-gray-400 flex flex-col items-center gap-2">
              <Spinner size="lg" />
              <span className="text-xs">Cargando incidencias desde Supabase...</span>
            </div>
          ) : incidenciasFiltradas.length > 0 ? (
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#1e3a5f] text-white uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-3">Fecha / Hora</th>
                      <th className="py-3 px-3">Código</th>
                      <th className="py-3 px-3">Estudiante</th>
                      <th className="py-3 px-3">Grado</th>
                      <th className="py-3 px-3">Falta Leve Registrada</th>
                      <th className="py-3 px-3 text-center">Estado WhatsApp</th>
                      <th className="py-3 px-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {incidenciasFiltradas.map((inc) => {
                      const est = inc.estudiantes as Estudiante | null
                      const tieneWa = Boolean(est?.apoderado_whatsapp)

                      return (
                        <tr key={inc.id} className="hover:bg-blue-50/40 transition-colors">
                          {/* Fecha / Hora */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="font-semibold text-gray-900">{inc.fecha}</div>
                            <div className="text-[10px] text-gray-400">{inc.hora}</div>
                          </td>

                          {/* Código de Estudiante */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            {est?.codigo_estudiante ? (
                              <span className="font-mono font-bold text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md">
                                {est.codigo_estudiante}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>

                          {/* Estudiante */}
                          <td className="py-3 px-3">
                            {est ? (
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {est.apellidos}, {est.nombres}
                                </p>
                                <p className="text-[11px] text-gray-400 truncate max-w-xs">
                                  Apoderado: {est.apoderado_nombre || 'Sin registrar'}
                                </p>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">Estudiante no encontrado</span>
                            )}
                          </td>

                          {/* Grado y Sección */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            {est ? (
                              <Badge variant="primary" size="sm">
                                {est.grado} &ldquo;{est.seccion}&rdquo;
                              </Badge>
                            ) : (
                              '—'
                            )}
                          </td>

                          {/* Falta Leve y Observación */}
                          <td className="py-3 px-3 max-w-xs">
                            <p className="font-medium text-gray-800 line-clamp-2 leading-snug">
                              {inc.tipo_falta}
                            </p>
                            {inc.descripcion && (
                              <p className="text-[11px] text-gray-500 italic mt-0.5 truncate">
                                &ldquo;{inc.descripcion}&rdquo;
                              </p>
                            )}
                          </td>

                          {/* Estado WhatsApp */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {inc.notificado_whatsapp ? (
                              <Badge variant="success" size="sm">
                                Notificado WA
                              </Badge>
                            ) : tieneWa ? (
                              <Badge variant="warning" size="sm">
                                Pendiente WA
                              </Badge>
                            ) : (
                              <Badge variant="default" size="sm">
                                Sin WhatsApp
                              </Badge>
                            )}
                          </td>

                          {/* Acciones */}
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              {/* Reenviar WhatsApp */}
                              <button
                                type="button"
                                onClick={() => handleReenviarWhatsApp(inc)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  tieneWa
                                    ? 'text-green-600 hover:bg-green-50'
                                    : 'text-gray-300 cursor-not-allowed'
                                }`}
                                title={
                                  tieneWa
                                    ? `Enviar comunicado automáticamente desde el WhatsApp oficial (${WHATSAPP_OFICIAL_NUMERO})`
                                    : 'El estudiante no tiene número de WhatsApp'
                                }
                                disabled={!tieneWa || enviandoWaId === inc.id}
                              >
                                {enviandoWaId === inc.id ? (
                                  <Spinner size="xs" className="text-green-600" />
                                ) : (
                                  <Send size={15} />
                                )}
                              </button>

                              {/* Ver detalle */}
                              <button
                                type="button"
                                onClick={() => {
                                  setIncidenciaDetalle(inc)
                                  setDetalleModalOpen(true)
                                }}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Ver detalle completo"
                              >
                                <Eye size={15} />
                              </button>

                              {/* Eliminar */}
                              <button
                                type="button"
                                onClick={() => {
                                  setIncidenciaAEliminar(inc)
                                  setDeleteModalOpen(true)
                                }}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar registro"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-14 text-center border border-dashed border-gray-200 rounded-xl text-gray-400">
              <MessageSquare size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium text-gray-600">
                {incidencias.length === 0
                  ? 'No hay faltas leves registradas aún'
                  : 'No se encontraron incidencias con los filtros aplicados'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {incidencias.length === 0
                  ? 'Las incidencias registradas en el módulo "Registrar Falta Leve" aparecerán aquí.'
                  : 'Intenta limpiar el buscador o seleccionar otra opción de filtro.'}
              </p>
              {incidencias.length === 0 && (
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate('/registrar-falta')}
                >
                  Registrar primera falta
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalle Completo de la Incidencia */}
      {incidenciaDetalle && (
        <Modal
          open={detalleModalOpen}
          onClose={() => setDetalleModalOpen(false)}
          title="Detalle de Incidencia Registrada"
          description="Información completa de la falta leve y comunicado institucional."
          size="lg"
        >
          <div className="space-y-4 text-xs">
            {/* Ficha del estudiante */}
            {incidenciaDetalle.estudiantes && (
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-gray-900">
                    {(incidenciaDetalle.estudiantes as Estudiante).apellidos},{' '}
                    {(incidenciaDetalle.estudiantes as Estudiante).nombres}
                  </h4>
                  {(incidenciaDetalle.estudiantes as Estudiante).codigo_estudiante && (
                    <span className="font-mono font-bold text-xs bg-purple-100 text-purple-800 border border-purple-300 px-2 py-0.5 rounded">
                      {(incidenciaDetalle.estudiantes as Estudiante).codigo_estudiante}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-gray-600">
                  <div>
                    <strong>Grado y Sección:</strong> {(incidenciaDetalle.estudiantes as Estudiante).grado}{' '}
                    &ldquo;{(incidenciaDetalle.estudiantes as Estudiante).seccion}&rdquo;
                  </div>
                  <div>
                    <strong>Apoderado:</strong>{' '}
                    {(incidenciaDetalle.estudiantes as Estudiante).apoderado_nombre || 'Sin registrar'}
                  </div>
                  <div>
                    <strong>WhatsApp:</strong>{' '}
                    {(incidenciaDetalle.estudiantes as Estudiante).apoderado_whatsapp
                      ? formatearWhatsApp((incidenciaDetalle.estudiantes as Estudiante).apoderado_whatsapp)
                      : 'Sin registrar'}
                  </div>
                </div>
              </div>
            )}

            {/* Datos de la Falta */}
            <div className="space-y-2">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-gray-500">Fecha y Hora:</span>
                <span className="font-semibold text-gray-800">
                  {incidenciaDetalle.fecha} — {incidenciaDetalle.hora}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-gray-500">Falta Leve:</span>
                <span className="font-semibold text-red-700 max-w-md text-right">
                  {incidenciaDetalle.tipo_falta}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-gray-500">Observación / Detalle:</span>
                <span className="font-medium text-gray-800 max-w-md text-right">
                  {incidenciaDetalle.descripcion || 'Sin observaciones'}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-gray-500">Notificado por WhatsApp:</span>
                <span>
                  {incidenciaDetalle.notificado_whatsapp ? (
                    <Badge variant="success" size="sm">
                      ✓ Enviado desde WhatsApp Oficial ({WHATSAPP_OFICIAL_NUMERO})
                    </Badge>
                  ) : (
                    <Badge variant="warning" size="sm">
                      Pendiente de notificación
                    </Badge>
                  )}
                </span>
              </div>
            </div>

            {/* Vista previa del mensaje oficial de WhatsApp */}
            {incidenciaDetalle.estudiantes && (
              <div className="pt-2">
                <p className="font-semibold text-gray-700 mb-1">Texto del comunicado WhatsApp:</p>
                <div className="bg-gray-100 p-3 rounded-xl font-mono text-[11px] whitespace-pre-wrap text-gray-800 border border-gray-200">
                  {generarMensajeWhatsApp(
                    incidenciaDetalle.estudiantes as Estudiante,
                    incidenciaDetalle.tipo_falta,
                    incidenciaDetalle.descripcion,
                    incidenciaDetalle.fecha,
                    incidenciaDetalle.hora
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-3 border-t">
              <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-blue-600 flex-shrink-0" />
                <span>Canal oficial I.E.: {WHATSAPP_OFICIAL_NUMERO}</span>
              </div>

              <div className="flex items-center gap-2">
                {Boolean((incidenciaDetalle.estudiantes as Estudiante)?.apoderado_whatsapp) && (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      loading={enviandoWaId === incidenciaDetalle.id}
                      leftIcon={<Send size={14} />}
                      onClick={() => handleReenviarWhatsApp(incidenciaDetalle)}
                    >
                      {incidenciaDetalle.notificado_whatsapp
                        ? 'Reenviar vía WhatsApp Oficial'
                        : 'Enviar vía WhatsApp Oficial'}
                    </Button>
                    <a
                      href={
                        generarEnlaceWhatsApp(
                          (incidenciaDetalle.estudiantes as Estudiante).apoderado_whatsapp || '',
                          generarMensajeWhatsApp(
                            incidenciaDetalle.estudiantes as Estudiante,
                            incidenciaDetalle.tipo_falta,
                            incidenciaDetalle.descripcion,
                            incidenciaDetalle.fecha,
                            incidenciaDetalle.hora
                          )
                        ) || '#'
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                      title="Abrir directamente en WhatsApp Web o móvil"
                    >
                      <ExternalLink size={12} />
                      WhatsApp Manual
                    </a>
                  </>
                )}
                <Button variant="secondary" size="sm" onClick={() => setDetalleModalOpen(false)}>
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de error de Green-API con fallback a wa.me manual */}
      {waErrorModal && (
        <Modal
          open={Boolean(waErrorModal)}
          onClose={() => setWaErrorModal(null)}
          title="Aviso de Envío por WhatsApp"
          description="Ocurrió un problema al enviar automáticamente desde el WhatsApp oficial."
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-amber-900">
                    No se pudo completar el envío por Green-API
                  </h5>
                  <p className="text-amber-800 text-[11px] mt-0.5">
                    {waErrorModal.error}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-amber-800">
                La incidencia se encuentra guardada en el sistema, pero el mensaje no pudo salir desde el número oficial ({WHATSAPP_OFICIAL_NUMERO}).
              </p>
            </div>

            {waErrorModal.enlaceManual && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                <p className="font-semibold text-gray-700">
                  ¿Deseas enviarlo manualmente desde tu WhatsApp Web o tu celular?
                </p>
                <a
                  href={waErrorModal.enlaceManual}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setWaErrorModal(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg text-xs shadow-xs transition-colors"
                >
                  <MessageSquare size={14} />
                  Abrir WhatsApp Manual (wa.me)
                  <ExternalLink size={12} />
                </a>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t">
              <Button variant="secondary" size="sm" onClick={() => setWaErrorModal(null)}>
                Entendido / Cerrar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de confirmación para eliminar */}
      <ConfirmModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Incidencia"
        message={`¿Estás seguro de que deseas eliminar este registro de falta leve? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        loading={eliminando}
      />
    </div>
  )
}
