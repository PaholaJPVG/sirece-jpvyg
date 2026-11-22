import { supabase, isSupabaseConfigured } from './supabase'
import type { Estudiante } from '@/types'

export interface CreateEstudianteInput {
  nombres: string
  apellidos: string
  grado: string
  seccion: string
  numero_orden?: number | null
  codigo_estudiante?: string | null
  foto_url?: string | null
  apoderado_nombre?: string | null
  apoderado_whatsapp?: string | null
  activo?: boolean
}

export interface UpdateEstudianteInput extends Partial<CreateEstudianteInput> {
  id: string
}

export interface BulkImportResult {
  count: number
  nuevos: number
  actualizados: number
  error: string | null
}

/**
 * Genera el código único del estudiante combinando:
 * - Número de grado ('1ro' -> '1', '5to' -> '5')
 * - Letra de la sección en mayúscula ('A', 'B', etc.)
 * - Número de orden tal como viene (ej: orden 12 -> '5A12', orden 3 -> '5A3')
 */
export function generarCodigoEstudiante(
  grado: string,
  seccion: string,
  numeroOrden?: number | string | null
): string {
  const gradoNum = grado.replace(/\D/g, '') || grado.trim()
  const secLetra = seccion.trim().toUpperCase()
  const ordenStr =
    numeroOrden !== undefined && numeroOrden !== null && String(numeroOrden).trim() !== ''
      ? String(numeroOrden).trim()
      : ''
  return `${gradoNum}${secLetra}${ordenStr}`
}

/**
 * Normaliza un número telefónico al formato Perú 51XXXXXXXXX para WhatsApp.
 * Si no se proporciona o viene vacío, retorna null.
 */
export function normalizarWhatsApp(numero?: string | null): string | null {
  if (!numero) return null
  const soloDigitos = String(numero).replace(/\D/g, '')
  if (!soloDigitos) return null
  if (soloDigitos.length === 9 && soloDigitos.startsWith('9')) {
    return `51${soloDigitos}`
  }
  if (soloDigitos.length === 11 && soloDigitos.startsWith('51')) {
    return soloDigitos
  }
  return soloDigitos
}

/**
 * Formatea el número para visualización amigable: +51 987 654 321
 */
export function formatearWhatsApp(numero?: string | null): string {
  if (!numero) return 'Sin registrar'
  const norm = normalizarWhatsApp(numero)
  if (norm && norm.length === 11 && norm.startsWith('51')) {
    return `+51 ${norm.slice(2, 5)} ${norm.slice(5, 8)} ${norm.slice(8)}`
  }
  return numero || 'Sin registrar'
}

