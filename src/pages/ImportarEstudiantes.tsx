import { useState, useRef } from 'react'
import {
  Upload, FileSpreadsheet, CheckCircle, Download, Trash2,
  AlertCircle, ArrowRight, ShieldCheck, FileCheck
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  estudianteService,
  normalizarWhatsApp,
  formatearWhatsApp,
  generarCodigoEstudiante,
  type CreateEstudianteInput
} from '@/lib/estudianteService'

type RowEstado = 'ok' | 'error'

interface FilaPreview {
  fila: number
  numero_orden: number | null
  codigo_estudiante: string
  nombres: string
  apellidos: string
  grado: string
  seccion: string
  apoderado_nombre: string
  apoderado_whatsapp: string | null
  estado: RowEstado
  error?: string
}

export default function ImportarEstudiantes() {
  const navigate = useNavigate()
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<FilaPreview[] | null>(null)
  const [importing, setImporting] = useState(false)
  const [resultMsg, setResultMsg] = useState<{
    type: 'success' | 'error'
    text: string
    count?: number
    nuevos?: number
    actualizados?: number
  } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ─── 1. Descargar Plantilla Excel (.xlsx) ───────────────────────────────────
  const handleDownloadTemplate = () => {
    const dataEjemplo = [
      {
        numero_orden: 1,
        nombres: 'David Alejandro',
        apellidos: 'Quispe Mendoza',
        grado: '5to',
        seccion: 'A',
        apoderado_nombre: 'Roberto Quispe Palomino',
        apoderado_whatsapp: '956123456',
      },
      {
        numero_orden: 2,
        nombres: 'María Elena',
        apellidos: 'Flores Ramos',
        grado: '5to',
        seccion: 'A',
        apoderado_nombre: 'Carmen Ramos Ccopa',
        apoderado_whatsapp: '956234567',
      },
      {
        numero_orden: 12,
        nombres: 'Carlos Raúl',
        apellidos: 'García Torres',
        grado: '5to',
        seccion: 'A',
        apoderado_nombre: 'Rosa Torres Mamani',
        apoderado_whatsapp: '956345678',
      },
    ]

    const worksheet = XLSX.utils.json_to_sheet(dataEjemplo, {
      header: [
        'numero_orden',
        'nombres',
        'apellidos',
        'grado',
        'seccion',
        'apoderado_nombre',
        'apoderado_whatsapp',
      ],
    })

    // Ajustar anchos de columnas
    worksheet['!cols'] = [
      { wch: 14 }, // numero_orden
      { wch: 22 }, // nombres
      { wch: 22 }, // apellidos
      { wch: 10 }, // grado
      { wch: 10 }, // seccion
      { wch: 28 }, // apoderado_nombre
      { wch: 20 }, // apoderado_whatsapp
    ]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'NominaEstudiantes')
    XLSX.writeFile(workbook, 'Plantilla_Estudiantes_SIRECE.xlsx')
  }

  // ─── 2. Procesar Archivo Excel Subido ────────────────────────────────────────
  const processExcelFile = (f: File) => {
    setFile(f)
    setResultMsg(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result
        const workbook = XLSX.read(buffer, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]

        // Leer filas como objetos
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' })

        if (!rawRows || rawRows.length === 0) {
          setPreview([])
          setResultMsg({ type: 'error', text: 'El archivo Excel está vacío o no contiene filas de datos.' })
          return
        }

        const parsed: FilaPreview[] = rawRows.map((row, index) => {
          // Búsqueda flexible de columnas por posibles variaciones de encabezado
          const getVal = (keys: string[]): string => {
            for (const k of keys) {
              const foundKey = Object.keys(row).find((rk) => rk.trim().toLowerCase() === k.toLowerCase())
              if (foundKey && row[foundKey] !== undefined) {
                return String(row[foundKey]).trim()
              }
            }
            return ''
          }

          const rawOrden = getVal(['numero_orden', 'orden', 'n_orden', 'num_orden', 'n° orden', 'n'])
          const numOrden = rawOrden ? parseInt(rawOrden, 10) : null

          const nombres = getVal(['nombres', 'nombre', 'primer_nombre', 'estudiante_nombres'])
          const apellidos = getVal(['apellidos', 'apellido', 'apellidos_estudiante'])

          let grado = getVal(['grado', 'año', 'grado_secundaria']) || '1ro'
          if (/^[1-5]$/.test(grado)) {
            grado = `${grado}to`
            if (grado === '1to') grado = '1ro'
            if (grado === '2to') grado = '2do'
            if (grado === '3to') grado = '3ro'
          }

          const seccion = (getVal(['seccion', 'sección', 'sec']) || 'A').toUpperCase()
          const apoderado_nombre = getVal(['apoderado_nombre', 'apoderado', 'padre', 'madre', 'tutor'])
          const rawWhatsapp = getVal(['apoderado_whatsapp', 'whatsapp', 'celular', 'telefono', 'teléfono'])

          const codigo_estudiante = generarCodigoEstudiante(grado, seccion, numOrden)
          const whatsappNorm = normalizarWhatsApp(rawWhatsapp)

          // Validaciones de fila: Solo son obligatorios nombres, apellidos, grado y sección
          const errorsList: string[] = []
          if (!nombres) errorsList.push('Faltan nombres')
          if (!apellidos) errorsList.push('Faltan apellidos')
          if (!grado) errorsList.push('Falta grado')
          if (!seccion) errorsList.push('Falta sección')

          // apoderado_nombre y apoderado_whatsapp son opcionales
          return {
            fila: index + 2, // Fila en Excel (considerando encabezado en fila 1)
            numero_orden: numOrden,
            codigo_estudiante,
            nombres,
            apellidos,
            grado,
            seccion,
            apoderado_nombre,
            apoderado_whatsapp: whatsappNorm,
            estado: errorsList.length === 0 ? 'ok' : 'error',
            error: errorsList.join(', '),
          }
        })

        setPreview(parsed)
      } catch (err: unknown) {
        setPreview(null)
        setResultMsg({
          type: 'error',
          text: `No se pudo leer el archivo Excel: ${err instanceof Error ? err.message : 'Formato no soportado'}`,
        })
      }
    }

    reader.readAsArrayBuffer(f)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) processExcelFile(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) {
      processExcelFile(f)
    } else {
      setResultMsg({ type: 'error', text: 'Por favor sube un archivo con extensión .xlsx o .xls.' })
    }
  }

  const handleClear = () => {
    setFile(null)
    setPreview(null)
    setResultMsg(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  // ─── 3. Guardar todo el salón en Supabase ──────────────────────────────────
  const handleImportToSupabase = async () => {
    if (!preview || preview.length === 0) return

    const validRows = preview.filter((r) => r.estado === 'ok')
    if (validRows.length === 0) {
      setResultMsg({
        type: 'error',
        text: 'No hay filas válidas para guardar. Por favor corrige los errores indicados en la tabla.',
      })
      return
    }

    setImporting(true)
    setResultMsg(null)

    const payloadList: CreateEstudianteInput[] = validRows.map((r) => ({
      nombres: r.nombres,
      apellidos: r.apellidos,
      grado: r.grado,
      seccion: r.seccion,
      numero_orden: r.numero_orden,
      codigo_estudiante: r.codigo_estudiante,
      apoderado_nombre: r.apoderado_nombre,
      apoderado_whatsapp: r.apoderado_whatsapp,
      activo: true,
    }))

    const res = await estudianteService.bulkCreateOrUpdate(payloadList)

    if (res.error) {
      setResultMsg({ type: 'error', text: `Error al guardar en Supabase: ${res.error}` })
    } else {
      setResultMsg({
        type: 'success',
        text: `¡Importación procesada correctamente! Se agregaron ${res.nuevos} estudiantes nuevos y se actualizaron ${res.actualizados} existentes. Los estudiantes de otros salones y los registrados previamente permanecen intactos.`,
        count: res.count,
        nuevos: res.nuevos,
        actualizados: res.actualizados,
      })
      setPreview(null)
      setFile(null)
    }

    setImporting(false)
  }

  const validosCount = preview?.filter((r) => r.estado === 'ok').length || 0
  const erroresCount = preview?.filter((r) => r.estado === 'error').length || 0

  return (
    <div className="space-y-6">
      {/* Mensajes de resultado */}
      {resultMsg && (
        <div
          className={`flex items-start gap-3 p-4 rounded-xl text-sm border shadow-sm ${
            resultMsg.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {resultMsg.type === 'success' ? (
            <CheckCircle size={22} className="text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={22} className="text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <h4 className="font-semibold text-sm">
              {resultMsg.type === 'success' ? 'Importación Exitosa' : 'Atención al Importar'}
            </h4>
            <p className="text-xs mt-0.5">{resultMsg.text}</p>
            {resultMsg.type === 'success' && (
              <>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="bg-white/90 p-2.5 rounded-lg border border-green-200 shadow-xs">
                    <span className="text-[11px] font-medium text-green-700 block">Nuevos agregados</span>
                    <span className="text-xl font-bold text-green-900">{resultMsg.nuevos ?? 0}</span>
                  </div>
                  <div className="bg-white/90 p-2.5 rounded-lg border border-green-200 shadow-xs">
                    <span className="text-[11px] font-medium text-green-700 block">Actualizados</span>
                    <span className="text-xl font-bold text-green-900">{resultMsg.actualizados ?? 0}</span>
                  </div>
                  <div className="bg-white/90 p-2.5 rounded-lg border border-green-200 shadow-xs">
                    <span className="text-[11px] font-medium text-green-700 block">Total en el lote</span>
                    <span className="text-xl font-bold text-green-900">{resultMsg.count ?? 0}</span>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="xs"
                    variant="primary"
                    rightIcon={<ArrowRight size={13} />}
                    onClick={() => navigate('/estudiantes')}
                  >
                    Ver estudiantes en el padrón
                  </Button>
                  <Button size="xs" variant="secondary" onClick={handleClear}>
                    Importar otro salón
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Zona de Instrucciones y Descarga de Plantilla */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet size={20} className="text-[#1e3a5f]" />
              Importación Masiva de Estudiantes desde Excel
            </CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              I.E. Juan Pablo Viscardo y Guzmán — Carga automática con generación de códigos estudiantiles
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download size={14} className="text-green-600" />}
            onClick={handleDownloadTemplate}
            className="border-green-200 bg-green-50/50 hover:bg-green-100/70 text-green-800"
          >
            Descargar Plantilla Excel (.xlsx)
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-600 bg-blue-50/50 border border-blue-100 rounded-xl p-3.5">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                1
              </div>
              <p>Descarga la plantilla con las columnas estructuradas para el sistema.</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                2
              </div>
              <p>Completa la nómina del salón con nombres, grado, sección y WhatsApp.</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-[#1e3a5f] text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                3
              </div>
              <p>Sube el archivo para previsualizar los códigos generados y guardar todo en Supabase.</p>
            </div>
          </div>

          {/* Drag & Drop uploader */}
          {!preview && (
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-150 ${
                isDragging
                  ? 'border-[#2563a0] bg-blue-50 scale-[1.01]'
                  : 'border-gray-300 hover:border-[#2563a0] hover:bg-gray-50/80 bg-white'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#1e3a5f] flex items-center justify-center mx-auto mb-3 shadow-xs">
                <Upload size={26} />
              </div>
              <h3 className="text-sm font-semibold text-gray-800">
                Arrastra tu archivo Excel aquí o haz clic para seleccionarlo
              </h3>
              <p className="text-xs text-gray-400 mt-1">Archivos soportados: .xlsx y .xls (Microsoft Excel)</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vista Previa de la Nómina Leída */}
      {preview && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileCheck size={18} className="text-green-600" />
              <div>
                <CardTitle>Vista Previa de Alumnos ({preview.length} filas leídas)</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">Archivo cargado: {file?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" leftIcon={<Trash2 size={13} />} onClick={handleClear}>
                Descartar
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={importing}
                disabled={validosCount === 0}
                leftIcon={<ShieldCheck size={15} />}
                onClick={handleImportToSupabase}
              >
                Guardar todo el salón en la base de datos ({validosCount})
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Tarjetas resumen */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900">
                <p className="text-[11px] font-medium text-blue-700">Total en archivo</p>
                <p className="text-xl font-bold">{preview.length} estudiantes</p>
              </div>
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-900">
                <p className="text-[11px] font-medium text-green-700">Listos para guardar</p>
                <p className="text-xl font-bold">{validosCount} válidos</p>
              </div>
              <div
                className={`p-3 rounded-xl border ${
                  erroresCount > 0
                    ? 'bg-red-50 border-red-200 text-red-900'
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                }`}
              >
                <p className="text-[11px] font-medium text-gray-500">Filas con observaciones</p>
                <p className="text-xl font-bold">{erroresCount} filas</p>
              </div>
            </div>

            {/* Tabla con scroll horizontal */}
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto max-h-[460px]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#1e3a5f] text-white uppercase text-[10px] tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">Fila</th>
                      <th className="py-2.5 px-3">N° Orden</th>
                      <th className="py-2.5 px-3">Código Generado</th>
                      <th className="py-2.5 px-3">Apellidos y Nombres</th>
                      <th className="py-2.5 px-3">Grado y Sección</th>
                      <th className="py-2.5 px-3">Apoderado</th>
                      <th className="py-2.5 px-3">WhatsApp (+51)</th>
                      <th className="py-2.5 px-3 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {preview.map((row) => (
                      <tr
                        key={row.fila}
                        className={`hover:bg-blue-50/40 transition-colors ${
                          row.estado === 'error' ? 'bg-red-50/40' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono text-gray-400">#{row.fila}</td>
                        <td className="py-2.5 px-3 font-semibold text-gray-700">
                          {row.numero_orden || '—'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono font-bold text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md">
                            {row.codigo_estudiante}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-gray-900">
                          {row.apellidos}, {row.nombres}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant="primary" size="sm">
                            {row.grado} &ldquo;{row.seccion}&rdquo;
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-gray-700">
                          {row.apoderado_nombre || <span className="text-gray-400 italic">Sin apoderado</span>}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-gray-600">
                          {row.apoderado_whatsapp ? (
                            formatearWhatsApp(row.apoderado_whatsapp)
                          ) : (
                            <span className="text-gray-400 italic">Sin WhatsApp</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {row.estado === 'ok' ? (
                            <Badge variant="success" size="sm">
                              Válido
                            </Badge>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-[11px] text-red-600 font-medium"
                              title={row.error}
                            >
                              <AlertCircle size={12} />
                              {row.error}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Botón inferior para guardar */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-gray-500">
                Al guardar, los estudiantes se vincularán directamente a la I.E. Juan Pablo Viscardo y Guzmán.
              </p>
              <Button
                variant="primary"
                size="md"
                loading={importing}
                disabled={validosCount === 0}
                leftIcon={<ShieldCheck size={16} />}
                onClick={handleImportToSupabase}
              >
                Guardar todo el salón en la base de datos ({validosCount})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
