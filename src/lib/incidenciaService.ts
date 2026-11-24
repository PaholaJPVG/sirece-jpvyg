import { supabase, isSupabaseConfigured } from './supabase'
import { normalizarWhatsApp } from './estudianteService'
import type { IncidenciaDB, Estudiante } from '@/types'

export interface CreateIncidenciaInput {
  estudiante_id: string
  personal_id?: string | null
  tipo_falta: string
  descripcion?: string | null
  fecha?: string
  hora?: string
  notificado_whatsapp?: boolean
}

/**
 * Extrae la subcategoría y la observación limpia desde subMotivos o desde el campo descripcion
 */
export function extraerDetallesFalta(
  descripcion?: string | null,
  subMotivos?: string[] | null
): { subcategoria: string | null; observacion: string | null } {
  let subcategoria: string | null = null
  let observacion: string | null = null

  if (subMotivos && subMotivos.length > 0) {
    subcategoria = subMotivos.join(', ')
    if (descripcion && descripcion.trim()) {
      observacion = descripcion.trim()
    }
  } else if (descripcion && descripcion.trim()) {
    const desc = descripcion.trim()
    if (desc.startsWith('Motivo específico:')) {
      const parts = desc.split('. Obs: ')
      subcategoria = parts[0].replace('Motivo específico:', '').trim()
      if (parts[1] && parts[1].trim()) {
        observacion = parts[1].trim()
      }
    } else if (desc.startsWith('Obs: ')) {
      observacion = desc.replace('Obs: ', '').trim()
    } else {
      observacion = desc
    }
  }

  return { subcategoria, observacion }
}

/**
 * Normaliza el tipo de falta para aplicar la plantilla dinámica correspondiente
 */
function clasificarTipoFalta(tipo: string): 'tardanza' | 'inasistencia' | 'sin_uniforme' | 'presentacion_personal' | 'celular' | 'otro' {
  const t = (tipo || '').toLowerCase().trim()
  if (t === 'tardanza') return 'tardanza'
  if (t === 'inasistencia') return 'inasistencia'
  if (t === 'sin uniforme' || t.includes('uniforme')) return 'sin_uniforme'
  if (t === 'presentación personal' || t.includes('presentación') || t.includes('presentacion')) return 'presentacion_personal'
  if (t.includes('celular')) return 'celular'
  return 'otro'
}

/**
 * Genera el texto formal del comunicado institucional por WhatsApp
 * Aplica plantillas dinámicas personalizadas y formativas según cada uno de los 5 tipos de falta leve.
 * Utiliza formato limpio y negritas con asteriscos (*...*).
 */
