-- ==============================================================================
-- SIRECE — I.E. Juan Pablo Viscardo y Guzmán
-- ETAPA 2: Tablas personal, apoderados, estudiantes + RLS + Triggers
-- ESTRUCTURA ACTUALIZADA: Personal simplificado (Profesor y Auxiliar con Usuario y Contraseña)
-- ==============================================================================

-- 1. Habilitar extensión pgcrypto
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Función para actualizar automáticamente updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- TABLA: personal (Únicamente Profesores y Auxiliares con Usuario y Contraseña)
-- ==============================================================================
DROP TABLE IF EXISTS public.personal CASCADE;

CREATE TABLE public.personal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('profesor', 'auxiliar')),
  usuario VARCHAR(50) UNIQUE NOT NULL,
  password_acceso VARCHAR(255) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_personal_updated_at ON public.personal;
CREATE TRIGGER trg_personal_updated_at
BEFORE UPDATE ON public.personal
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- TABLA: apoderados (Padres, Madres o Tutores Legales)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.apoderados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dni VARCHAR(15) UNIQUE,
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  parentesco VARCHAR(30) NOT NULL DEFAULT 'padre' CHECK (parentesco IN ('padre', 'madre', 'apoderado', 'tutor_legal', 'otro')),
  telefono_whatsapp VARCHAR(25) NOT NULL,
  telefono_secundario VARCHAR(25),
  direccion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_apoderados_updated_at ON public.apoderados;
CREATE TRIGGER trg_apoderados_updated_at
BEFORE UPDATE ON public.apoderados
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- TABLA: estudiantes
-- Código automático por Grado, Sección y Número de Orden (Ej: 1A-01, 3B-04)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.estudiantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(20) UNIQUE,
  dni VARCHAR(15) UNIQUE NOT NULL,
  nombres VARCHAR(100) NOT NULL,
  apellido_paterno VARCHAR(100) NOT NULL,
  apellido_materno VARCHAR(100) NOT NULL,
  grado VARCHAR(10) NOT NULL,
  seccion VARCHAR(5) NOT NULL,
  numero_orden INT,
  apoderado_id UUID REFERENCES public.apoderados(id) ON DELETE SET NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_estudiantes_updated_at ON public.estudiantes;
CREATE TRIGGER trg_estudiantes_updated_at
BEFORE UPDATE ON public.estudiantes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función y Trigger para generar código correlativo automático
CREATE OR REPLACE FUNCTION generar_codigo_estudiante()
RETURNS TRIGGER AS $$
DECLARE
  grado_num TEXT;
  max_orden INT;
BEGIN
  -- Extraer solo dígitos del grado (ej: '1ro' -> '1', '2do' -> '2')
  grado_num := REGEXP_REPLACE(NEW.grado, '[^0-9]', '', 'g');
  IF grado_num IS NULL OR grado_num = '' THEN
    grado_num := UPPER(TRIM(NEW.grado));
  END IF;

  NEW.seccion := UPPER(TRIM(NEW.seccion));

  -- Calcular el siguiente número de orden en ese grado y sección si no fue indicado
  IF NEW.numero_orden IS NULL OR NEW.numero_orden <= 0 THEN
    SELECT COALESCE(MAX(numero_orden), 0) + 1
    INTO max_orden
    FROM public.estudiantes
    WHERE grado = NEW.grado AND UPPER(seccion) = NEW.seccion;
    
    NEW.numero_orden := max_orden;
  END IF;

  -- Generar el código institucional correlativo (Ej: 1A-01, 2B-12)
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := grado_num || NEW.seccion || '-' || LPAD(NEW.numero_orden::text, 2, '0');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generar_codigo_estudiante ON public.estudiantes;
CREATE TRIGGER trg_generar_codigo_estudiante
BEFORE INSERT OR UPDATE ON public.estudiantes
FOR EACH ROW EXECUTE FUNCTION generar_codigo_estudiante();

-- ==============================================================================
-- POLÍTICAS RLS (Row Level Security)
-- ==============================================================================
ALTER TABLE public.personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apoderados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estudiantes ENABLE ROW LEVEL SECURITY;

-- Limpieza de políticas previas
DROP POLICY IF EXISTS "personal_auth_policy" ON public.personal;
DROP POLICY IF EXISTS "personal_anon_policy" ON public.personal;
DROP POLICY IF EXISTS "apoderados_auth_policy" ON public.apoderados;
DROP POLICY IF EXISTS "apoderados_anon_policy" ON public.apoderados;
DROP POLICY IF EXISTS "estudiantes_auth_policy" ON public.estudiantes;
DROP POLICY IF EXISTS "estudiantes_anon_policy" ON public.estudiantes;

-- Políticas para personal: lectura y gestión
CREATE POLICY "personal_auth_policy" ON public.personal
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "personal_anon_policy" ON public.personal
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Políticas para apoderados
CREATE POLICY "apoderados_auth_policy" ON public.apoderados
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "apoderados_anon_policy" ON public.apoderados
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Políticas para estudiantes
CREATE POLICY "estudiantes_auth_policy" ON public.estudiantes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "estudiantes_anon_policy" ON public.estudiantes
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ==============================================================================
-- REGISTROS INICIALES DE PRUEBA (1 PROFESOR Y 1 AUXILIAR)
-- ==============================================================================
INSERT INTO public.personal (nombres, apellidos, rol, usuario, password_acceso, activo)
VALUES 
  ('Juan Carlos', 'García Mendoza', 'profesor', 'jgarcia', '1234', true),
  ('Rosa Elena', 'Flores Ramos', 'auxiliar', 'rflores', '1234', true)
ON CONFLICT (usuario) DO NOTHING;
