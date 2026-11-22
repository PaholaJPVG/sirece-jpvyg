import { supabase, isSupabaseConfigured } from './supabase'
import type { PersonalInstitucional, CargoPersonal } from '@/types'

export interface CreatePersonalInput {
  nombres: string
  apellidos: string
  rol: CargoPersonal
  usuario: string
  password_acceso: string
  activo?: boolean
}

export interface UpdatePersonalInput {
  id: string
  nombres?: string
  apellidos?: string
  rol?: CargoPersonal
  usuario?: string
  password_acceso?: string
  activo?: boolean
}

export const personalService = {
  /**
   * Obtiene la lista de profesores y auxiliares desde Supabase
   */
  async getAll(): Promise<{ data: PersonalInstitucional[]; error: string | null; tableMissing?: boolean }> {
    if (!isSupabaseConfigured()) {
      return { data: [], error: 'Supabase no está configurado.' }
    }

    try {
      const { data, error } = await supabase
        .from('personal')
        .select('id, nombres, apellidos, rol, usuario, activo, created_at, updated_at')
        .order('apellidos', { ascending: true })

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist') || error.code === 'PGRST205') {
          return {
            data: [],
            error: 'La tabla "personal" no existe o se está actualizando. Ejecuta el nuevo script SQL en el SQL Editor de Supabase.',
            tableMissing: true,
          }
        }
        return { data: [], error: error.message }
      }

      return { data: (data as PersonalInstitucional[]) || [], error: null }
    } catch (err: unknown) {
      return { data: [], error: err instanceof Error ? err.message : 'Error inesperado al conectar con Supabase' }
    }
  },

  /**
   * Registra un nuevo profesor o auxiliar con usuario y contraseña de acceso
   */
  async create(input: CreatePersonalInput): Promise<{ data: PersonalInstitucional | null; error: string | null }> {
    if (!isSupabaseConfigured()) {
      return { data: null, error: 'Supabase no está configurado.' }
    }

    try {
      const { data, error } = await supabase
        .from('personal')
        .insert([
          {
            nombres: input.nombres.trim(),
            apellidos: input.apellidos.trim(),
            rol: input.rol,
            usuario: input.usuario.trim().toLowerCase(),
            password_acceso: input.password_acceso.trim(),
            activo: input.activo !== undefined ? input.activo : true,
          },
        ])
        .select('id, nombres, apellidos, rol, usuario, activo, created_at, updated_at')
        .single()

      if (error) {
        if (error.code === '23505' || error.message.includes('usuario')) {
          return { data: null, error: `El nombre de usuario "${input.usuario}" ya está en uso. Elige otro.` }
        }
        return { data: null, error: error.message }
      }

      return { data: data as PersonalInstitucional, error: null }
    } catch (err: unknown) {
      return { data: null, error: err instanceof Error ? err.message : 'Error al registrar personal' }
    }
  },

  /**
   * Actualiza los datos de un profesor o auxiliar
   */
  async update(input: UpdatePersonalInput): Promise<{ data: PersonalInstitucional | null; error: string | null }> {
    if (!isSupabaseConfigured()) {
      return { data: null, error: 'Supabase no está configurado.' }
    }

    try {
      const payload: Record<string, unknown> = {}
      if (input.nombres !== undefined) payload.nombres = input.nombres.trim()
      if (input.apellidos !== undefined) payload.apellidos = input.apellidos.trim()
      if (input.rol !== undefined) payload.rol = input.rol
      if (input.usuario !== undefined) payload.usuario = input.usuario.trim().toLowerCase()
      if (input.password_acceso && input.password_acceso.trim()) {
        payload.password_acceso = input.password_acceso.trim()
      }
      if (input.activo !== undefined) payload.activo = input.activo

      const { data, error } = await supabase
        .from('personal')
        .update(payload)
        .eq('id', input.id)
        .select('id, nombres, apellidos, rol, usuario, activo, created_at, updated_at')
        .single()

      if (error) {
        if (error.code === '23505' || error.message.includes('usuario')) {
          return { data: null, error: 'El nombre de usuario ingresado ya pertenece a otro miembro del personal.' }
        }
        return { data: null, error: error.message }
      }

      return { data: data as PersonalInstitucional, error: null }
    } catch (err: unknown) {
      return { data: null, error: err instanceof Error ? err.message : 'Error al actualizar personal' }
    }
  },

  /**
   * Elimina un registro de personal
   */
  async delete(id: string): Promise<{ success: boolean; error: string | null }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase no está configurado.' }
    }

    try {
      const { error } = await supabase
        .from('personal')
        .delete()
        .eq('id', id)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, error: null }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Error al eliminar personal' }
    }
  },
}
