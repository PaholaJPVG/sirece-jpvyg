import { useState } from 'react'
import { Settings, Bell, MessageSquare, Database, Shield, ChevronRight, Save, CheckCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAppConfig } from '@/context/AppConfigContext'
import { isSupabaseConfigured } from '@/lib/supabase'

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'general',   icon: Settings,      label: 'General' },
  { key: 'whatsapp',  icon: MessageSquare, label: 'WhatsApp' },
  { key: 'faltas',    icon: Bell,          label: 'Tipos de Falta' },
  { key: 'seguridad', icon: Shield,        label: 'Seguridad' },
  { key: 'sistema',   icon: Database,      label: 'Sistema' },
]

const TIPOS_FALTA_DEMO = [
  { codigo: 'FL-01', descripcion: 'Tardanza reiterada',           limite: 3, activo: true  },
  { codigo: 'FL-02', descripcion: 'Uso de celular en clase',      limite: 2, activo: true  },
  { codigo: 'FL-03', descripcion: 'Incumplimiento de uniforme',   limite: 3, activo: true  },
  { codigo: 'FL-04', descripcion: 'Comportamiento inapropiado',   limite: 2, activo: true  },
  { codigo: 'FL-05', descripcion: 'Incumplimiento de tareas',     limite: 4, activo: true  },
  { codigo: 'FL-06', descripcion: 'Vocabulario inapropiado',      limite: 2, activo: false },
]

const TURNO_OPTS = [
  { value: 'manana', label: 'Mañana' },
  { value: 'tarde',  label: 'Tarde' },
  { value: 'ambos',  label: 'Ambos turnos' },
]

// Generar opciones de años: año actual ± 2
const currentYear = new Date().getFullYear()
const ANIO_OPTS = Array.from({ length: 5 }, (_, i) => {
  const y = String(currentYear - 2 + i)
  return { value: y, label: `Año ${y}` }
})

const PERIODO_OPTS = [
  { value: 'Enero',      label: 'Enero'      },
  { value: 'Febrero',    label: 'Febrero'    },
  { value: 'Marzo',      label: 'Marzo'      },
  { value: 'Abril',      label: 'Abril'      },
  { value: 'Mayo',       label: 'Mayo'       },
  { value: 'Junio',      label: 'Junio'      },
  { value: 'Julio',      label: 'Julio'      },
  { value: 'Agosto',     label: 'Agosto'     },
  { value: 'Septiembre', label: 'Septiembre' },
  { value: 'Octubre',    label: 'Octubre'    },
  { value: 'Noviembre',  label: 'Noviembre'  },
  { value: 'Diciembre',  label: 'Diciembre'  },
  { value: 'Bimestre I',   label: 'Bimestre I'   },
  { value: 'Bimestre II',  label: 'Bimestre II'  },
  { value: 'Bimestre III', label: 'Bimestre III' },
  { value: 'Bimestre IV',  label: 'Bimestre IV'  },
  { value: 'Trimestre I',  label: 'Trimestre I'  },
  { value: 'Trimestre II', label: 'Trimestre II' },
  { value: 'Trimestre III',label: 'Trimestre III'},
]

