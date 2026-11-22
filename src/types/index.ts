// ─── Tipos globales SIRECE ────────────────────────────────────────────────────

// ── Auth / Usuarios ───────────────────────────────────────────────────────────
export type UserRole = 'director' | 'subdirector' | 'profesor' | 'tutor' | 'auxiliar' | 'admin'

export type CargoPersonal = 'profesor' | 'auxiliar'

export interface PersonalInstitucional {
  id: string
  nombres: string
  apellidos: string
  rol: CargoPersonal
  usuario: string
  password_acceso?: string
  activo: boolean
  created_at?: string
  updated_at?: string
}

export interface AppUser {
  id: string
  email: string
  nombre: string
  apellidos: string
  rol: UserRole
  avatarUrl?: string
  createdAt: string
}

// ── Institución / Grados ──────────────────────────────────────────────────────
export interface Grado {
  id: string
  nombre: string        // e.g. "1ro", "2do", "3ro", "4to", "5to"
  nivel: 'primaria' | 'secundaria'
  secciones: Seccion[]
}

export interface Seccion {
  id: string
  gradoId: string
  nombre: string        // e.g. "A", "B", "C"
  tutorId?: string
}

// ── Estudiantes ───────────────────────────────────────────────────────────────
export type GradoSecundaria = '1ro' | '2do' | '3ro' | '4to' | '5to'
export type SeccionSecundaria = 'A' | 'B' | 'C' | 'D' | 'E'

export interface Estudiante {
  id: string
  nombres: string
  apellidos: string
  grado: string
  seccion: string
  numero_orden?: number | null
  codigo_estudiante?: string | null
  foto_url?: string | null
  apoderado_nombre?: string | null
  apoderado_whatsapp?: string | null
  activo: boolean
  created_at?: string
  updated_at?: string
  dni?: string
  nombreCompleto?: string
}

// ── Tipos de Falta ────────────────────────────────────────────────────────────
export const FALTAS_LEVES_OFICIALES = [
  'Tardanza',
  'Incumplimiento de presentación personal (aseo personal, corte y peinados inadecuados, maquillaje, accesorios piercings, aretes, anillos, cadenas y pulseras)',
  'Descuido en deberes escolares',
  'Interrupción del desarrollo de la clase',
  'Expresiones inadecuadas',
] as const

export type TipoFaltaLeve = typeof FALTAS_LEVES_OFICIALES[number]

export const SUB_OPCIONES_FALTAS: Record<TipoFaltaLeve, string[]> = {
  'Tardanza': [
    'Ingreso fuera de hora',
    'Tardanza reiterada',
    'Sin justificación',
  ],
  'Incumplimiento de presentación personal (aseo personal, corte y peinados inadecuados, maquillaje, accesorios piercings, aretes, anillos, cadenas y pulseras)': [
    'Aseo personal',
    'Corte de cabello inadecuado',
    'Peinado inadecuado',
    'Maquillaje',
    'Piercings, aretes, anillos, cadenas y pulseras',
    'Sin uniforme',
  ],
  'Descuido en deberes escolares': [
    'No trajo tarea',
    'No trajo cuaderno/materiales',
    'No trabajó en clase',
  ],
  'Interrupción del desarrollo de la clase': [
    'Conversa constantemente',
    'Uso de celular sin autorización',
    'Se levanta sin permiso',
    'Desorden en aula',
  ],
  'Expresiones inadecuadas': [
    'Vocabulario soez',
    'Falta de respeto a compañero',
    'Falta de respeto al docente',
  ],
}

export type SeveridadFalta = 'leve' | 'moderada' | 'grave'

export interface TipoFalta {
  id: string
  codigo: string        // e.g. "FL-01"
  descripcion: string
  severidad: SeveridadFalta
  reincidenciaMaxima: number  // número de veces antes de escalar
  activo: boolean
}

// ── Incidencias ───────────────────────────────────────────────────────────────
export interface IncidenciaDB {
  id: string
  estudiante_id: string
  personal_id?: string | null
  tipo_falta: string
  descripcion?: string | null
  fecha: string
  hora: string
  notificado_whatsapp: boolean
  created_at: string
  estudiantes?: Estudiante | null
}

export type EstadoIncidencia = 'pendiente' | 'notificado' | 'atendido' | 'archivado'
export type EstadoNotificacion = 'enviado' | 'entregado' | 'leido' | 'fallido' | 'pendiente'

export interface Incidencia {
  id: string
  estudianteId: string
  estudiante?: Estudiante
  tipoFaltaId: string
  tipoFalta?: TipoFalta
  registradoPorId: string
  registradoPor?: AppUser
  fecha: string         // ISO date
  hora: string          // HH:mm
  descripcion: string
  observaciones?: string
  estado: EstadoIncidencia
  numeroReincidencia: number
  archivoEvidenciaUrl?: string
  createdAt: string
  updatedAt: string
}

// ── Notificaciones WhatsApp ───────────────────────────────────────────────────
export interface NotificacionWhatsapp {
  id: string
  incidenciaId: string
  incidencia?: Incidencia
  destinatarioNumero: string
  destinatarioNombre: string
  mensajeTexto: string
  estado: EstadoNotificacion
  whatsappMessageId?: string    // ID devuelto por la API de WA
  enviadoEn?: string
  errorDetalle?: string
  createdAt: string
}

// ── Configuración ─────────────────────────────────────────────────────────────
export interface ConfiguracionApp {
  id: string
  clave: string
  valor: string
  descripcion: string
  tipo: 'texto' | 'numero' | 'booleano' | 'json'
}

// ── Respuestas API ────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T | null
  error: string | null
  loading: boolean
}

// ── Paginación ────────────────────────────────────────────────────────────────
export interface PaginationParams {
  page: number
  pageSize: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ── Filtros ───────────────────────────────────────────────────────────────────
export interface FiltrosIncidencias {
  estudianteId?: string
  gradoId?: string
  seccionId?: string
  tipoFaltaId?: string
  estado?: EstadoIncidencia
  fechaDesde?: string
  fechaHasta?: string
}

export interface FiltrosEstudiantes {
  gradoId?: string
  seccionId?: string
  busqueda?: string
  activo?: boolean
}
