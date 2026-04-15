-- sql_scripts/ensure_institutions_structure.sql
-- Script para asegurar la estructura de instituciones y su integración con usuarios

-- 1. Crear tabla institutions si no existe
CREATE TABLE IF NOT EXISTS public.institutions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  logo_url TEXT,
  website VARCHAR(255),
  email VARCHAR(255), -- Usar 'email' en lugar de 'contact_email' para compatibilidad
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Agregar columnas faltantes si la tabla ya existe
DO $$
BEGIN
  -- Agregar logo_url si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'institutions' 
    AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE public.institutions ADD COLUMN logo_url TEXT;
  END IF;

  -- Agregar website si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'institutions' 
    AND column_name = 'website'
  ) THEN
    ALTER TABLE public.institutions ADD COLUMN website VARCHAR(255);
  END IF;

  -- Agregar email si no existe (verificar si existe contact_email primero)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'institutions' 
    AND column_name = 'email'
  ) THEN
    -- Si existe contact_email, renombrarlo a email
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'institutions' 
      AND column_name = 'contact_email'
    ) THEN
      ALTER TABLE public.institutions RENAME COLUMN contact_email TO email;
    ELSE
      ALTER TABLE public.institutions ADD COLUMN email VARCHAR(255);
    END IF;
  END IF;

  -- Agregar address si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'institutions' 
    AND column_name = 'address'
  ) THEN
    ALTER TABLE public.institutions ADD COLUMN address TEXT;
  END IF;

  -- Agregar is_active si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'institutions' 
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.institutions ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;

  -- Agregar updated_at si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'institutions' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.institutions ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
  END IF;
END $$;

-- 3. Crear tabla user_institutions si no existe
CREATE TABLE IF NOT EXISTS public.user_institutions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  institution_id INTEGER REFERENCES public.institutions(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  position VARCHAR(100), -- cargo o posición del usuario en la institución
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, institution_id)
);

-- Asegurar que todas las columnas existan (por si la tabla ya existía sin algunas columnas)
DO $$
BEGIN
  -- Agregar columna position si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_institutions' 
    AND column_name = 'position'
  ) THEN
    ALTER TABLE public.user_institutions ADD COLUMN position VARCHAR(100);
    RAISE NOTICE 'Columna position agregada a user_institutions';
  END IF;

  -- Agregar columna joined_at si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_institutions' 
    AND column_name = 'joined_at'
  ) THEN
    ALTER TABLE public.user_institutions ADD COLUMN joined_at TIMESTAMP DEFAULT NOW();
    RAISE NOTICE 'Columna joined_at agregada a user_institutions';
  END IF;

  -- Agregar columna is_primary si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_institutions' 
    AND column_name = 'is_primary'
  ) THEN
    ALTER TABLE public.user_institutions ADD COLUMN is_primary BOOLEAN DEFAULT false;
    RAISE NOTICE 'Columna is_primary agregada a user_institutions';
  END IF;
END $$;

-- Asegurar que la foreign key tiene el nombre correcto para Supabase
DO $$
BEGIN
  -- Si la foreign key no existe o tiene otro nombre, crearla/renombrarla
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_institutions_user_id_fkey' 
    AND conrelid = 'public.user_institutions'::regclass
  ) THEN
    -- Eliminar constraint existente si tiene otro nombre
    ALTER TABLE public.user_institutions 
    DROP CONSTRAINT IF EXISTS user_institutions_user_id_fkey;
    
    -- Crear la foreign key con el nombre correcto
    ALTER TABLE public.user_institutions
    ADD CONSTRAINT user_institutions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_user_institutions_user ON public.user_institutions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_institutions_institution ON public.user_institutions(institution_id);
CREATE INDEX IF NOT EXISTS idx_user_institutions_primary ON public.user_institutions(user_id, is_primary) WHERE is_primary = true;

-- 5. Asegurar que courses tiene institution_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'courses' 
    AND column_name = 'institution_id'
  ) THEN
    ALTER TABLE public.courses ADD COLUMN institution_id INTEGER REFERENCES public.institutions(id);
    CREATE INDEX IF NOT EXISTS idx_courses_institution ON public.courses(institution_id);
  END IF;
END $$;

-- 6. Políticas RLS para institutions
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

-- Permitir lectura a todos los usuarios autenticados
DROP POLICY IF EXISTS "institutions_read_all" ON public.institutions;
CREATE POLICY "institutions_read_all" ON public.institutions
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Permitir a administradores gestionar instituciones
DROP POLICY IF EXISTS "institutions_admin_all" ON public.institutions;
CREATE POLICY "institutions_admin_all" ON public.institutions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name IN ('admin', 'coordinator')
    )
  );

-- 7. Políticas RLS para user_institutions
ALTER TABLE public.user_institutions ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden ver sus propias asignaciones
DROP POLICY IF EXISTS "user_institutions_own_read" ON public.user_institutions;
CREATE POLICY "user_institutions_own_read" ON public.user_institutions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Administradores pueden ver y gestionar todas las asignaciones
DROP POLICY IF EXISTS "user_institutions_admin_all" ON public.user_institutions;
CREATE POLICY "user_institutions_admin_all" ON public.user_institutions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid() AND r.name IN ('admin', 'coordinator')
    )
  );

-- 8. Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_institutions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_institutions_updated_at ON public.institutions;
CREATE TRIGGER trigger_update_institutions_updated_at
  BEFORE UPDATE ON public.institutions
  FOR EACH ROW
  EXECUTE FUNCTION update_institutions_updated_at();

-- 9. Insertar institución por defecto (opcional)
INSERT INTO public.institutions (name, description, is_active)
VALUES ('EduSpark', 'Plataforma educativa inteligente', true)
ON CONFLICT DO NOTHING;

