-- =====================================================
-- ASIGNAR ADMIN A EDUSPARK PLATFORM (ID 5)
-- =====================================================

-- 1. Corregir el nombre si tiene typo
UPDATE institutions 
SET name = 'EduSpark Platform', slug = 'eduspark-platform'
WHERE id = 5;

-- 2. Asignar admin y crear landing config
DO $$
DECLARE
    v_eduspark_id INTEGER := 5; -- ID fijo de EduSpark Platform
    v_admin_user_id UUID;
BEGIN
    RAISE NOTICE 'Usando institución ID: %', v_eduspark_id;
    
    -- Asignar el usuario admin a EduSpark Platform
    SELECT u.id INTO v_admin_user_id
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE r.name = 'admin'
    LIMIT 1;
    
    IF v_admin_user_id IS NOT NULL THEN
        -- Insertar o actualizar la relación usuario-institución
        INSERT INTO user_institutions (user_id, institution_id, is_primary, created_at)
        VALUES (v_admin_user_id, v_eduspark_id, true, NOW())
        ON CONFLICT (user_id, institution_id) DO UPDATE SET
            is_primary = true;
            
        RAISE NOTICE 'Usuario admin % asignado a EduSpark Platform', v_admin_user_id;
    END IF;
    
    -- Crear configuración de landing page (si no existe)
    INSERT INTO institution_landing_config (
        institution_id,
        brand_name,
        hero_title,
        hero_subtitle,
        hero_button_text,
        philosophy_title,
        philosophy_content,
        notification_text,
        notification_enabled,
        primary_color,
        secondary_color,
        gallery_title,
        gallery_description,
        gallery_images,
        featured_students,
        created_at,
        updated_at
    )
    SELECT
        v_eduspark_id,
        'EduSpark Platform',
        'Aprende sin Límites con IA',
        'Plataforma educativa potenciada por inteligencia artificial',
        'Ver Cursos Disponibles',
        'Nuestra Filosofía',
        'En EduSpark creemos que la educación debe ser accesible y personalizada.',
        '🎓 ¡Bienvenido a EduSpark Platform!',
        true,
        '#6366f1',
        '#3b82f6',
        'Nuestra Plataforma',
        'Tecnología educativa de vanguardia',
        '[]'::jsonb,
        '[]'::jsonb,
        NOW(),
        NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM institution_landing_config WHERE institution_id = v_eduspark_id
    );
    
    RAISE NOTICE '✅ Configuración completada';
END $$;

-- 3. Verificar resultado
SELECT 
    i.id,
    i.name as institution,
    i.slug,
    lc.brand_name,
    lc.hero_title
FROM institutions i
LEFT JOIN institution_landing_config lc ON lc.institution_id = i.id
WHERE i.id = 5;