export const estudianteService = {
  /**
   * Obtiene la lista completa de estudiantes ordenados por apellidos y nombres
   */
  async getAll(): Promise<{ data: Estudiante[]; error: string | null; tableMissing?: boolean }> {
    if (!isSupabaseConfigured()) {
      return { data: [], error: 'Supabase no está configurado.' }
    }

    try {
      const { data, error } = await supabase
        .from('estudiantes')
        .select('*')
        .order('apellidos', { ascending: true })

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist') || error.code === 'PGRST205') {
          return {
            data: [],
            error: 'La tabla "estudiantes" no existe aún en tu base de datos Supabase. Ejecuta el script SQL en el SQL Editor de Supabase.',
            tableMissing: true,
          }
        }
        return { data: [], error: error.message }
      }

      return { data: (data as Estudiante[]) || [], error: null }
    } catch (err: unknown) {
      return { data: [], error: err instanceof Error ? err.message : 'Error inesperado al conectar con Supabase' }
    }
  },

  /**
   * Registra un nuevo estudiante en Supabase con generación automática de código
   */
  async create(input: CreateEstudianteInput): Promise<{ data: Estudiante | null; error: string | null }> {
    if (!isSupabaseConfigured()) {
      return { data: null, error: 'Supabase no está configurado.' }
    }

    try {
      const grado = input.grado.trim()
      const seccion = input.seccion.trim().toUpperCase()
      const numOrden = input.numero_orden !== undefined && input.numero_orden !== null ? Number(input.numero_orden) : null
      const codEstudiante = input.codigo_estudiante || generarCodigoEstudiante(grado, seccion, numOrden)
      const whatsappNorm = normalizarWhatsApp(input.apoderado_whatsapp)

      const payload: Record<string, unknown> = {
        nombres: input.nombres.trim(),
        apellidos: input.apellidos.trim(),
        grado,
        seccion,
        foto_url: input.foto_url || null,
        apoderado_nombre: input.apoderado_nombre?.trim() || null,
        apoderado_whatsapp: whatsappNorm,
        activo: input.activo !== undefined ? input.activo : true,
      }

      if (numOrden !== null) payload.numero_orden = numOrden
      if (codEstudiante) payload.codigo_estudiante = codEstudiante

      const { data, error } = await supabase
        .from('estudiantes')
        .insert([payload])
        .select()
        .single()

      if (error) {
        if (error.code === '23505' || error.message.includes('codigo_estudiante')) {
          return { data: null, error: `Ya existe un estudiante con el código "${codEstudiante}". Revisa el grado, sección y número de orden.` }
        }
        return { data: null, error: error.message }
      }

      return { data: data as Estudiante, error: null }
    } catch (err: unknown) {
      return { data: null, error: err instanceof Error ? err.message : 'Error al registrar estudiante' }
    }
  },

  /**
   * Actualiza los datos de un estudiante
   */
  async update(input: UpdateEstudianteInput): Promise<{ data: Estudiante | null; error: string | null }> {
    if (!isSupabaseConfigured()) {
      return { data: null, error: 'Supabase no está configurado.' }
    }

    try {
      const payload: Record<string, unknown> = {}
      if (input.nombres !== undefined) payload.nombres = input.nombres.trim()
      if (input.apellidos !== undefined) payload.apellidos = input.apellidos.trim()
      if (input.grado !== undefined) payload.grado = input.grado.trim()
      if (input.seccion !== undefined) payload.seccion = input.seccion.trim().toUpperCase()
      if (input.foto_url !== undefined) payload.foto_url = input.foto_url || null
      if (input.apoderado_nombre !== undefined) payload.apoderado_nombre = input.apoderado_nombre?.trim() || null
      if (input.apoderado_whatsapp !== undefined) payload.apoderado_whatsapp = normalizarWhatsApp(input.apoderado_whatsapp)
      if (input.activo !== undefined) payload.activo = input.activo

      if (input.numero_orden !== undefined) {
        payload.numero_orden = input.numero_orden !== null ? Number(input.numero_orden) : null
      }

      // Si cambian grado, sección o número de orden, regenerar código
      if (input.grado || input.seccion || input.numero_orden !== undefined) {
        const grado = input.grado || ''
        const seccion = input.seccion || ''
        const numOrden = input.numero_orden
        if (grado && seccion) {
          payload.codigo_estudiante = input.codigo_estudiante || generarCodigoEstudiante(grado, seccion, numOrden)
        }
      }

      const { data, error } = await supabase
        .from('estudiantes')
        .update(payload)
        .eq('id', input.id)
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message }
      }

      return { data: data as Estudiante, error: null }
    } catch (err: unknown) {
      return { data: null, error: err instanceof Error ? err.message : 'Error al actualizar estudiante' }
    }
  },

  /**
   * Inserta o actualiza en bloque una nómina de estudiantes (desde Excel).
   * NO borra los estudiantes existentes en la tabla; preserva intactos a los demás.
   */
  async bulkCreateOrUpdate(
    estudiantesList: CreateEstudianteInput[]
  ): Promise<BulkImportResult> {
    if (!isSupabaseConfigured()) {
      return { count: 0, nuevos: 0, actualizados: 0, error: 'Supabase no está configurado.' }
    }

    try {
      const records = estudiantesList.map((item) => {
        const grado = item.grado.trim()
        const seccion = item.seccion.trim().toUpperCase()
        const numOrden =
          item.numero_orden !== undefined && item.numero_orden !== null && item.numero_orden > 0
            ? Number(item.numero_orden)
            : null
        const cod = item.codigo_estudiante || generarCodigoEstudiante(grado, seccion, numOrden)
        const whatsappNorm = normalizarWhatsApp(item.apoderado_whatsapp)

        return {
          nombres: item.nombres.trim(),
          apellidos: item.apellidos.trim(),
          grado,
          seccion,
          numero_orden: numOrden,
          codigo_estudiante: cod,
          foto_url: item.foto_url || null,
          apoderado_nombre: item.apoderado_nombre?.trim() || null,
          apoderado_whatsapp: whatsappNorm,
          activo: item.activo !== undefined ? item.activo : true,
        }
      })

      // 1. Identificar cuántos ya existen para desglosar nuevos vs actualizados
      const codigos = records.map((r) => r.codigo_estudiante).filter(Boolean) as string[]
      let actualizadosCount = 0

      if (codigos.length > 0) {
        const { data: existingRows } = await supabase
          .from('estudiantes')
          .select('codigo_estudiante')
          .in('codigo_estudiante', codigos)

        const existingSet = new Set(existingRows?.map((e) => e.codigo_estudiante) || [])
        actualizadosCount = records.filter((r) => r.codigo_estudiante && existingSet.has(r.codigo_estudiante)).length
      }

      const nuevosCount = records.length - actualizadosCount

      // 2. Guardar en Supabase usando upsert (onConflict: codigo_estudiante)
      // Nunca ejecuta DELETE ni borra a los estudiantes de otros salones
      const { data, error } = await supabase
        .from('estudiantes')
        .upsert(records, { onConflict: 'codigo_estudiante', ignoreDuplicates: false })
        .select('id')

      if (error) {
        // Fallback si aún no se ha ejecutado la restricción UNIQUE en Supabase
        const { data: insertData, error: insertError } = await supabase
          .from('estudiantes')
          .insert(records)
          .select('id')

        if (insertError) {
          return { count: 0, nuevos: 0, actualizados: 0, error: insertError.message }
        }
        return {
          count: insertData?.length || records.length,
          nuevos: insertData?.length || records.length,
          actualizados: 0,
          error: null,
        }
      }

      return {
        count: data?.length || records.length,
        nuevos: nuevosCount,
        actualizados: actualizadosCount,
        error: null,
      }
    } catch (err: unknown) {
      return {
        count: 0,
        nuevos: 0,
        actualizados: 0,
        error: err instanceof Error ? err.message : 'Error inesperado al importar estudiantes en bloque',
      }
    }
  },

  /**
   * Elimina un estudiante individual
   */
  async delete(id: string): Promise<{ success: boolean; error: string | null }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase no está configurado.' }
    }

    try {
      const { error } = await supabase
        .from('estudiantes')
        .delete()
        .eq('id', id)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Error al eliminar estudiante' }
    }
  },
}
