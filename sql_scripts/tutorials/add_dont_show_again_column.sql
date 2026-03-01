-- Script de migración para agregar el campo dont_show_again
-- Si la tabla ya existe, ejecuta este script para agregar el nuevo campo

-- Agregar columna si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_tutorials' 
        AND column_name = 'dont_show_again'
    ) THEN
        ALTER TABLE user_tutorials 
        ADD COLUMN dont_show_again BOOLEAN NOT NULL DEFAULT false;
        
        COMMENT ON COLUMN user_tutorials.dont_show_again IS 'Indica si el usuario marcó "no volver a mostrar" este tutorial';
        
        RAISE NOTICE 'Columna dont_show_again agregada exitosamente';
    ELSE
        RAISE NOTICE 'La columna dont_show_again ya existe';
    END IF;
END $$;