// ─── Componente ───────────────────────────────────────────────────────────────
export default function Configuracion() {
  const [activeTab, setActiveTab] = useState('general')
  const { config, updateConfig }  = useAppConfig()
  const conectado = isSupabaseConfigured()

  // Estado local del formulario general (se sincroniza con context al guardar)
  const [form, setForm] = useState({ ...config })
  const [saved, setSaved] = useState(false)

  const setField = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }))

  const handleSaveGeneral = () => {
    updateConfig(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex flex-col lg:flex-row gap-5">

        {/* Menú lateral de tabs */}
        <Card className="lg:w-56 flex-shrink-0 h-fit" padding="sm">
          <nav className="space-y-0.5">
            {TABS.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  activeTab === key
                    ? 'bg-[#1e3a5f] text-white font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={16} />
                <span>{label}</span>
                {activeTab === key && <ChevronRight size={14} className="ml-auto" />}
              </button>
            ))}
          </nav>
        </Card>

        {/* Contenido del tab */}
        <div className="flex-1 space-y-4">

          {/* ── GENERAL ─────────────────────────────────────────────────── */}
          {activeTab === 'general' && (
            <Card>
              <CardHeader>
                <CardTitle>Configuración General</CardTitle>
                {saved && (
                  <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                    <CheckCircle size={14} /> Guardado
                  </span>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Nombre de la institución"
                  value={form.institucion}
                  onChange={(e) => setField('institucion', e.target.value)}
                />
                <Input
                  label="Código modular"
                  value={form.codigoModular}
                  onChange={(e) => setField('codigoModular', e.target.value)}
                />
                <Input
                  label="Dirección"
                  value={form.direccion}
                  onChange={(e) => setField('direccion', e.target.value)}
                />

                {/* ── Año académico y Periodo ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select
                    label="Año académico"
                    options={ANIO_OPTS}
                    value={form.anioAcademico}
                    onChange={(e) => setField('anioAcademico', e.target.value)}
                    hint="Se mostrará en el Panel Principal"
                  />
                  <Select
                    label="Periodo escolar"
                    options={PERIODO_OPTS}
                    value={form.periodo}
                    onChange={(e) => setField('periodo', e.target.value)}
                    hint="Mes, bimestre o trimestre actual"
                  />
                </div>

                <Select
                  label="Turno"
                  options={TURNO_OPTS}
                  value={form.turno}
                  onChange={(e) => setField('turno', e.target.value)}
                />
                <Input
                  label="Correo institucional"
                  type="email"
                  value={form.correo}
                  onChange={(e) => setField('correo', e.target.value)}
                />

                <div className="pt-1">
                  <Button
                    leftIcon={saved ? <CheckCircle size={15} /> : <Save size={15} />}
                    variant={saved ? 'success' : 'primary'}
                    onClick={handleSaveGeneral}
                  >
                    {saved ? '¡Guardado!' : 'Guardar cambios'}
                  </Button>
                  <p className="text-[11px] text-gray-400 mt-2">
                    Los cambios se aplican inmediatamente y se conservan entre sesiones.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── WHATSAPP ─────────────────────────────────────────────────── */}
          {activeTab === 'whatsapp' && (
            <Card>
              <CardHeader>
                <CardTitle>Configuración WhatsApp Business</CardTitle>
                <Badge variant="warning" dot>No configurado</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800">
                  <strong>⚠️ Importante:</strong> Las credenciales de WhatsApp Business Cloud API
                  deben configurarse como variables de entorno en Supabase Edge Functions.
                  No se gestionan desde esta pantalla para evitar exponerlas en el cliente.
                </div>
                <Input
                  label="Phone Number ID"
                  placeholder="Configurar en variables de entorno de Supabase"
                  disabled
                  hint="Variable: WHATSAPP_PHONE_NUMBER_ID"
                />
                <Input
                  label="Token de acceso"
                  type="password"
                  placeholder="Configurar en variables de entorno de Supabase"
                  disabled
                  hint="Variable: WHATSAPP_TOKEN"
                />
                <Textarea
                  label="Plantilla de mensaje"
                  defaultValue="Estimado/a *{{apoderado}}*, le informamos que el estudiante *{{estudiante}}* del {{grado}} registró una falta leve: {{tipo_falta}}. Fecha: {{fecha}}. Para más información comuníquese con la institución."
                  hint="Variables disponibles: {{apoderado}}, {{estudiante}}, {{grado}}, {{tipo_falta}}, {{fecha}}"
                />
                <Button leftIcon={<Save size={15} />} disabled>
                  Guardar (requiere conexión Supabase — Etapa 5)
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── TIPOS DE FALTA ───────────────────────────────────────────── */}
          {activeTab === 'faltas' && (
            <Card>
              <CardHeader>
                <CardTitle>Tipos de Falta</CardTitle>
                <Button size="sm">+ Agregar tipo</Button>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700 mb-3">
                  La gestión completa de tipos de falta se habilitará en la Etapa 2 (Supabase).
                  Los siguientes son los tipos predefinidos del sistema.
                </div>
                {TIPOS_FALTA_DEMO.map((t) => (
                  <div key={t.codigo} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50">
                    <span className="font-mono text-xs text-[#2980b9] w-14">{t.codigo}</span>
                    <span className="flex-1 text-sm text-gray-800">{t.descripcion}</span>
                    <span className="text-xs text-gray-400">Límite: {t.limite}</span>
                    <Badge variant={t.activo ? 'success' : 'default'} dot>
                      {t.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                    <Button variant="ghost" size="xs">Editar</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* ── SEGURIDAD ────────────────────────────────────────────────── */}
          {activeTab === 'seguridad' && (
            <Card>
              <CardHeader><CardTitle>Seguridad y Accesos</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
                  La gestión de usuarios, roles y permisos se implementará en la{' '}
                  <strong>Etapa 2</strong> con Supabase Auth y Row Level Security (RLS).
                </div>
                <Input
                  label="Sesión máxima (horas)"
                  type="number"
                  defaultValue="8"
                  hint="Tiempo máximo de inactividad antes de cerrar sesión"
                />
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Autenticación de dos factores</p>
                    <p className="text-xs text-gray-500">Requiere Supabase Auth (Etapa 2)</p>
                  </div>
                  <Badge variant="default">Próximamente</Badge>
                </div>
                <Button leftIcon={<Save size={15} />} disabled>
                  Guardar (requiere Supabase — Etapa 2)
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── SISTEMA ──────────────────────────────────────────────────── */}
          {activeTab === 'sistema' && (
            <Card>
              <CardHeader><CardTitle>Estado del Sistema</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'Versión del sistema',   valor: 'SIRECE v1.0.0 — Etapa 1',                                     ok: true  },
                  { label: 'Supabase',              valor: conectado ? 'Conectado ✓' : 'No configurado — edita el .env', ok: conectado },
                  { label: 'WhatsApp Business API', valor: 'No configurado',                                              ok: false },
                  { label: 'Supabase Storage',      valor: 'No configurado',                                              ok: false },
                  { label: 'Edge Functions',        valor: 'No desplegadas',                                             ok: false },
                  { label: 'React / Vite',          valor: '19.x / 8.x — ✓ Funcional',                                  ok: true  },
                  { label: 'TypeScript',            valor: '7.x — ✓ Estricto',                                           ok: true  },
                  { label: 'Tailwind CSS',          valor: 'v4 — ✓ Funcional',                                           ok: true  },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between p-2.5 border border-gray-100 rounded-lg">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.ok ? 'bg-green-500' : 'bg-amber-400'}`} />
                      <span className="text-sm font-medium text-gray-700">{s.label}</span>
                    </div>
                    <span className="text-xs text-gray-400 text-right max-w-[220px]">{s.valor}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    Para conectar Supabase: crea el archivo <code className="bg-gray-100 px-1 rounded">.env</code> a
                    partir de <code className="bg-gray-100 px-1 rounded">.env.example</code> e ingresa tu
                    URL y clave anónima de Supabase.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  )
}
