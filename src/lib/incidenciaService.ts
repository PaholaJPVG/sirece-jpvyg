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
 * Genera el texto formal del comunicado institucional por WhatsApp
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

  let subMotivosLinea = ''
  let detalleTexto = ''

  if (subMotivos && subMotivos.length > 0) {
    subMotivosLinea = `🔍 *Motivo específico:* ${subMotivos.join(', ')}\n`
    if (descripcion && descripcion.trim()) {
      detalleTexto = `📝 *Detalle:* ${descripcion.trim()}\n`
    }
  } else if (descripcion && descripcion.trim()) {
    // Si viene del historial guardado como "Motivo específico: ... Obs: ..."
    const desc = descripcion.trim()
    if (desc.startsWith('Motivo específico:')) {
      const parts = desc.split('. Obs: ')
      const motivoPart = parts[0].replace('Motivo específico:', '').trim()
      subMotivosLinea = `🔍 *Motivo específico:* ${motivoPart}\n`
      if (parts[1] && parts[1].trim()) {
        detalleTexto = `📝 *Detalle:* ${parts[1].trim()}\n`
      }
    } else {
      detalleTexto = `📝 *Detalle:* ${desc}\n`
    }
  } else {
    detalleTexto = `📝 *Detalle:* Sin observaciones adicionales.\n`
  }

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
    subMotivosLinea +
    detalleTexto +
    `📅 *Fecha:* ${fechaStr}\n` +
    `⏰ *Hora:* ${horaStr}\n\n` +
    `Solicitamos dialogar con su menor hijo(a) en el hogar para fortalecer los acuerdos de convivencia y su formación integral.\n\n` +
    `*Atentamente,*\n` +
    `*Comité de Gestión del Bienestar y Convivencia Escolar*\n` +
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