export function generarMensajeWhatsApp(
  estudiante: Estudiante,
  tipoFalta: string,
  descripcion?: string | null,
  fecha?: string,
  hora?: string,
  subMotivos?: string[] | null
): string {
  const nombreApoderado = estudiante.apoderado_nombre?.trim() || 'Padre / Madre de Familia'
  const nombreEstudiante = `${estudiante.apellidos}, ${estudiante.nombres}`
  const codigoEst = estudiante.codigo_estudiante || ''
  const gradoSec = `${estudiante.grado} "${estudiante.seccion}"`
  const fechaStr = fecha || new Date().toISOString().split('T')[0]
  const horaStr = hora || new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })

  const { subcategoria, observacion } = extraerDetallesFalta(descripcion, subMotivos)
  const obsLinea = observacion ? `📝 *Observación:* ${observacion}\n` : ''
  const tipoClase = clasificarTipoFalta(tipoFalta)

  // 1. PLANTILLA: TARDANZA
  if (tipoClase === 'tardanza') {
    return (
      `*I.E. JUAN PABLO VISCARDO Y GUZMÁN*\n` +
      `*COMUNICADO DE PUNTUALIDAD — SIRECE*\n\n` +
      `Estimado(a) apoderado(a) *${nombreApoderado}*:\n\n` +
      `Le saludamos cordialmente para comunicarle que el(la) estudiante:\n` +
      `👤 *Estudiante:* ${nombreEstudiante}\n` +
      `🏷️ *Código:* ${codigoEst}\n` +
      `📚 *Grado y Sección:* ${gradoSec}\n\n` +
      `Ha registrado una *TARDANZA* en el ingreso a la institución educativa:\n` +
      `📅 *Fecha:* ${fechaStr}\n` +
      `⏰ *Hora de ingreso:* ${horaStr}\n` +
      obsLinea +
      `\nLa puntualidad es un valor formativo esencial para el aprovechamiento pedagógico y la disciplina escolar. Le solicitamos conversar en el hogar para tomar las previsiones necesarias y asegurar su llegada oportuna al plantel.\n\n` +
      `*Atentamente,*\n` +
      `*Auxiliaría y Comité de Convivencia Escolar*\n` +
      `I.E. Juan Pablo Viscardo y Guzmán — Arequipa`
    )
  }

  // 2. PLANTILLA: INASISTENCIA
  if (tipoClase === 'inasistencia') {
    return (
      `*I.E. JUAN PABLO VISCARDO Y GUZMÁN*\n` +
      `*COMUNICADO DE INASISTENCIA ESCOLAR — SIRECE*\n\n` +
      `Estimado(a) apoderado(a) *${nombreApoderado}*:\n\n` +
      `Por medio del presente se le comunica que el(la) estudiante:\n` +
      `👤 *Estudiante:* ${nombreEstudiante}\n` +
      `🏷️ *Código:* ${codigoEst}\n` +
      `📚 *Grado y Sección:* ${gradoSec}\n\n` +
      `Ha registrado *INASISTENCIA* en la jornada escolar del día de hoy:\n` +
      `📅 *Fecha:* ${fechaStr}\n` +
      `⏰ *Hora de registro:* ${horaStr}\n` +
      obsLinea +
      `\nLe recordamos que la asistencia constante a clases es indispensable para la continuidad de sus aprendizajes. Agradecemos acercarse o comunicarse con la institución para presentar la debida justificación dentro de las 24 horas.\n\n` +
      `*Atentamente,*\n` +
      `*Auxiliaría y Comité de Convivencia Escolar*\n` +
      `I.E. Juan Pablo Viscardo y Guzmán — Arequipa`
    )
  }

  // 3. PLANTILLA: SIN UNIFORME
  if (tipoClase === 'sin_uniforme') {
    return (
      `*I.E. JUAN PABLO VISCARDO Y GUZMÁN*\n` +
      `*COMUNICADO DE UNIFORME ESCOLAR — SIRECE*\n\n` +
      `Estimado(a) apoderado(a) *${nombreApoderado}*:\n\n` +
      `Nos dirigimos a usted para informarle que el(la) estudiante:\n` +
      `👤 *Estudiante:* ${nombreEstudiante}\n` +
      `🏷️ *Código:* ${codigoEst}\n` +
      `📚 *Grado y Sección:* ${gradoSec}\n\n` +
      `Se ha presentado a la institución educativa *SIN EL UNIFORME REGLAMENTARIO*:\n` +
      `📅 *Fecha:* ${fechaStr}\n` +
      `⏰ *Hora:* ${horaStr}\n` +
      obsLinea +
      `\nEl porte correcto del uniforme institucional fortalece el sentido de pertenencia, la igualdad y el orden en nuestro colegio. Solicitamos verificar desde el hogar que el estudiante asista debidamente uniformado(a) a partir de la siguiente jornada escolar.\n\n` +
      `*Atentamente,*\n` +
      `*Auxiliaría y Comité de Convivencia Escolar*\n` +
      `I.E. Juan Pablo Viscardo y Guzmán — Arequipa`
    )
  }

  // 4. PLANTILLA: PRESENTACIÓN PERSONAL
  if (tipoClase === 'presentacion_personal') {
    const subcatTexto = subcategoria
      ? `🔍 *Motivo específico:* ${subcategoria}\n`
      : '🔍 *Motivo específico:* Observación en presentación personal\n'

    return (
      `*I.E. JUAN PABLO VISCARDO Y GUZMÁN*\n` +
      `*COMUNICADO DE PRESENTACIÓN PERSONAL — SIRECE*\n\n` +
      `Estimado(a) apoderado(a) *${nombreApoderado}*:\n\n` +
      `Por medio del presente le informamos que el(la) estudiante:\n` +
      `👤 *Estudiante:* ${nombreEstudiante}\n` +
      `🏷️ *Código:* ${codigoEst}\n` +
      `📚 *Grado y Sección:* ${gradoSec}\n\n` +
      `Ha registrado una observación en su *PRESENTACIÓN PERSONAL*:\n` +
      subcatTexto +
      `📅 *Fecha:* ${fechaStr}\n` +
      `⏰ *Hora:* ${horaStr}\n` +
      obsLinea +
      `\nEl cumplimiento de las pautas de presentación personal e higiene promueve un clima escolar de orden, respeto mutuo y disciplina. Solicitamos su valiosa colaboración familiar para subsanar esta observación a la brevedad posible.\n\n` +
      `*Atentamente,*\n` +
      `*Auxiliaría y Comité de Convivencia Escolar*\n` +
      `I.E. Juan Pablo Viscardo y Guzmán — Arequipa`
    )
  }

  // 5. PLANTILLA: USO DE CELULAR S/AUTORIZACIÓN
  if (tipoClase === 'celular') {
    return (
      `*I.E. JUAN PABLO VISCARDO Y GUZMÁN*\n` +
      `*COMUNICADO SOBRE DISPOSITIVOS ELECTRÓNICOS — SIRECE*\n\n` +
      `Estimado(a) apoderado(a) *${nombreApoderado}*:\n\n` +
      `Le comunicamos que el(la) estudiante:\n` +
      `👤 *Estudiante:* ${nombreEstudiante}\n` +
      `🏷️ *Código:* ${codigoEst}\n` +
      `📚 *Grado y Sección:* ${gradoSec}\n\n` +
      `Ha registrado una incidencia por *USO DE CELULAR SIN AUTORIZACIÓN*:\n` +
      `📅 *Fecha:* ${fechaStr}\n` +
      `⏰ *Hora:* ${horaStr}\n` +
      obsLinea +
      `\nDe acuerdo con el Reglamento Interno y las Normas de Convivencia, el uso de celulares durante las horas pedagógicas está restringido salvo indicación expresa del docente para fines de aprendizaje. Le pedimos dialogar con su menor hijo(a) sobre el uso responsable de la tecnología para evitar distracciones en el aula.\n\n` +
      `*Atentamente,*\n` +
      `*Auxiliaría y Comité de Convivencia Escolar*\n` +
      `I.E. Juan Pablo Viscardo y Guzmán — Arequipa`
    )
  }

  // 6. PLANTILLA GENÉRICA DE RESPALDO (Compatibilidad con registros anteriores)
  const subLinea = subcategoria ? `🔍 *Motivo específico:* ${subcategoria}\n` : ''
  return (
    `*I.E. JUAN PABLO VISCARDO Y GUZMÁN*\n` +
    `*COMUNICADO DE INCIDENCIA ESTUDIANTIL — SIRECE*\n\n` +
    `Estimado(a) apoderado(a) *${nombreApoderado}*:\n\n` +
    `Por medio del presente se le comunica que el(la) estudiante:\n` +
    `👤 *Estudiante:* ${nombreEstudiante}\n` +
    `🏷️ *Código:* ${codigoEst}\n` +
    `📚 *Grado y Sección:* ${gradoSec}\n\n` +
    `Ha registrado una *FALTA LEVE* en nuestra institución:\n` +
    `⚠️ *Falta registrada:* ${tipoFalta}\n` +
    subLinea +
    obsLinea +
    `📅 *Fecha:* ${fechaStr}\n` +
    `⏰ *Hora:* ${horaStr}\n\n` +
    `Solicitamos dialogar con su menor hijo(a) en el hogar para fortalecer los acuerdos de convivencia y su formación integral.\n\n` +
    `*Atentamente,*\n` +
    `*Auxiliaría y Comité de Convivencia Escolar*\n` +
    `I.E. Juan Pablo Viscardo y Guzmán — Arequipa`
  )
}

