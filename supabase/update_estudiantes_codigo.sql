-- ==============================================================================
-- SIRECE — I.E. Juan Pablo Viscardo y Guzmán
-- Actualización de tabla estudiantes: numero_orden y codigo_estudiante
-- ==============================================================================

-- 1. Agregar las nuevas columnas si no existen
ALTER TABLE public.estudiantes ADD COLUMN IF NOT EXISTS numero_orden INTEGER;
ALTER TABLE public.estudiantes ADD COLUMN IF NOT EXISTS codigo_estudiante TEXT;

-- 2. Restricción de unicidad en codigo_estudiante para permitir inserción o actualización (upsert)
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

-- 3. Si existen registros previos sin código, generarlo automáticamente (ej. 3A1)
UPDATE public.estudiantes
SET codigo_estudiante = REGEXP_REPLACE(grado, '[^0-9]', '', 'g') || UPPER(TRIM(seccion)) || COALESCE(numero_orden::text, '1')
WHERE codigo_estudiante IS NULL OR codigo_estudiante = '';

-- 4. Permisos de tabla
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.estudiantes TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 5. Forzar la recarga inmediata de la caché de PostgREST
NOTIFY pgrst, 'reload schema';
