import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { PersonalInstitucional } from '@/types'

export const SIRECE_SESSION_KEY = 'sirece_sesion'
const LEGACY_USER_KEY = 'sirece:auth-personal-user'

/**
 * Formatea el rol institucional para presentación amigable
 * (ej: 'profesor' -> 'Profesor', 'auxiliar' -> 'Auxiliar', 'admin' -> 'Administrador')
 */
export function formatearRol(rol?: string | null): string {
  if (!rol) return 'Docente'
  const low = rol.toLowerCase().trim()
  if (low === 'admin' || low === 'administrador' || low === 'director' || low === 'subdirector') {
    return 'Administrador'
  }
  if (low === 'profesor' || low === 'docente') {
    return 'Profesor'
  }
  if (low === 'auxiliar') {
    return 'Auxiliar'
  }
  if (low === 'tutor') {
    return 'Tutor'
  }
  return rol.charAt(0).toUpperCase() + rol.slice(1).toLowerCase()
}

export interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: PersonalInstitucional | null
  usuarioActivo: PersonalInstitucional | null
  isAuthenticated: boolean
  loading: boolean
  signIn: (usuarioOEmail: string, password: string) => Promise<{ error: string | null; usuario?: PersonalInstitucional }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)

  // Restaurar de manera sincrónica en el primer render para evitar parpadeos en F5
  const [profile, setProfile] = useState<PersonalInstitucional | null>(() => {
    try {
      const stored =
        localStorage.getItem(SIRECE_SESSION_KEY) ||
        localStorage.getItem(LEGACY_USER_KEY)

      if (stored) {
        const parsed = JSON.parse(stored) as PersonalInstitucional
        return parsed
      }
    } catch (err) {
      console.warn('[Auth] Error al restaurar sesión desde localStorage:', err)
    }
    return null
  })

  const [loading, setLoading] = useState(true)

  // Sincronización y validación con Supabase
  useEffect(() => {
    // Si hay un perfil guardado localmente, asegurar persistencia bajo ambas claves
    if (profile) {
      try {
        localStorage.setItem(SIRECE_SESSION_KEY, JSON.stringify(profile))
        localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(profile))
      } catch (e) {
        console.warn('[Auth] No se pudo escribir en localStorage:', e)
      }
    }

    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    // Si tenemos un perfil local, validar en segundo plano que siga activo en la base de datos
    if (profile?.id) {
      supabase
        .from('personal')
        .select('*')
        .eq('id', profile.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (!error && data) {
            if (!data.activo) {
              console.warn('[Auth] El usuario ha sido desactivado en Supabase. Cerrando sesión...')
              signOut()
            } else {
              const updated = data as PersonalInstitucional
              setProfile(updated)
              localStorage.setItem(SIRECE_SESSION_KEY, JSON.stringify(updated))
              localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(updated))
            }
          }
        }, (err) => {
          console.warn('[Auth] Error validando perfil en Supabase:', err)
        })
    }

    // Revisar si hay sesión activa en Supabase Auth (correo/contraseña)
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession)
      setUser(currentSession?.user ?? null)
      if (currentSession?.user && !profile) {
        supabase
          .from('personal')
          .select('*')
          .eq('user_id', currentSession.user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) {
              const p = data as PersonalInstitucional
              setProfile(p)
              localStorage.setItem(SIRECE_SESSION_KEY, JSON.stringify(p))
            }
          })
      }
      setLoading(false)
    })

    // Escuchar cambios de estado en Supabase Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession)
      setUser(currentSession?.user ?? null)
      if (currentSession?.user && !profile) {
        supabase
          .from('personal')
          .select('*')
          .eq('user_id', currentSession.user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) {
              const p = data as PersonalInstitucional
              setProfile(p)
              localStorage.setItem(SIRECE_SESSION_KEY, JSON.stringify(p))
            }
          })
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (
    usuarioOEmail: string,
    password: string
  ): Promise<{ error: string | null; usuario?: PersonalInstitucional }> => {
    const term = usuarioOEmail.trim().toLowerCase()

    try {
      // Caso 1: Ingreso por usuario institucional (ej: portiz, jgarcia, etc.)
      const { data, error } = await supabase
        .from('personal')
        .select('*')
        .ilike('usuario', term)
        .eq('password_acceso', password.trim())
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.warn('[Auth] Consulta en tabla personal:', error)
      }

      if (data) {
        if (!data.activo) {
          return { error: 'Este usuario se encuentra deshabilitado en el sistema.' }
        }

        const personalUser = data as PersonalInstitucional
        setProfile(personalUser)
        localStorage.setItem(SIRECE_SESSION_KEY, JSON.stringify(personalUser))
        localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(personalUser))
        return { error: null, usuario: personalUser }
      }

      // Caso 2: Ingreso con correo electrónico a través de Supabase Auth
      if (term.includes('@')) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: term,
          password,
        })

        if (authError) {
          return { error: authError.message }
        }

        if (authData.user) {
          setUser(authData.user)
          setSession(authData.session)

          // Buscar datos en la tabla personal
          const { data: pData } = await supabase
            .from('personal')
            .select('*')
            .eq('user_id', authData.user.id)
            .maybeSingle()

          const userProfile: PersonalInstitucional = pData
            ? (pData as PersonalInstitucional)
            : {
                id: authData.user.id,
                nombres: authData.user.email?.split('@')[0] || 'Usuario',
                apellidos: '',
                rol: 'profesor',
                usuario: authData.user.email?.split('@')[0] || 'usuario',
                activo: true,
              }

          setProfile(userProfile)
          localStorage.setItem(SIRECE_SESSION_KEY, JSON.stringify(userProfile))
          localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(userProfile))
          return { error: null, usuario: userProfile }
        }
      }

      return { error: 'Usuario o contraseña incorrectos. Verifica tus credenciales.' }
    } catch (err: unknown) {
      return {
        error: err instanceof Error ? err.message : 'Error inesperado al intentar iniciar sesión',
      }
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // Ignorar errores en signOut remoto si la red falla
    }
    localStorage.removeItem(SIRECE_SESSION_KEY)
    localStorage.removeItem(LEGACY_USER_KEY)
    setUser(null)
    setSession(null)
    setProfile(null)
  }

  const refreshProfile = async () => {
    if (profile?.id) {
      const { data } = await supabase
        .from('personal')
        .select('*')
        .eq('id', profile.id)
        .maybeSingle()

      if (data) {
        const updated = data as PersonalInstitucional
        setProfile(updated)
        localStorage.setItem(SIRECE_SESSION_KEY, JSON.stringify(updated))
        localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(updated))
      }
    }
  }

  const isAuthenticated = Boolean(profile || user)

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        usuarioActivo: profile,
        isAuthenticated,
        loading,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth debe ser utilizado dentro de un <AuthProvider>')
  }
  return ctx
}