/**
 * Genera el enlace directo a WhatsApp listo para window.open
 */
export function generarEnlaceWhatsApp(numero: string, mensaje: string): string | null {
  const norm = normalizarWhatsApp(numero)
  if (!norm) return null
  return `https://wa.me/${norm}?text=${encodeURIComponent(mensaje)}`
}

export const incidenciaService = {
  /**
   * Obtiene todas las incidencias registradas con los datos del estudiante
   */
  async getAll(): Promise<{ data: IncidenciaDB[]; error: string | null; tableMissing?: boolean }> {
    if (!isSupabaseConfigured()) {
      return { data: [], error: 'Supabase no está configurado.' }
    }

    try {
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
            foto_url,
            apoderado_nombre,
            apoderado_whatsapp,
            activo
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist') || error.code === 'PGRST205') {
          return {
            data: [],
            error: 'La tabla "incidencias" aún no existe en tu base de datos Supabase. Ejecuta el script SQL en el SQL Editor.',
            tableMissing: true,
          }
        }
        return { data: [], error: error.message }
      }

      return { data: (data as unknown as IncidenciaDB[]) || [], error: null }
    } catch (err: unknown) {
      return { data: [], error: err instanceof Error ? err.message : 'Error inesperado al consultar incidencias' }
    }
  },

  /**
   * Registra una nueva falta leve en Supabase
   */
  async create(input: CreateIncidenciaInput): Promise<{ data: IncidenciaDB | null; error: string | null }> {
    if (!isSupabaseConfigured()) {
      return { data: null, error: 'Supabase no está configurado.' }
    }

    try {
      const hoy = new Date()
      const fecha = input.fecha || hoy.toISOString().split('T')[0]
      const hora =
        input.hora ||
        hoy.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })

      const { data, error } = await supabase
        .from('incidencias')
        .insert([
          {
            estudiante_id: input.estudiante_id,
            personal_id: input.personal_id || null,
            tipo_falta: input.tipo_falta.trim(),
            descripcion: input.descripcion?.trim() || null,
            fecha,
            hora,
            notificado_whatsapp: input.notificado_whatsapp ?? false,
          },
        ])
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data as IncidenciaDB, error: null }
    } catch (err: unknown) {
      return { data: null, error: err instanceof Error ? err.message : 'Error al registrar la incidencia' }
    }
  },

  /**
   * Actualiza el estado de notificación por WhatsApp
   */
  async updateNotificado(id: string, notificado: boolean): Promise<{ success: boolean; error: string | null }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase no está configurado.' }
    }

    try {
      const { error } = await supabase
        .from('incidencias')
        .update({ notificado_whatsapp: notificado })
        .eq('id', id)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Error al actualizar estado de notificación' }
    }
  },

  /**
   * Elimina un registro de incidencia
   */
  async delete(id: string): Promise<{ success: boolean; error: string | null }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase no está configurado.' }
    }

    try {
      const { error } = await supabase
        .from('incidencias')
        .delete()
        .eq('id', id)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Error al eliminar incidencia' }
    }
  },
}
