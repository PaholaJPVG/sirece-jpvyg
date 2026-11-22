import { BarChart3, Download, Calendar, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'

const MONTHLY = [
  { mes: 'Jul', faltas: 12 }, { mes: 'Ago', faltas: 28 }, { mes: 'Set', faltas: 22 },
  { mes: 'Oct', faltas: 35 }, { mes: 'Nov', faltas: 34 },
]
const maxFaltas = Math.max(...MONTHLY.map((m) => m.faltas))

const TOP_TIPOS = [
  { tipo: 'Tardanza reiterada',         cantidad: 15, pct: 44 },
  { tipo: 'Uso de celular',             cantidad: 8,  pct: 24 },
  { tipo: 'Incumplimiento de uniforme', cantidad: 6,  pct: 18 },
  { tipo: 'Comportamiento inapropiado', cantidad: 3,  pct: 9 },
  { tipo: 'Otros',                      cantidad: 2,  pct: 6 },
]

const PERIODO_OPTS = [
  { value: '2026', label: 'Año 2026' },
  { value: '2025', label: 'Año 2025' },
]

export default function InformesEstadisticas() {
  return (
    <div className="space-y-5">
      {/* Cabecera con filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div />
        <div className="flex items-center gap-2 flex-wrap">
          <Select options={PERIODO_OPTS} className="w-36" />
          <Button variant="secondary" size="sm" leftIcon={<Download size={14} />}>
            PDF
          </Button>
          <Button variant="secondary" size="sm" leftIcon={<Download size={14} />}>
            Excel
          </Button>
        </div>
      </div>

      {/* KPIs anuales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Faltas totales 2026"       value="131" icon={<BarChart3 size={20} />} color="blue" change={{ value: -8, label: 'vs 2025' }} />
        <StatCard label="Notificaciones enviadas"   value="118" icon={<TrendingUp size={20} />} color="green" />
        <StatCard label="Tasa de notificación"      value="90%" icon={<TrendingUp size={20} />} color="green" />
        <StatCard label="Casos derivados"           value="3"   icon={<TrendingDown size={20} />} color="red" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Gráfico de barras manual (sin librería de gráficos en Etapa 1) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar size={16} className="text-[#1e3a5f]" />
              Faltas por Mes — 2026
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 h-40">
              {MONTHLY.map((m) => (
                <div key={m.mes} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-[#1e3a5f]">{m.faltas}</span>
                  <div
                    className="w-full bg-gradient-to-t from-[#1e3a5f] to-[#2980b9] rounded-t-lg transition-all"
                    style={{ height: `${(m.faltas / maxFaltas) * 120}px` }}
                  />
                  <span className="text-xs text-gray-500">{m.mes}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top tipos de falta */}
        <Card>
          <CardHeader>
            <CardTitle>Top Tipos de Falta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {TOP_TIPOS.map((t, i) => (
              <div key={t.tipo}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-700 font-medium">{i + 1}. {t.tipo}</span>
                  <span className="text-gray-500">{t.cantidad} casos ({t.pct}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#1e3a5f] to-[#2980b9]"
                    style={{ width: `${t.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Informes disponibles */}
      <Card>
        <CardHeader><CardTitle>Informes Disponibles</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {[
              { title: 'Reporte mensual de faltas',          desc: 'Resumen completo del mes actual' },
              { title: 'Reporte por sección/grado',          desc: 'Comparativa entre secciones' },
              { title: 'Reporte de reincidencias',           desc: 'Estudiantes con más de 3 faltas' },
              { title: 'Estadísticas de notificaciones',     desc: 'Efectividad de WhatsApp' },
              { title: 'Reporte anual acumulado',            desc: 'Histórico completo del año' },
              { title: 'Reporte para UGEL',                  desc: 'Formato oficial requerido' },
            ].map((r) => (
              <div key={r.title} className="border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{r.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
                  </div>
                  <Button variant="ghost" size="xs" leftIcon={<Download size={12} />}>
                    PDF
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
