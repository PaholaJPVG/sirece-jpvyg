import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface AppConfig {
  institucion:     string
  codigoModular:   string
  direccion:       string
  anioAcademico:   string
  periodo:         string
  turno:           string
  correo:          string
}

interface AppConfigContextValue {
  config: AppConfig
  updateConfig: (partial: Partial<AppConfig>) => void
}

// ─── Valores por defecto ──────────────────────────────────────────────────────
const STORAGE_KEY = 'sirece:app-config'

const DEFAULT_CONFIG: AppConfig = {
  institucion:   'I.E. Juan Pablo Viscardo y Guzmán',
  codigoModular: '0801234',
  direccion:     'Av. Principal s/n — Hunter, Arequipa',
  anioAcademico: String(new Date().getFullYear()),
  periodo:       'Noviembre',
  turno:         'manana',
  correo:        'director@jpvyg.edu.pe',
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AppConfigContext = createContext<AppConfigContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AppConfigProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<AppConfig>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(stored) }
      }
    } catch {
      // Si falla la lectura de localStorage, usamos los valores por defecto
    }
    return DEFAULT_CONFIG
  })

  // Persistir cambios en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    } catch {
      // Ignorar errores de escritura en localStorage
    }
  }, [config])

  const updateConfig = (partial: Partial<AppConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }))
  }

  return (
    <AppConfigContext.Provider value={{ config, updateConfig }}>
      {children}
    </AppConfigContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useAppConfig = (): AppConfigContextValue => {
  const ctx = useContext(AppConfigContext)
  if (!ctx) {
    throw new Error('useAppConfig debe usarse dentro de <AppConfigProvider>')
  }
  return ctx
}
