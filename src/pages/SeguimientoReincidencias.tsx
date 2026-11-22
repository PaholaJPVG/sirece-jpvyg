import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  RefreshCw,
  FileText,
  Printer,
  ShieldCheck,
  CheckCircle,
  Send,
  Plus,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import {
  enviarWhatsAppGreenApi,
  normalizarNumeroParaGreenApi,
  WHATSAPP_OFICIAL_NUMERO,
} from '@/lib/greenApiService'
import { generarEnlaceWhatsApp } from '@/lib/incidenciaService'
import { formatearWhatsApp } from '@/lib/estudianteService'
import { type Estudiante, type IncidenciaDB } from '@/types'

interface AlumnoReincidente {
  estudiante: Estudiante
  totalFaltas: number
  faltas: IncidenciaDB[]
  ultimaFecha: string
  nivelRiesgo: 'leve' | 'medio' | 'critico'
}

export default function SeguimientoReincidencias() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Datos reales desde Supabase
  const [reincidentes, setReincidentes] = useState<AlumnoReincidente[]>([])
  const [totalIncidencias, setTotalIncidencias] = useState(0)
  const [alumnosConUnaFalta, setAlumnosConUnaFalta] = useState(0)

  // Estados de modales y acciones
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<AlumnoReincidente | null>(null)
  const [modalActaOpen, setModalActaOpen] = useState(false)
  const [modalCitacionOpen, setModalCitacionOpen] = useState(false)
  const [enviandoCitacion, setEnviandoCitacion] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  // Carga y procesamiento de reincidentes reales
  const cargarReincidentes = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      if (!isSupabaseConfigured()) {
        setLoading(false)
        setRefreshing(false)
        return
      }

      // Obtener todas las incidencias ordenadas por fecha reciente con datos del estudiante
      const { data, error } = await supabase
        .from('incidencias')
        .select(`
          id,
          estudiante_id,
          personal_id,
          tipo_falta,
          descripcion,
          fecha,
          hora,
          notificado_whatsapp,
          created_at,
          estudiantes (
            id,
            nombres,
            apellidos,
            grado,
            seccion,
            codigo_estudiante,
            apoderado_nombre,
            apoderado_whatsapp,
            foto_url
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const incidencias = (data as unknown as IncidenciaDB[]) || []
      setTotalIncidencias(incidencias.length)

      // Agrupar incidencias por estudiante_id
      const mapaEstudiantes: Record<
        string,
        { estudiante: Estudiante; faltas: IncidenciaDB[] }
      > = {}

      incidencias.forEach((inc) => {
        const est = inc.estudiantes as Estudiante | null
        if (!est || !inc.estudiante_id) return

        if (!mapaEstudiantes[inc.estudiante_id]) {
          mapaEstudiantes[inc.estudiante_id] = {
            estudiante: est,
            faltas: [],
          }
        }
        mapaEstudiantes[inc.estudiante_id].faltas.push(inc)
      })

      // Contadores de distribución
      let conUna = 0
      const listaReincidentes: AlumnoReincidente[] = []

      Object.values(mapaEstudiantes).forEach(({ estudiante, faltas }) => {
        if (faltas.length === 1) {
          conUna++
        } else if (faltas.length >= 2) {
          // Determinar nivel de riesgo
          let nivelRiesgo: 'leve' | 'medio' | 'critico' = 'leve'
          if (faltas.length >= 4) nivelRiesgo = 'critico'
          else if (faltas.length === 3) nivelRiesgo = 'medio'

          listaReincidentes.push({
            estudiante,
            totalFaltas: faltas.length,
            faltas,
            ultimaFecha: faltas[0]?.fecha || 'Reciente',
            nivelRiesgo,
          })
        }
      })

      // Ordenar por mayor número de faltas primero
      listaReincidentes.sort((a, b) => b.totalFaltas - a.totalFaltas)

      setAlumnosConUnaFalta(conUna)
      setReincidentes(listaReincidentes)
    } catch (err) {
      console.error('[SeguimientoReincidencias] Error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    cargarReincidentes()
  }, [cargarReincidentes])

  // Generar texto formal de Citación para el apoderado
  const generarTextoCitacion = (item: AlumnoReincidente) => {
    const est = item.estudiante
    const apoderado = est.apoderado_nombre?.trim() || 'Padre / Madre de Familia'
    const nombreAlumno = `${est.apellidos}, ${est.nombres}`
    const codigo = est.codigo_estudiante || ''
    const gradoSec = `${est.grado} "${est.seccion}"`

    const listaFaltasTexto = item.faltas
      .map(
        (f, idx) =>
          `${idx + 1}. *${f.tipo_falta}* (${f.fecha} - ${f.hora})${
            f.descripcion ? ` — _${f.descripcion}_` : ''
          }`
      )
      .join('\n')

    return (
      `*I.E. JUAN PABLO VISCARDO Y GUZMÁN*\n` +
      `*CITACIÓN URGENTE POR REINCIDENCIA DE CONDUCTA — SIRECE*\n\n` +
      `Estimado(a) apoderado(a) *${apoderado}*:\n\n` +
      `Por medio del presente comunicado oficial de la I.E. Juan Pablo Viscardo y Guzmán, le informamos con carácter de urgencia que su menor hijo(a):\n` +
      `👤 *Estudiante:* ${nombreAlumno}\n` +
      `🏷️ *Código:* ${codigo}\n` +
      `📚 *Grado y Sección:* ${gradoSec}\n\n` +
      `Ha acumulado a la fecha un total de *${item.totalFaltas} FALTAS LEVES REITERADAS* en nuestra institución:\n\n` +
      `📋 *Historial de faltas registradas:*\n` +
      `${listaFaltasTexto}\n\n` +
      `⚠️ *MOTIVO DE CITACIÓN:*\n` +
      `En concordancia con las Normas de Convivencia Escolar y el Reglamento Interno, se le CITA con carácter obligatorio a la institución para el día de mañana a las *08:00 hrs* a fin de sostener una reunión con el Comité de Gestión del Bienestar y Auxiliaría, y proceder con la firma del *Acta de Compromiso Disciplinario* correspondiente.\n\n` +
      `Agradecemos su puntual asistencia y compromiso con la formación de su menor hijo(a).\n\n` +
      `*Atentamente,*\n` +
      `*Comité de Gestión del Bienestar y Convivencia Escolar*\n` +
      `I.E. Juan Pablo Viscardo y Guzmán — Arequipa`
    )
  }

  // Enviar citación oficial por Green-API
  const handleEnviarCitacion = async (item: AlumnoReincidente) => {
    const est = item.estudiante
    const apoderadoWa = est.apoderado_whatsapp?.trim() || ''
    const numLimpio = normalizarNumeroParaGreenApi(apoderadoWa)

    if (!numLimpio || !apoderadoWa) {
      showToast('⚠️ El estudiante no cuenta con un número de WhatsApp válido para su apoderado.')
      return
    }

    setEnviandoCitacion(true)
    const mensaje = generarTextoCitacion(item)

    const res = await enviarWhatsAppGreenApi(apoderadoWa, mensaje)

    if (res.success) {
      showToast(
        `✓ ¡Citación oficial despachada con éxito al apoderado (51${numLimpio.slice(-9)}) desde el WhatsApp institucional!`
      )
      setModalCitacionOpen(false)
    } else {
      const fallbackUrl = generarEnlaceWhatsApp(apoderadoWa, mensaje)
      if (fallbackUrl) {
        window.open(fallbackUrl, '_blank')
        showToast('⚠️ Green-API reportó un aviso. Se abrió la citación en WhatsApp Web como respaldo.')
      } else {
        showToast(`Error al enviar citación: ${res.error}`)
      }
    }
    setEnviandoCitacion(false)
  }

  return (
    <div className="space-y-6">
      {/* Toast informativo */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-xl text-xs shadow-lg animate-fade-in">
          <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* ── ENCABEZADO INSTITUCIONAL ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-700 mb-1">
            <RefreshCw size={15} className="text-red-600" />
            <span>Atención Preventiva y Formativa</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            Seguimiento de Estudiantes con Faltas Recurrentes
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Filtrado automático de alumnos que acumulan 2 o más faltas leves en la institución
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />}
            onClick={() => cargarReincidentes(true)}
            disabled={refreshing}
          >
            {refreshing ? 'Actualizando...' : 'Refrescar'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus size={15} />}
            onClick={() => navigate('/registrar-falta')}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold border-amber-400 shadow-xs"
          >
            Registrar Falta Leve
          </Button>
        </div>
      </div>

      {/* ── ESTADO ACTUAL DE REINCIDENCIAS ─────────────────────────────────── */}
      {loading ? (
        <Card className="py-16 text-center">
          <div className="flex flex-col items-center justify-center gap-3">
            <Spinner size="lg" />
            <p className="text-xs text-gray-500 font-medium">
              Analizando historial de incidencias en Supabase...
            </p>
          </div>
        </Card>
      ) : reincidentes.length === 0 ? (
        /* ── ESTADO VACÍO REAL (NINGÚN ESTUDIANTE TIENE 2 O MÁS FALTAS) ────────── */
        <Card className="p-8 text-center border-emerald-200 bg-gradient-to-b from-emerald-50/50 to-white">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4 shadow-xs">
            <ShieldCheck size={36} />
          </div>

          <h2 className="text-lg font-bold text-gray-900">
            Sin Casos de Reincidencia Registrados
          </h2>
          <p className="text-xs text-gray-600 max-w-md mx-auto mt-1 leading-relaxed">
            Actualmente ningún estudiante de la I.E. Juan Pablo Viscardo y Guzmán alcanza el umbral
            de reincidencia (2 o más faltas leves). La convivencia escolar se mantiene dentro de los
            márgenes adecuados.
          </p>

          <div className="bg-white border border-emerald-200 rounded-xl p-4 max-w-lg mx-auto my-6 text-xs text-gray-700 space-y-2 text-left shadow-2xs">
            <div className="flex justify-between border-b border-gray-100 pb-1.5">
              <span className="text-gray-500">Total de faltas analizadas en la institución:</span>
              <span className="font-bold text-gray-900">{totalIncidencias}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1.5">
              <span className="text-gray-500">Estudiantes con 1 sola falta (preventiva):</span>
              <span className="font-bold text-blue-700">{alumnosConUnaFalta}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Estudiantes con 2 o más faltas (reincidentes):</span>
              <span className="font-bold text-emerald-700">0 alumnos</span>
            </div>
          </div>

          <p className="text-[11px] text-gray-400 mb-6 italic">
            * Los estudiantes aparecerán aquí automáticamente en cuanto se registre una segunda falta leve en su ficha.
          </p>

          <div className="flex justify-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => navigate('/historial')}>
              Ver Historial de Incidencias
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus size={14} />}
              onClick={() => navigate('/registrar-falta')}
            >
              Registrar Falta Leve
            </Button>
          </div>
        </Card>
      ) : (
        /* ── LISTADO REAL DE ALUMNOS REINCIDENTES ────────────────────────────── */
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-500 px-1">
            <span>
              Mostrando <strong>{reincidentes.length}</strong> {reincidentes.length === 1 ? 'estudiante reincidente' : 'estudiantes reincidentes'}
            </span>
            <span className="text-[11px] bg-red-50 text-red-700 px-2.5 py-1 rounded-full border border-red-200 font-bold">
              Umbral: 2+ Faltas Leves
            </span>
          </div>

          {reincidentes.map((item) => {
            const est = item.estudiante
            const tieneWa = Boolean(
              est.apoderado_whatsapp && normalizarNumeroParaGreenApi(est.apoderado_whatsapp)
            )

            return (
              <Card
                key={est.id}
                className="p-5 border-gray-200 hover:border-red-200 hover:shadow-sm transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Ficha del alumno */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-12 h-12 rounded-xl text-white font-bold text-lg flex items-center justify-center flex-shrink-0 shadow-xs ${
                        item.nivelRiesgo === 'critico'
                          ? 'bg-red-600'
                          : item.nivelRiesgo === 'medio'
                          ? 'bg-amber-600'
                          : 'bg-yellow-500'
                      }`}
                    >
                      {item.totalFaltas}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm text-gray-900">
                          {est.apellidos}, {est.nombres}
                        </h3>
                        {est.codigo_estudiante && (
                          <span className="font-mono font-bold text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded border border-purple-300">
                            {est.codigo_estudiante}
                          </span>
                        )}
                        <span className="text-xs text-gray-600 font-medium">
                          {est.grado} &ldquo;{est.seccion}&rdquo;
                        </span>
                      </div>

                      <p className="text-xs text-gray-500 mt-0.5">
                        Apoderado:{' '}
                        <strong>{est.apoderado_nombre || 'Sin registrar'}</strong>
                        {est.apoderado_whatsapp && (
                          <span className="ml-1 text-gray-400">
                            ({formatearWhatsApp(est.apoderado_whatsapp)})
                          </span>
                        )}
                      </p>

                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge
                          variant={
                            item.nivelRiesgo === 'critico'
                              ? 'danger'
                              : item.nivelRiesgo === 'medio'
                              ? 'warning'
                              : 'warning'
                          }
                          size="sm"
                        >
                          {item.nivelRiesgo === 'critico'
                            ? 'Nivel 3 · Reincidencia Crítica (Derivación)'
                            : item.nivelRiesgo === 'medio'
                            ? 'Nivel 2 · Reincidencia Media (Citación)'
                            : 'Nivel 1 · Reincidencia Inicial (Alerta)'}
                        </Badge>
                        <span className="text-[11px] text-gray-400">
                          Última falta: {item.ultimaFecha}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones para el estudiante */}
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Send size={14} />}
                      onClick={() => {
                        setAlumnoSeleccionado(item)
                        setModalCitacionOpen(true)
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs"
                      disabled={!tieneWa}
                    >
                      Citar por WhatsApp Oficial
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<FileText size={14} />}
                      onClick={() => {
                        setAlumnoSeleccionado(item)
                        setModalActaOpen(true)
                      }}
                    >
                      Acta de Compromiso
                    </Button>
                  </div>
                </div>

                {/* Barra de progreso de faltas acumuladas (límite 5) */}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                    <span>Acumulación de faltas leves</span>
                    <span className="font-bold text-gray-800">
                      {item.totalFaltas} de 5 faltas máximas (antes de derivación formal a Dirección)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.totalFaltas >= 4
                          ? 'bg-red-600'
                          : item.totalFaltas >= 3
                          ? 'bg-amber-500'
                          : 'bg-yellow-400'
                      }`}
                      style={{ width: `${Math.min((item.totalFaltas / 5) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Detalle de todas las faltas leves del alumno */}
                <div className="mt-3 bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2">
                  <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                    Historial de Faltas Acumuladas ({item.faltas.length}):
                  </p>
                  <div className="divide-y divide-gray-200/60">
                    {item.faltas.map((f, idx) => (
                      <div
                        key={f.id}
                        className="py-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-gray-900">{f.tipo_falta}</span>
                        </div>
                        <div className="flex items-center gap-2 sm:justify-end text-gray-500 text-[11px]">
                          <span>
                            {f.fecha} ({f.hora})
                          </span>
                          {f.notificado_whatsapp ? (
                            <span className="text-emerald-700 font-medium">✓ Notificado WA</span>
                          ) : (
                            <span className="text-amber-700">Pendiente WA</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── MODAL 1: CITACIÓN INSTITUCIONAL POR WHATSAPP GREEN-API ───────────── */}
      {alumnoSeleccionado && modalCitacionOpen && (
        <Modal
          open={modalCitacionOpen}
          onClose={() => setModalCitacionOpen(false)}
          title="Citación Oficial al Apoderado por Reincidencia"
          description="Envío automático en segundo plano desde el WhatsApp oficial de la I.E. Juan Pablo Viscardo y Guzmán."
          size="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-blue-900">
              <div>
                <p className="font-bold">
                  {alumnoSeleccionado.estudiante.apellidos}, {alumnoSeleccionado.estudiante.nombres}
                </p>
                <p className="text-[11px] text-blue-700">
                  Código: {alumnoSeleccionado.estudiante.codigo_estudiante} · {alumnoSeleccionado.estudiante.grado} &ldquo;{alumnoSeleccionado.estudiante.seccion}&rdquo;
                </p>
              </div>
              <div className="text-right">
                <span className="font-bold text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded text-[11px]">
                  {alumnoSeleccionado.totalFaltas} Faltas Leves
                </span>
              </div>
            </div>

            <div>
              <p className="font-semibold text-gray-700 mb-1">
                Texto del comunicado de citación formal:
              </p>
              <div className="bg-gray-100 p-3.5 rounded-xl font-mono text-[11px] whitespace-pre-wrap text-gray-800 border border-gray-200 max-h-64 overflow-y-auto">
                {generarTextoCitacion(alumnoSeleccionado)}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-3 border-t">
              <span className="text-[11px] text-gray-500">
                Canal Remitente: <strong>{WHATSAPP_OFICIAL_NUMERO}</strong>
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  loading={enviandoCitacion}
                  leftIcon={<Send size={14} />}
                  onClick={() => handleEnviarCitacion(alumnoSeleccionado)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Enviar Citación Automática
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setModalCitacionOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL 2: ACTA FORMAL DE COMPROMISO DISCIPLINARIO ─────────────────── */}
      {alumnoSeleccionado && modalActaOpen && (
        <Modal
          open={modalActaOpen}
          onClose={() => setModalActaOpen(false)}
          title="Acta de Compromiso del Padre de Familia y Estudiante"
          description="Documento institucional de compromiso correctivo para la convivencia escolar."
          size="lg"
        >
          <div className="space-y-4 text-xs">
            {/* Contenedor imprimible */}
            <div
              id="acta-imprimible"
              className="p-6 bg-white border border-gray-300 rounded-xl space-y-4 text-gray-900 font-serif leading-relaxed"
            >
              {/* Encabezado oficial */}
              <div className="text-center border-b pb-3 space-y-0.5">
                <h3 className="font-bold text-sm tracking-wide uppercase">
                  I.E. Juan Pablo Viscardo y Guzmán
                </h3>
                <p className="text-[11px] text-gray-600 uppercase font-sans">
                  Comité de Gestión del Bienestar y Convivencia Escolar — Arequipa
                </p>
                <h4 className="font-bold text-xs uppercase pt-2 underline">
                  ACTA DE COMPROMISO DISCIPLINARIO Y FORMATIVO N° {alumnoSeleccionado.estudiante.codigo_estudiante || '001'}-2026
                </h4>
              </div>

              {/* Cuerpo del acta */}
              <p className="text-[11px] text-justify font-sans">
                En la ciudad de Arequipa, en las instalaciones de la Institución Educativa <strong>Juan Pablo Viscardo y Guzmán</strong>, se reúnen el/la representante de la institución, el/la estudiante <strong>{alumnoSeleccionado.estudiante.apellidos}, {alumnoSeleccionado.estudiante.nombres}</strong> de <strong>{alumnoSeleccionado.estudiante.grado} &ldquo;{alumnoSeleccionado.estudiante.seccion}&rdquo;</strong> (Código: <strong>{alumnoSeleccionado.estudiante.codigo_estudiante}</strong>), y su apoderado(a) <strong>{alumnoSeleccionado.estudiante.apoderado_nombre || '________________________________________________'}</strong>, con DNI N° ____________________.
              </p>

              <div className="bg-gray-50 p-2.5 rounded border border-gray-200 text-[10px] font-sans space-y-1">
                <p className="font-bold text-gray-800">
                  MOTIVO: Acumulación de {alumnoSeleccionado.totalFaltas} Faltas Leves registradas en SIRECE:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-gray-700">
                  {alumnoSeleccionado.faltas.map((f) => (
                    <li key={f.id}>
                      {f.tipo_falta} ({f.fecha}) {f.descripcion ? `— ${f.descripcion}` : ''}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1.5 text-[10px] font-sans text-justify">
                <p className="font-bold text-gray-800">ACUERDOS Y COMPROMISOS ASUMIDOS:</p>
                <p>
                  1. <strong>EL ESTUDIANTE</strong> se compromete a respetar cabalmente las Normas de Convivencia Escolar, ingresar puntualmente a clases, presentarse con el uniforme escolar institucional y mantener un trato respetuoso hacia docentes, auxiliares y compañeros.
                </p>
                <p>
                  2. <strong>EL APODERADO</strong> se compromete a realizar el seguimiento diario y dialogar con su menor hijo(a), garantizando su puntualidad y presentación personal desde el hogar, así como acudir a las citaciones que formule el colegio.
                </p>
                <p>
                  3. Se deja constancia de que la reincidencia en faltas posteriores dará lugar a las medidas correctivas de acuerdo a la R.M. N° 005-2021-MINEDU y el Reglamento Interno Institucional.
                </p>
              </div>

              {/* Firmas */}
              <div className="grid grid-cols-3 gap-4 pt-10 text-center font-sans text-[10px]">
                <div className="border-t border-gray-400 pt-1">
                  <p className="font-bold">Firma del Apoderado</p>
                  <p className="text-gray-500">DNI: _________________</p>
                </div>
                <div className="border-t border-gray-400 pt-1">
                  <p className="font-bold">Firma del Estudiante</p>
                  <p className="text-gray-500">{alumnoSeleccionado.estudiante.codigo_estudiante}</p>
                </div>
                <div className="border-t border-gray-400 pt-1">
                  <p className="font-bold">Auxiliar / Comité Bienestar</p>
                  <p className="text-gray-500">I.E. Juan Pablo Viscardo y G.</p>
                </div>
              </div>
            </div>

            {/* Acciones del modal */}
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-[11px] text-gray-500">
                Documento listo para firmar e ingresar al legajo personal del alumno.
              </span>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Printer size={14} />}
                  onClick={() => window.print()}
                >
                  Imprimir Acta
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setModalActaOpen(false)}
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
