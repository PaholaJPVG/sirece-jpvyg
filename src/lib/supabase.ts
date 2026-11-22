import { createClient } from '@supabase/supabase-js'

// ─── Supabase Client ──────────────────────────────────────────────────────────
// Las credenciales se cargan desde variables de entorno.
// Copia .env.example como .env y completa los valores reales.
// ─────────────────────────────────────────────────────────────────────────────

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || supabaseUrl === 'https://xxxxxxxxxxxxxxxxxxxx.supabase.co') {
  console.warn(
    '[SIRECE] ⚠️  Supabase no está configurado.\n' +
    'Copia .env.example como .env y agrega tu VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder_key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
)

// ─── Helpers de Supabase ──────────────────────────────────────────────────────

/** Verifica si el cliente está correctamente configurado */
export const isSupabaseConfigured = (): boolean => {
  return !!(
    supabaseUrl &&
    supabaseUrl !== 'https://xxxxxxxxxxxxxxxxxxxx.supabase.co' &&
    supabaseAnonKey &&
    supabaseAnonKey !== 'your_supabase_anon_key_here'
  )
}

/** Bucket de Supabase Storage para archivos del sistema */
export const STORAGE_BUCKETS = {
  EVIDENCIAS: 'evidencias-incidencias',
  FOTOS_ESTUDIANTES: 'fotos-estudiantes',
  REPORTES: 'reportes-generados',
} as const
