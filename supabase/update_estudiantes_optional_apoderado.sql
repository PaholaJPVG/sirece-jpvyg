-- ==============================================================================
-- SIRECE — I.E. Juan Pablo Viscardo y Guzmán
-- Actualización de tabla estudiantes:
-- 1. Permitir apoderado_nombre y apoderado_whatsapp como opcionales (DROP NOT NULL)
-- 2. Asegurar columnas numero_orden y codigo_estudiante (TEXT UNIQUE)
-- 3. Habilitar inserción/actualización segura (upsert) sin borrar registros previos
-- ==============================================================================

-- 1. Liberar la obligatoriedad en apoderado_nombre y apoderado_whatsapp
ALTER TABLE public.estudiantes ALTER COLUMN apoderado_nombre DROP NOT NULL;
ALTER TABLE public.estudiantes ALTER COLUMN apoderado_whatsapp DROP NOT NULL;

-- 2. Asegurar que existan las columnas numero_orden y codigo_estudiante
ALTER TABLE public.estudiantes ADD COLUMN IF NOT EXISTS numero_orden INTEGER;
ALTER TABLE public.estudiantes ADD COLUMN IF NOT EXISTS codigo_estudiante TEXT;

-- 3. Asegurar restricción de unicidad en codigo_estudiante para permitir upsert por código
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'estudiantes_codigo_estudiante_unique'
  ) THEN
    ALTER TABLE public.estudiantes ADD CONSTRAINT estudiantes_codigo_estudiante_unique UNIQUE (codigo_estudiante);
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- 4. Si existen registros previos sin código, generarlo automáticamente (ej. 3A1)
UPDATE public.estudiantes
SET codigo_estudiante = REGEXP_REPLACE(grado, '[^0-9]', '', 'g') || UPPER(TRIM(seccion)) || COALESCE(numero_orden::text, '1')
WHERE codigo_estudiante IS NULL OR codigo_estudiante = '';

-- 5. Garantizar permisos completos
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.estudiantes TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 6. Forzar la recarga inmediata de la caché de PostgREST en Supabase
NOTIFY pgrst, 'reload schema';
