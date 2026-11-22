-- ==============================================================================
-- SIRECE — I.E. Juan Pablo Viscardo y Guzmán
-- TABLA: incidencias (Faltas Leves y Notificaciones WhatsApp)
-- ==============================================================================

-- 1. Habilitar extensión para UUIDs si no existiera
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Eliminar tabla previa para crear estructura limpia
DROP TABLE IF EXISTS public.incidencias CASCADE;

-- 3. Crear tabla incidencias con las especificaciones exactas
CREATE TABLE public.incidencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estudiante_id UUID NOT NULL REFERENCES public.estudiantes(id) ON DELETE CASCADE,
  personal_id UUID REFERENCES public.personal(id) ON DELETE SET NULL,
  tipo_falta TEXT NOT NULL,
  descripcion TEXT,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  hora TEXT NOT NULL DEFAULT to_char(now(), 'HH24:MI'),
  notificado_whatsapp BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Índices para agilizar búsquedas y reportes cronológicos
CREATE INDEX IF NOT EXISTS idx_incidencias_estudiante ON public.incidencias(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_fecha ON public.incidencias(fecha);

-- 5. PERMISOS DE TABLA (Resuelve error 42501 permission denied)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.incidencias TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 6. Configuración de Row Level Security (RLS) abierta para desarrollo
ALTER TABLE public.incidencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "incidencias_anon_policy" ON public.incidencias;
DROP POLICY IF EXISTS "incidencias_auth_policy" ON public.incidencias;

CREATE POLICY "incidencias_anon_policy" ON public.incidencias
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "incidencias_auth_policy" ON public.incidencias
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Forzar la recarga inmediata de la caché de PostgREST en Supabase
NOTIFY pgrst, 'reload schema';
