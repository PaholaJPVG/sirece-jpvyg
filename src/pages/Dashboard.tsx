import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GraduationCap,
  AlertTriangle,
  MessageSquare,
  RefreshCw,
  TrendingUp,
  Clock,
  ArrowRight,
  ShieldCheck,
  User,
  Plus,
  Calendar,
  FileSpreadsheet,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { useAppConfig } from '@/context/AppConfigContext'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { WHATSAPP_OFICIAL_NUMERO } from '@/lib/greenApiService'
import { type Estudiante, type IncidenciaDB } from '@/types'

// ─── Etiquetas y colores para las 5 Faltas Leves Oficiales ─────────────────────
const CONFIG_FALTAS = [
  {
    keys: ['tardanza'],
    short: 'Tardanza',
    color: 'bg-amber-500',
    barBg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  {
    keys: ['inasistencia'],
    short: 'Inasistencia',
    color: 'bg-red-500',
    barBg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-200',
  },
  {
    keys: ['sin uniforme', 'uniforme'],
    short: 'Sin uniforme',
    color: 'bg-blue-600',
    barBg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  {
    keys: ['presentación personal', 'presentacion', 'aseo', 'corte y peinados', 'maquillaje', 'piercings'],
    short: 'Presentación personal',
    color: 'bg-purple-600',
    barBg: 'bg-purple-100',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
  {
    keys: ['celular', 'dispositivos', 'interrupción', 'interrupcion'],
    short: 'Uso de celular s/autorización',
    color: 'bg-indigo-600',
    barBg: 'bg-indigo-100',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
  },
]

// ─── Accesos Rápidos Institucionales ──────────────────────────────────────────
const ACCESOS_RAPIDOS = [
  {
    label: 'Registrar Falta Leve',
    desc: 'Búsqueda por código y notificación WhatsApp',
    icon: <AlertTriangle size={18} />,
    path: '/registrar-falta',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
  },
  {
    label: 'Historial de Incidencias',
    desc: 'Registro cronológico y reenvío de comunicados',
    icon: <Clock size={18} />,
    path: '/historial',
    color: 'text-blue-700 bg-blue-50 border-blue-200',
  },
  {
    label: 'Gestión de Estudiantes',
    desc: 'Directorio escolar y WhatsApp de apoderados',
    icon: <GraduationCap size={18} />,
    path: '/estudiantes',
    color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  },
  {
    label: 'Importar desde Excel',
    desc: 'Carga masiva de salones y generación de códigos',
    icon: <FileSpreadsheet size={18} />,
    path: '/importar',
    color: 'text-green-700 bg-green-50 border-green-200',
  },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { config } = useAppConfig()
  const conectado = isSupabaseConfigured()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Datos reales desde Supabase
  const [totalEstudiantes, setTotalEstudiantes] = useState(0)
  const [totalPersonal, setTotalPersonal] = useState(0)
  const [incidencias, setIncidencias] = useState<IncidenciaDB[]>([])

  // Carga de datos unificada
  const cargarDatos = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      if (!isSupabaseConfigured()) {
        setLoading(false)
        setRefreshing(false)
        return
      }

      // 1. Total estudiantes
      const { count: cEst, data: dEst } = await supabase
        .from('estudiantes')
        .select('id', { count: 'exact' })
      setTotalEstudiantes(cEst || (dEst ? dEst.length : 0))

      // 2. Total personal
      const { count: cPer, data: dPer } = await supabase
        .from('personal')
        .select('id', { count: 'exact' })
        .eq('activo', true)
      setTotalPersonal(cPer || (dPer ? dPer.length : 0))

      // 3. Incidencias con datos del estudiante
      const { data: dInc } = await supabase
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
            apoderado_whatsapp,
            foto_url
          )
        `)
        .order('created_at', { ascending: false })

      setIncidencias((dInc as unknown as IncidenciaDB[]) || [])
    } catch (err) {
      console.error('[Dashboard] Error cargando métricas en tiempo real:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  // ─── CÁLCULO DE KPIS EN TIEMPO REAL ──────────────────────────────────────────
  const hoyStr = new Date().toISOString().split('T')[0]
  const totalIncidencias = incidencias.length
  const incidenciasHoy = incidencias.filter((i) => i.fecha === hoyStr).length

  // WhatsApp
  const notificadosWa = incidencias.filter((i) => i.notificado_whatsapp).length
  const porcentajeWa =
    totalIncidencias > 0 ? Math.round((notificadosWa / totalIncidencias) * 100) : 0

  // Reincidencias (estudiantes con 2 o más faltas)
  const incidenciasPorAlumno: Record<string, number> = {}
  incidencias.forEach((i) => {
    if (i.estudiante_id) {
      incidenciasPorAlumno[i.estudiante_id] = (incidenciasPorAlumno[i.estudiante_id] || 0) + 1
    }
  })
  const recurrentesCount = Object.values(incidenciasPorAlumno).filter((c) => c >= 2).length

  // ─── DISTRIBUCIÓN DE LAS 5 FALTAS LEVES ──────────────────────────────────────
  const distribucionFaltas = CONFIG_FALTAS.map((cfg) => {
    const cantidad = incidencias.filter((i) => {
      const tipo = i.tipo_falta.toLowerCase()
      return cfg.keys.some((k) => tipo.includes(k))
    }).length
    const porcentaje = totalIncidencias > 0 ? Math.round((cantidad / totalIncidencias) * 100) : 0
    return {
      ...cfg,
      cantidad,
      porcentaje,
    }
  })

  // ─── DISTRIBUCIÓN POR GRADO (1ro a 5to) ───────────────────────────────────────
  const GRADOS = ['1ro', '2do', '3ro', '4to', '5to']
  const incidenciasPorGrado = GRADOS.map((gr) => {
    const cantidad = incidencias.filter((i) => {
      const est = i.estudiantes as Estudiante | null
      return est?.grado === gr
    }).length
    const porcentaje = totalIncidencias > 0 ? Math.round((cantidad / totalIncidencias) * 100) : 0
    return { grado: gr, cantidad, porcentaje }
  })

  // ─── RANKING POR SECCIÓN (TOP SECCIONES CON MÁS INCIDENCIAS) ─────────────────
  const seccionMap: Record<string, number> = {}
  incidencias.forEach((i) => {
    const est = i.estudiantes as Estudiante | null
    if (est?.grado && est?.seccion) {
      const salon = `${est.grado} "${est.seccion}"`
      seccionMap[salon] = (seccionMap[salon] || 0) + 1
    }
  })
  const rankingSecciones = Object.entries(seccionMap)
    .map(([salon, count]) => ({ salon, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // ─── ÚLTIMAS 5 INCIDENCIAS REGISTRADAS ───────────────────────────────────────
  const ultimasIncidencias = incidencias.slice(0, 5)

  return (
    <div className="space-y-6">
      {/* ── BANNER INSTITUCIONAL DE BIENVENIDA ─────────────────────────────────── */}
      <Card
        className="bg-gradient-to-r from-[#0f1e30] via-[#1e3a5f] to-[#2563a0] border-0 text-white shadow-md relative overflow-hidden"
        padding="lg"
      >
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <GraduationCap size={220} />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-medium mb-2 backdrop-blur-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Panel de Control en Tiempo Real
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {config.institucion}
            </h1>
            <p className="text-blue-100 text-sm mt-0.5 font-normal">
              Sistema de Registro y Comunicación de Incidencias Estudiantiles (SIRECE)
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-blue-200 mt-2">
              <span className="flex items-center gap-1">
                <Calendar size={13} /> Año Académico {config.anioAcademico}
              </span>
              <span>•</span>
              <span>Periodo: {config.periodo}</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-300">
                <ShieldCheck size={13} /> WhatsApp Oficial: {WHATSAPP_OFICIAL_NUMERO}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />}
              onClick={() => cargarDatos(true)}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 shadow-xs"
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
      </Card>

      {/* ── TARJETAS SUPERIORES DE RESUMEN (KPIS) ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Estudiantes */}
        <Card className="bg-gradient-to-br from-blue-50/80 to-blue-50/20 border-blue-200 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-800">
                Estudiantes Matriculados
              </p>
              <div className="flex items-baseline gap-2 mt-1.5">
                <p className="text-3xl font-extrabold text-[#1e3a5f]">
                  {loading ? <Spinner size="sm" /> : totalEstudiantes}
                </p>
                <span className="text-xs text-blue-600 font-medium">alumnos</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">1ro a 5to de Secundaria</p>
            </div>
            <div className="p-3 bg-[#1e3a5f] text-white rounded-xl shadow-xs">
              <GraduationCap size={22} />
            </div>
          </div>
        </Card>

        {/* KPI 2: Incidencias Registradas */}
        <Card className="bg-gradient-to-br from-amber-50/80 to-amber-50/20 border-amber-200 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Faltas Registradas
              </p>
              <div className="flex items-baseline gap-2 mt-1.5">
                <p className="text-3xl font-extrabold text-amber-700">
                  {loading ? <Spinner size="sm" /> : totalIncidencias}
                </p>
                <span className="text-xs text-amber-600 font-medium">total acumulado</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
                  {incidenciasHoy} hoy
                </span>
                <span className="text-[11px] text-gray-500">en la jornada</span>
              </div>
            </div>
            <div className="p-3 bg-amber-500 text-slate-950 rounded-xl shadow-xs">
              <AlertTriangle size={22} />
            </div>
          </div>
        </Card>

        {/* KPI 3: Notificaciones WhatsApp */}
        <Card className="bg-gradient-to-br from-emerald-50/80 to-emerald-50/20 border-emerald-200 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Comunicados WhatsApp
              </p>
              <div className="flex items-baseline gap-2 mt-1.5">
                <p className="text-3xl font-extrabold text-emerald-700">
                  {loading ? <Spinner size="sm" /> : notificadosWa}
                </p>
                <span className="text-xs text-emerald-700 font-bold">
                  ({porcentajeWa}% efectividad)
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                {notificadosWa} de {totalIncidencias} enviados a apoderados
              </p>
            </div>
            <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-xs">
              <MessageSquare size={22} />
            </div>
          </div>
        </Card>

        {/* KPI 4: Reincidencias Recurrentes */}
        <Card className="bg-gradient-to-br from-rose-50/80 to-rose-50/20 border-rose-200 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-rose-800">
                Alumnos Reincidentes
              </p>
              <div className="flex items-baseline gap-2 mt-1.5">
                <p className="text-3xl font-extrabold text-rose-700">
                  {loading ? <Spinner size="sm" /> : recurrentesCount}
                </p>
                <span className="text-xs text-rose-600 font-medium">con 2+ faltas</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Requieren atención formativa</p>
            </div>
            <div className="p-3 bg-rose-600 text-white rounded-xl shadow-xs">
              <RefreshCw size={22} />
            </div>
          </div>
        </Card>
      </div>

      {/* ── CUERPO PRINCIPAL: GRÁFICOS Y ANÁLISIS ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUMNA IZQUIERDA (2 COLS): DISTRIBUCIÓN DE FALTAS Y RANKINGS */}
        <div className="lg:col-span-2 space-y-6">
          {/* GRÁFICO 1: DISTRIBUCIÓN DE LAS 5 FALTAS LEVES OFICIALES */}
          <Card>
            <CardHeader className="border-b pb-3 mb-4">
              <div>
                <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <TrendingUp size={18} className="text-[#1e3a5f]" />
                  Distribución de las 5 Faltas Leves Oficiales
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Frecuencia y proporción de incidencias registradas en la institución
                </p>
              </div>
              <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                Total: {totalIncidencias}
              </span>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-12 flex justify-center">
                  <Spinner size="md" />
                </div>
              ) : totalIncidencias === 0 ? (
                <div className="text-center py-10 text-gray-400 text-xs">
                  Aún no hay faltas leves registradas en el sistema.
                </div>
              ) : (
                <div className="space-y-4">
                  {distribucionFaltas.map((falta) => (
                    <div key={falta.short} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${falta.color}`} />
                          <span className="font-semibold text-gray-800">{falta.short}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-gray-900">
                            {falta.cantidad}{' '}
                            <span className="text-gray-400 font-normal">
                              ({falta.porcentaje}%)
                            </span>
                          </span>
                        </div>
                      </div>
                      {/* Barra de progreso */}
                      <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${falta.color} rounded-full transition-all duration-700 ease-out`}
                          style={{ width: `${Math.max(falta.porcentaje, falta.cantidad > 0 ? 4 : 0)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* GRÁFICO 2: INCIDENCIAS POR GRADO Y SECCIÓN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Desglose por Grado */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-gray-900">
                  Incidencias por Grado
                </CardTitle>
                <span className="text-xs text-gray-400">1ro a 5to</span>
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                {incidenciasPorGrado.map((item) => (
                  <div key={item.grado} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-gray-700">{item.grado} Secundaria</span>
                      <span className="font-bold text-gray-900">
                        {item.cantidad} <span className="text-gray-400 text-[10px]">({item.porcentaje}%)</span>
                      </span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1e3a5f] rounded-full transition-all duration-500"
                        style={{ width: `${item.porcentaje}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Ranking de Salones con más Incidencias */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-gray-900">
                  Top Secciones con Incidencias
                </CardTitle>
                <span className="text-xs text-gray-400">Mayor recurrencia</span>
              </CardHeader>
              <CardContent className="pt-2">
                {rankingSecciones.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">
                    Sin registros suficientes
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {rankingSecciones.map((sec, idx) => (
                      <div
                        key={sec.salon}
                        className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                              idx === 0
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-gray-800">{sec.salon}</span>
                        </div>
                        <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {sec.count} {sec.count === 1 ? 'falta' : 'faltas'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* TABLA: ÚLTIMAS 5 INCIDENCIAS REGISTRADAS */}
          <Card padding="none">
            <CardHeader className="px-5 pt-4 pb-3 border-b flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-gray-900">
                  Últimas 5 Incidencias Registradas
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Monitoreo en vivo de los comunicados escolares
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                rightIcon={<ArrowRight size={13} />}
                onClick={() => navigate('/historial')}
                className="text-blue-700 text-xs"
              >
                Ver todas ({totalIncidencias})
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-10 flex justify-center">
                  <Spinner size="md" />
                </div>
              ) : ultimasIncidencias.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-xs">
                  No hay incidencias registradas en la institución.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {ultimasIncidencias.map((inc) => {
                    const est = inc.estudiantes as Estudiante | null
                    return (
                      <div
                        key={inc.id}
                        className="p-4 hover:bg-gray-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        {/* Datos del estudiante */}
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
                            {est ? `${est.nombres[0] || ''}${est.apellidos[0] || ''}` : <User size={14} />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-gray-900 truncate">
                                {est ? `${est.apellidos}, ${est.nombres}` : 'Estudiante no registrado'}
                              </span>
                              {est?.codigo_estudiante && (
                                <span className="font-mono font-bold text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200">
                                  {est.codigo_estudiante}
                                </span>
                              )}
                              {est && (
                                <span className="text-gray-500 font-medium">
                                  {est.grado} &ldquo;{est.seccion}&rdquo;
                                </span>
                              )}
                            </div>
                            <p className="text-gray-700 font-medium mt-0.5 truncate max-w-md">
                              {inc.tipo_falta}
                            </p>
                            <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                              <Clock size={11} /> {inc.fecha} a las {inc.hora}
                            </p>
                          </div>
                        </div>

                        {/* Estado WhatsApp */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 flex-shrink-0">
                          {inc.notificado_whatsapp ? (
                            <Badge variant="success" size="sm" className="font-semibold">
                              ✓ Notificado WA
                            </Badge>
                          ) : est?.apoderado_whatsapp ? (
                            <Badge variant="warning" size="sm">
                              Pendiente WA
                            </Badge>
                          ) : (
                            <Badge variant="default" size="sm">
                              Sin WhatsApp
                            </Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* COLUMNA DERECHA (1 COL): ACCESOS Y ESTADO DEL SISTEMA */}
        <div className="space-y-6">
          {/* ACCESOS RÁPIDOS */}
          <Card>
            <CardHeader className="border-b pb-3 mb-2">
              <CardTitle className="text-sm font-bold text-gray-900">
                Accesos Directos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-1">
              {ACCESOS_RAPIDOS.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all text-left group"
                >
                  <span className={`p-2 rounded-lg border ${item.color} flex-shrink-0 group-hover:scale-105 transition-transform`}>
                    {item.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-800 group-hover:text-blue-700 transition-colors">
                      {item.label}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                  <ArrowRight size={14} className="text-gray-300 group-hover:text-gray-600 transition-colors flex-shrink-0" />
                </button>
              ))}
            </CardContent>
          </Card>

          {/* ESTADO DE LOS SERVICIOS INSTITUCIONALES */}
          <Card>
            <CardHeader className="border-b pb-3 mb-2">
              <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600" />
                Canales de Conectividad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-1 text-xs">
              {/* Supabase BD */}
              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-gray-50 border border-gray-100">
                <div
                  className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${
                    conectado ? 'bg-emerald-500' : 'bg-amber-400'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-800">Base de Datos Supabase</span>
                    <Badge variant={conectado ? 'success' : 'warning'} size="sm">
                      {conectado ? 'Online' : 'Revisar'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {totalEstudiantes} estudiantes · {totalIncidencias} incidencias
                  </p>
                </div>
              </div>

              {/* Green-API WhatsApp */}
              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-gray-50 border border-gray-100">
                <div className="w-2.5 h-2.5 rounded-full mt-1 bg-emerald-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-800">WhatsApp Institucional</span>
                    <Badge variant="success" size="sm">
                      Activo
                    </Badge>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Canal: {WHATSAPP_OFICIAL_NUMERO}
                  </p>
                </div>
              </div>

              {/* Personal Docente y Auxiliar */}
              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-gray-50 border border-gray-100">
                <div className="w-2.5 h-2.5 rounded-full mt-1 bg-blue-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-800">Personal Registrado</span>
                    <Badge variant="default" size="sm">
                      {totalPersonal} activos
                    </Badge>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Profesores y Auxiliares autorizados
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
