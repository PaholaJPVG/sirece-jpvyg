-- ==============================================================================
-- SIRECE — I.E. Juan Pablo Viscardo y Guzmán
-- Actualización limpia y segura de la tabla personal (sin DROP TABLE)
-- Compatible 100% con los campos que usa el código de Personal.tsx y personalService.ts
-- ==============================================================================

-- 1. Habilitar extensión para UUIDs si no existiera
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Crear la tabla si no existe
CREATE TABLE IF NOT EXISTS public.personal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombres VARCHAR(100) NOT NULL DEFAULT '',
  apellidos VARCHAR(100) NOT NULL DEFAULT '',
  rol VARCHAR(20) NOT NULL DEFAULT 'profesor',
  usuario VARCHAR(50),
  password_acceso VARCHAR(255),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Asegurar que todas las columnas que usa el código existan
ALTER TABLE public.personal ADD COLUMN IF NOT EXISTS nombres VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE public.personal ADD COLUMN IF NOT EXISTS apellidos VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE public.personal ADD COLUMN IF NOT EXISTS rol VARCHAR(20) NOT NULL DEFAULT 'profesor';
ALTER TABLE public.personal ADD COLUMN IF NOT EXISTS usuario VARCHAR(50);
ALTER TABLE public.personal ADD COLUMN IF NOT EXISTS password_acceso VARCHAR(255);
ALTER TABLE public.personal ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.personal ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.personal ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 4. Si la tabla tenía columnas anteriores con restricción NOT NULL (como email o dni), liberarlas
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'personal' AND column_name = 'email') THEN
    ALTER TABLE public.personal ALTER COLUMN email DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'personal' AND column_name = 'dni') THEN
    ALTER TABLE public.personal ALTER COLUMN dni DROP NOT NULL;
  END IF;
END $$;

-- 5. Restricción de unicidad en usuario
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'personal_usuario_unique'
  ) THEN
    ALTER TABLE public.personal ADD CONSTRAINT personal_usuario_unique UNIQUE (usuario);
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- 6. Validar que el rol solo permita 'profesor' o 'auxiliar'
ALTER TABLE public.personal DROP CONSTRAINT IF EXISTS personal_rol_check;
ALTER TABLE public.personal ADD CONSTRAINT personal_rol_check CHECK (rol IN ('profesor', 'auxiliar'));

-- 7. PERMISOS FUNDAMENTALES (soluciona el error 42501 permission denied)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.personal TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 8. Configuración de Row Level Security (RLS)
ALTER TABLE public.personal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "personal_anon_policy" ON public.personal;
DROP POLICY IF EXISTS "personal_auth_policy" ON public.personal;

CREATE POLICY "personal_anon_policy" ON public.personal
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "personal_auth_policy" ON public.personal
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 9. Forzar la recarga inmediata del schema cache en Supabase PostgREST
NOTIFY pgrst, 'reload schema';
