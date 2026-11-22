import { useState, useEffect, useCallback } from 'react'
import {
  Building2,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, StatCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { type Estudiante, type IncidenciaDB } from '@/types'

interface SeccionResumen {
  salon: string
  grado: string
  seccion: string
  tutor: string
  estudiantes: number
  faltas: number
  reincidentes: number
  tasa: string
  tendencia: 'alta' | 'estable' | 'baja'
}

const tendenciaVariant = (t: string) =>
  t === 'alta' ? 'danger' : t === 'estable' ? 'warning' : 'success'
const tendenciaLabel = (t: string) =>
  t === 'alta' ? '▲ Alta' : t === 'estable' ? '→ Estable' : '▼ Baja'

export default function SeguimientoInstitucional() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Datos reales desde Supabase
  const [secciones, setSecciones] = useState<SeccionResumen[]>([])
  const [totalFaltasMes, setTotalFaltasMes] = useState(0)
  const [totalReincidentes, setTotalReincidentes] = useState(0)
  const [seccionMasFaltas, setSeccionMasFaltas] = useState<string>('Ninguna')
  const [totalEstudiantes, setTotalEstudiantes] = useState(0)

  const cargarDatos = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      if (!isSupabaseConfigured()) {
        setLoading(false)
        setRefreshing(false)
        return
      }

      // 1. Obtener estudiantes reales
      const { data: dEst, error: errEst } = await supabase
        .from('estudiantes')
        .select('*')
      if (errEst) throw errEst

      const estudiantes = (dEst as Estudiante[]) || []
      setTotalEstudiantes(estudiantes.length)

      // 2. Obtener incidencias reales con datos de estudiante
      const { data: dInc, error: errInc } = await supabase
        .from('incidencias')
        .select(`
          id,
          estudiante_id,
          tipo_falta,
          fecha,
          notificado_whatsapp,
          estudiantes (
            id,
            grado,
            seccion
          )
        `)
      if (errInc) throw errInc

      const incidencias = (dInc as unknown as IncidenciaDB[]) || []

      // ─── CÁLCULO DE KPIS REALES ──────────────────────────────────────────────
      // Faltas del mes actual (YYYY-MM)
      const mesActual = new Date().toISOString().slice(0, 7) // ej "2026-11"
      const faltasMes = incidencias.filter(
        (i) => i.fecha && i.fecha.startsWith(mesActual)
      ).length
      setTotalFaltasMes(faltasMes > 0 ? faltasMes : incidencias.length)

      // Reincidentes globales (2 o más faltas)
      const faltasPorAlumno: Record<string, number> = {}
      incidencias.forEach((i) => {
        if (i.estudiante_id) {
          faltasPorAlumno[i.estudiante_id] = (faltasPorAlumno[i.estudiante_id] || 0) + 1
        }
      })
      const reincidentesGlobales = Object.values(faltasPorAlumno).filter((c) => c >= 2).length
      setTotalReincidentes(reincidentesGlobales)

      // ─── CONSTRUCCIÓN DE SECCIONES REALES ────────────────────────────────────
      // Extraer salones únicos presentes en la tabla estudiantes
      const salonesMap: Record<string, { grado: string; seccion: string }> = {}
      estudiantes.forEach((e) => {
        if (e.grado && e.seccion) {
          const key = `${e.grado}_${e.seccion}`
          salonesMap[key] = { grado: e.grado, seccion: e.seccion }
        }
      })

      // Ordenar grados ('1ro' a '5to') y secciones ('A' a 'E')
      const ordenGrado: Record<string, number> = { '1ro': 1, '2do': 2, '3ro': 3, '4to': 4, '5to': 5 }
      const salonesOrdenados = Object.values(salonesMap).sort((a, b) => {
        const gA = ordenGrado[a.grado] || 99
        const gB = ordenGrado[b.grado] || 99
        if (gA !== gB) return gA - gB
        return a.seccion.localeCompare(b.seccion)
      })

      // Calcular métricas para cada salón
      let maxFaltas = -1
      let nombreMaxSalon = 'Ninguna'

      const resumenFilas: SeccionResumen[] = salonesOrdenados.map((s) => {
        const salonNombre = `${s.grado} "${s.seccion}"`

        // Alumnos de este salón
        const alumnosSalon = estudiantes.filter(
          (e) => e.grado === s.grado && e.seccion === s.seccion
        )
        const alumnosIds = new Set(alumnosSalon.map((e) => e.id))

        // Faltas de este salón
        const faltasSalon = incidencias.filter((i) => {
          const est = i.estudiantes as Estudiante | null
          return (
            alumnosIds.has(i.estudiante_id) ||
            (est?.grado === s.grado && est?.seccion === s.seccion)
          )
        }).length

        // Alumnos reincidentes de este salón (>= 2 faltas)
        let reincSalon = 0
        alumnosSalon.forEach((e) => {
          if ((faltasPorAlumno[e.id] || 0) >= 2) {
            reincSalon++
          }
        })

        // Tasa de faltas por alumno
        const tasaNum = alumnosSalon.length > 0 ? (faltasSalon / alumnosSalon.length) * 100 : 0
        const tasaStr = tasaNum.toFixed(1)

        // Tendencia real
        let tendencia: 'alta' | 'estable' | 'baja' = 'baja'
        if (faltasSalon >= 5 || tasaNum >= 25) {
          tendencia = 'alta'
        } else if (faltasSalon >= 2 || tasaNum >= 10) {
          tendencia = 'estable'
        }

        // Buscar tutor asignado en tabla personal (si existiera columna o asignación formal)
        // Como no hay asignación fija de tutor por sección en personal, mostrar "Sin tutor asignado"
        const tutor = 'Sin tutor asignado'

        if (faltasSalon > maxFaltas && faltasSalon > 0) {
          maxFaltas = faltasSalon
          nombreMaxSalon = salonNombre
        }

        return {
          salon: salonNombre,
          grado: s.grado,
          seccion: s.seccion,
          tutor,
          estudiantes: alumnosSalon.length,
          faltas: faltasSalon,
          reincidentes: reincSalon,
          tasa: tasaStr,
          tendencia,
        }
      })

      setSecciones(resumenFilas)
      setSeccionMasFaltas(maxFaltas > 0 ? nombreMaxSalon : 'Ninguna')
    } catch (err) {
      console.error('[SeguimientoInstitucional] Error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  return (
    <div className="space-y-6">
      {/* ── ENCABEZADO INSTITUCIONAL ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-900 mb-1">
            <ShieldCheck size={16} className="text-blue-700" />
            <span>Gestión del Clima Escolar y Convivencia</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            Seguimiento Institucional por Grado y Sección
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Monitoreo real del comportamiento escolar en la I.E. Juan Pablo Viscardo y Guzmán
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />}
            onClick={() => cargarDatos(true)}
            disabled={refreshing}
          >
            {refreshing ? 'Actualizando...' : 'Refrescar Datos'}
          </Button>
        </div>
      </div>

      {/* ── KPIS INSTITUCIONALES (DATOS REALES SUPABASE) ────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Faltas registradas (Mes actual)"
          value={loading ? '—' : totalFaltasMes}
          icon={<TrendingDown size={20} />}
          color="yellow"
        />
        <StatCard
          label="Estudiantes reincidentes activos"
          value={loading ? '—' : totalReincidentes}
          icon={<AlertTriangle size={20} />}
          color="red"
        />
        <StatCard
          label="Sección con más faltas"
          value={loading ? '—' : seccionMasFaltas}
          icon={<Building2 size={20} />}
          color="blue"
        />
      </div>

      {/* ── TABLA INSTITUCIONAL POR SECCIÓN REAL ────────────────────────────── */}
      <Card>
        <CardHeader className="border-b pb-3 mb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
              <Building2 size={18} className="text-[#1e3a5f]" />
              Vista Institucional por Sección
            </CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              Datos consolidados en vivo a partir de las matrículas e incidencias registradas
            </p>
          </div>
          <span className="text-xs font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
            {totalEstudiantes} estudiantes en {secciones.length} {secciones.length === 1 ? 'sección' : 'secciones'}
          </span>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-14 flex justify-center items-center gap-2">
              <Spinner size="md" />
              <span className="text-xs text-gray-500">Calculando indicadores escolares...</span>
            </div>
          ) : secciones.length === 0 ? (
            <div className="text-center py-12 text-gray-500 space-y-2">
              <GraduationCap size={36} className="mx-auto text-gray-300" />
              <p className="text-sm font-semibold text-gray-700">
                Aún no hay estudiantes ni incidencias registradas
              </p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Registra o importa estudiantes desde Excel para visualizar automáticamente el
                seguimiento por sección.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-2xs">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#1e3a5f] text-white text-[11px]">
                    <th className="px-4 py-3 text-left font-bold uppercase tracking-wider rounded-tl-xl">
                      Sección
                    </th>
                    <th className="px-4 py-3 text-left font-bold uppercase tracking-wider">
                      Tutor Responsable
                    </th>
                    <th className="px-4 py-3 text-center font-bold uppercase tracking-wider">
                      Estudiantes
                    </th>
                    <th className="px-4 py-3 text-center font-bold uppercase tracking-wider">
                      Faltas
                    </th>
                    <th className="px-4 py-3 text-center font-bold uppercase tracking-wider">
                      Reincidentes (2+)
                    </th>
                    <th className="px-4 py-3 text-center font-bold uppercase tracking-wider">
                      Tasa Faltas
                    </th>
                    <th className="px-4 py-3 text-center font-bold uppercase tracking-wider rounded-tr-xl">
                      Tendencia
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {secciones.map((g, i) => (
                    <tr
                      key={g.salon}
                      className={`hover:bg-blue-50/60 transition-colors ${
                        i % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'
                      }`}
                    >
                      {/* Salón */}
                      <td className="px-4 py-3 font-bold text-[#1e3a5f] text-sm">
                        {g.salon}
                      </td>

                      {/* Tutor */}
                      <td className="px-4 py-3 text-gray-500 italic">
                        {g.tutor}
                      </td>

                      {/* Cantidad de estudiantes */}
                      <td className="px-4 py-3 text-center font-semibold text-gray-800">
                        {g.estudiantes}
                      </td>

                      {/* Cantidad de faltas */}
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                            g.faltas >= 5
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : g.faltas >= 2
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : g.faltas > 0
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'text-gray-400'
                          }`}
                        >
                          {g.faltas}
                        </span>
                      </td>

                      {/* Cantidad de reincidentes */}
                      <td className="px-4 py-3 text-center">
                        {g.reincidentes > 0 ? (
                          <span className="font-mono font-bold px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-300">
                            {g.reincidentes}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Tasa porcentual */}
                      <td className="px-4 py-3 text-center font-mono text-gray-600">
                        {g.tasa}%
                      </td>

                      {/* Tendencia */}
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={tendenciaVariant(g.tendencia) as 'danger' | 'warning' | 'success'}
                          size="sm"
                        >
                          {tendenciaLabel(g.tendencia)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
