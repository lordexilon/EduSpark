-- Script para crear el rol de Supervisor
-- Ejecutar en Supabase SQL Editor

-- 1. Insertar el rol de supervisor si no existe
INSERT INTO roles (name, description)
VALUES ('supervisor', 'Supervisor - Gestiona materiales y monitorea cursos')
ON CONFLICT (name) DO NOTHING;

-- 2. Verificar que el rol fue creado
SELECT * FROM roles WHERE name = 'supervisor';

-- 3. Si ya tienes usuarios que quieres convertir en supervisores, actualiza su role_id:
-- UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'supervisor') WHERE email = 'supervisor@ejemplo.com';

-- 4. Permisos del supervisor (si tienes tabla de permisos):
-- Los supervisores pueden:
-- - Ver y gestionar materiales
-- - Procesar materiales en cursos
-- - Ver dashboard de supervisión (estudiantes, carreras, materias, cronogramas)
-- - Usar Tutor AI
-- - Importación masiva
-- - Suspender/Reactivar usuarios
-- - Ver gestión de pagos
-- - Ver reportes de dispositivos
-- - Ver configuración general, apariencia y sistema

-- Los supervisores NO pueden:
-- - Ver/Crear evaluaciones
-- - Ver calificaciones
-- - Crear cursos
-- - Resetear progreso
-- - Gestionar usuarios (crear/editar/eliminar)

