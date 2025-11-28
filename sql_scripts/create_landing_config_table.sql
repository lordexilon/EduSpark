-- Create institution_landing_config table
-- This table stores customizable landing page configuration for each institution

CREATE TABLE IF NOT EXISTS institution_landing_config (
    id SERIAL PRIMARY KEY,
    institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    
    -- Branding
    brand_name TEXT NOT NULL,
    logo_url TEXT,
    
    -- Hero Section
    hero_title TEXT NOT NULL,
    hero_subtitle TEXT NOT NULL,
    hero_image_url TEXT,
    hero_button_text TEXT DEFAULT 'Ver Cursos Disponibles',
    
    -- Philosophy/Nosotros Section
    philosophy_title TEXT DEFAULT 'Nuestra Filosofía',
    philosophy_content TEXT,
    
    -- Notification Bar
    notification_text TEXT,
    notification_enabled BOOLEAN DEFAULT true,
    
    -- Colors
    primary_color TEXT DEFAULT '#2563eb',
    secondary_color TEXT DEFAULT '#1e40af',
    
    -- Gallery Images (array of objects with url and caption)
    gallery_images JSONB DEFAULT '[]'::jsonb,
    
    -- Featured Students (array of objects with name, career, place, image)
    featured_students JSONB DEFAULT '[]'::jsonb,
    
    -- Contact Information
    contact_email TEXT,
    contact_phone TEXT,
    contact_whatsapp TEXT,
    contact_address TEXT,
    
    -- Google Calendar
    calendar_embed_url TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one config per institution
    UNIQUE(institution_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_landing_config_institution 
ON institution_landing_config(institution_id);

-- Enable RLS
ALTER TABLE institution_landing_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin can view all landing configs" ON institution_landing_config;
DROP POLICY IF EXISTS "Admin can insert landing configs" ON institution_landing_config;
DROP POLICY IF EXISTS "Admin can update all landing configs" ON institution_landing_config;
DROP POLICY IF EXISTS "Admin can delete landing configs" ON institution_landing_config;
DROP POLICY IF EXISTS "Admin-campus can view own institution landing config" ON institution_landing_config;
DROP POLICY IF EXISTS "Admin-campus can update own institution landing config" ON institution_landing_config;

-- Admin policies (full access)
CREATE POLICY "Admin can view all landing configs"
ON institution_landing_config FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        JOIN roles ON users.role_id = roles.id
        WHERE users.id = auth.uid()
        AND roles.name = 'admin'
    )
);

CREATE POLICY "Admin can insert landing configs"
ON institution_landing_config FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users
        JOIN roles ON users.role_id = roles.id
        WHERE users.id = auth.uid()
        AND roles.name = 'admin'
    )
);

CREATE POLICY "Admin can update all landing configs"
ON institution_landing_config FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        JOIN roles ON users.role_id = roles.id
        WHERE users.id = auth.uid()
        AND roles.name = 'admin'
    )
);

CREATE POLICY "Admin can delete landing configs"
ON institution_landing_config FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        JOIN roles ON users.role_id = roles.id
        WHERE users.id = auth.uid()
        AND roles.name = 'admin'
    )
);

-- Admin-campus policies (own institution only)
CREATE POLICY "Admin-campus can view own institution landing config"
ON institution_landing_config FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        JOIN roles ON users.role_id = roles.id
        JOIN user_institutions ON users.id = user_institutions.user_id
        WHERE users.id = auth.uid()
        AND roles.name = 'admin-campus'
        AND user_institutions.institution_id = institution_landing_config.institution_id
    )
);

CREATE POLICY "Admin-campus can update own institution landing config"
ON institution_landing_config FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        JOIN roles ON users.role_id = roles.id
        JOIN user_institutions ON users.id = user_institutions.user_id
        WHERE users.id = auth.uid()
        AND roles.name = 'admin-campus'
        AND user_institutions.institution_id = institution_landing_config.institution_id
    )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_landing_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_landing_config_timestamp ON institution_landing_config;
CREATE TRIGGER update_landing_config_timestamp
    BEFORE UPDATE ON institution_landing_config
    FOR EACH ROW
    EXECUTE FUNCTION update_landing_config_updated_at();

-- Insert default configuration for CEC (assuming institution with slug 'cec' exists)
INSERT INTO institution_landing_config (
    institution_id,
    brand_name,
    hero_title,
    hero_subtitle,
    hero_image_url,
    philosophy_title,
    philosophy_content,
    notification_text,
    gallery_images,
    featured_students
)
SELECT 
    id,
    'CEC',
    'Tu puente a la Medicina: UCA y CONAREM.',
    'Formamos al Puesto 1. Excelencia académica 100% presencial con calidad humana.',
    'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?q=80&w=2069&auto=format&fit=crop',
    'Nuestra Filosofía: El Poder de lo Presencial',
    'En un mundo cada vez más digital, en CEC reafirmamos nuestra convicción en el valor insustituible de la educación presencial, entendiendo que la modalidad a distancia es su complemento perfecto. Creemos que el aprendizaje va más allá de la simple transmisión de información; se trata de la interacción humana, el debate cara a cara y el apoyo mutuo que surge en un aula, respaldado por recursos digitales siempre a tu alcance.

Fomentamos un ambiente de estudio sano, libre de toxicidad, donde cada estudiante es conocido por su nombre. Ofrecemos acompañamiento emocional y espiritual constante, porque entendemos que el bienestar personal es la base del éxito académico. En CEC, no solo te preparamos para un examen, te formamos para los desafíos de la vida.',
    '¡Inscripciones abiertas para el ciclo 2025! Asegura tu lugar hoy mismo.',
    '[
        {"url": "https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=2086&auto=format&fit=crop", "caption": "Aulas Climatizadas"},
        {"url": "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=2070&auto=format&fit=crop", "caption": "Espacios de Estudio"},
        {"url": "https://images.unsplash.com/photo-1571260899304-425eee4c7efc?q=80&w=2070&auto=format&fit=crop", "caption": "Áreas de Relax"},
        {"url": "https://images.unsplash.com/photo-1523580494863-6f3031224c94?q=80&w=2070&auto=format&fit=crop", "caption": "Encuentros y Comunidad"}
    ]'::jsonb,
    '[
        {"name": "María González", "career": "Medicina UNA", "place": "Puesto 1", "image": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=2070&auto=format&fit=crop"},
        {"name": "Juan Pérez", "career": "Medicina UCA", "place": "Puesto 3", "image": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1974&auto=format&fit=crop"},
        {"name": "Sofía Martínez", "career": "Medicina UNA", "place": "Puesto 5", "image": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1974&auto=format&fit=crop"},
        {"name": "Lucas Ramírez", "career": "Medicina UCA", "place": "Ingresante", "image": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1974&auto=format&fit=crop"}
    ]'::jsonb
FROM institutions
WHERE name = 'CEC'
ON CONFLICT (institution_id) DO NOTHING;
