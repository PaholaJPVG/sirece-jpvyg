-- ==============================================================================
-- SIRECE — I.E. Juan Pablo Viscardo y Guzmán
-- TABLA: estudiantes
-- Gestión de Estudiantes y Contacto WhatsApp de Apoderados
-- ==============================================================================

-- 1. Habilitar extensión para UUIDs si no existiera
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Eliminar tabla anterior para garantizar estructura 100% limpia
DROP TABLE IF EXISTS public.estudiantes CASCADE;

-- 3. Crear tabla estudiantes con las especificaciones exactas
CREATE TABLE public.estudiantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombres TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  grado TEXT NOT NULL CHECK (grado IN ('1ro', '2do', '3ro', '4to', '5to')),
  seccion TEXT NOT NULL CHECK (seccion IN ('A', 'B', 'C', 'D', 'E')),
  foto_url TEXT,
  apoderado_nombre TEXT NOT NULL,
  apoderado_whatsapp TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Trigger para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_estudiantes_updated_at ON public.estudiantes;
CREATE TRIGGER trg_estudiantes_updated_at
BEFORE UPDATE ON public.estudiantes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. PERMISOS DE TABLA (Resuelve error 42501 permission denied)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.estudiantes TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 6. Configuración de Row Level Security (RLS) abierta para desarrollo
ALTER TABLE public.estudiantes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "estudiantes_anon_policy" ON public.estudiantes;
DROP POLICY IF EXISTS "estudiantes_auth_policy" ON public.estudiantes;

CREATE POLICY "estudiantes_anon_policy" ON public.estudiantes
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "estudiantes_auth_policy" ON public.estudiantes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Forzar la recarga inmediata de la caché de PostgREST en Supabase
NOTIFY pgrst, 'reload schema';

-- 8. (Opcional) Registro de prueba inicial
INSERT INTO public.estudiantes (
  nombres, apellidos, grado, seccion, apoderado_nombre, apoderado_whatsapp, activo
) VALUES (
  'David Alejandro', 'Quispe Mendoza', '3ro', 'A', 'Roberto Quispe Palomino', '51956123456', true
);
