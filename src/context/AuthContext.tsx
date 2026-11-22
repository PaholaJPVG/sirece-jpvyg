import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { PersonalInstitucional } from '@/types'

const LOCAL_USER_KEY = 'sirece:auth-personal-user'

interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: PersonalInstitucional | null
  loading: boolean
  signIn: (usuarioOEmail: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<PersonalInstitucional | null>(null)
  const [loading, setLoading] = useState(true)

  // Restaurar usuario autenticado local o por Supabase
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false)
      return
    }

    // 1. Revisar si hay un personal logueado localmente (por usuario/password)
    try {
      const stored = localStorage.getItem(LOCAL_USER_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as PersonalInstitucional
        setProfile(parsed)
      }
    } catch {
      // Ignorar error de parsing
    }

    // 2. Revisar si hay sesión de Supabase Auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        supabase
          .from('personal')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) setProfile(data as PersonalInstitucional)
          })
      }
      setLoading(false)
    })

    // 3. Escuchar cambios de sesión de Supabase Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        supabase
          .from('personal')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) setProfile(data as PersonalInstitucional)
          })
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (usuarioOEmail: string, password: string): Promise<{ error: string | null }> => {
    const term = usuarioOEmail.trim().toLowerCase()

    try {
      // Caso A: Ingreso con nombre de usuario institucional (Profesor o Auxiliar)
      if (!term.includes('@')) {
        const { data, error } = await supabase
          .from('personal')
          .select('*')
          .eq('usuario', term)
          .eq('password_acceso', password.trim())
          .maybeSingle()

        if (error) {
          return { error: 'Error al consultar usuario: ' + error.message }
        }

        if (!data) {
          return { error: 'Usuario o contraseña incorrectos.' }
        }

        if (!data.activo) {
          return { error: 'Este usuario se encuentra deshabilitado en el sistema.' }
        }

        const personalUser = data as PersonalInstitucional
        setProfile(personalUser)
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(personalUser))
        return { error: null }
      }

      // Caso B: Ingreso con correo electrónico a través de Supabase Auth
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
      }

      return { error: null }
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Error inesperado al iniciar sesión' }
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // Ignorar errores de Supabase Auth signOut
    }
    localStorage.removeItem(LOCAL_USER_KEY)
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
        setProfile(data as PersonalInstitucional)
        localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(data))
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
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
