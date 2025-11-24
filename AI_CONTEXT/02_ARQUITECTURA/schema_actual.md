# Schema Actual de la Base de Datos - EduSpark

## 📊 Resumen del Sistema

**Estado:** ✅ **COMPLETAMENTE FUNCIONAL**
**Fecha de actualización:** Noviembre 2025 (Mapeo Completo desde Base de Datos)
**Versión:** 4.0 - Esquema Completo Mapeado desde Base de Datos

**Estadísticas del Esquema:**
- **Total de Tablas:** 29
- **Total de Políticas RLS:** 73
- **Total de Funciones:** 131 (incluye funciones del sistema pgvector)
- **Total de Triggers:** 10

**Tipos de Primary Keys:**
- **UUID:** 18 tablas (usuarios, contenido dinámico, transacciones)
- **INTEGER/SERIAL:** 9 tablas (entidades de referencia: roles, careers, subjects, courses)
- **BIGINT:** 1 tabla (`course_modules` - tiene inconsistencia de tipo)
- Ver `TIPOS_ID_TABLAS.md` para detalles completos

## 🗄️ Estructura de Base de Datos

### Tabla: `roles`
```sql
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Datos iniciales:**
- `1` - `student` - Estudiante
- `2` - `teacher` - Docente
- `3` - `admin` - Administrador del sistema
- `4` - `coordinator` - Coordinador académico

**⚠️ IMPORTANTE - Mapeo de Roles:**
Todos los usuarios nuevos se crean SIEMPRE como estudiantes (role_id: 1). 
El rol solo puede ser cambiado DESPUÉS del registro por un administrador.

### Tabla: `users`
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role_id INTEGER REFERENCES roles(id),
    identity_document VARCHAR(50) UNIQUE, -- ⭐ Documento de identidad único
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Campos importantes:**
- `identity_document`: Documento de identidad único (DNI, cédula, pasaporte, etc.) ⭐ NUEVO
  - **Único e irrepetible:** Constraint `users_identity_document_unique` garantiza que no haya duplicados
  - **Uso crítico:** Utilizado en importación masiva y suspender/activar usuarios
  - **Índices:** 
    - `users_identity_document_unique` (índice único automático del constraint)
    - `idx_users_identity_document` (índice parcial para valores no nulos)
  - **Opcional:** Puede ser NULL (usuarios existentes pueden no tener documento registrado)

**Foreign Keys:**
- `role_id` REFERENCES `roles(id)`

**Unique Constraints:**
- `email` - Email único del usuario
- `identity_document` - Documento de identidad único ⭐ NUEVO

**Índices:**
- `idx_users_identity_document` en `identity_document` (parcial, solo valores no nulos) ⭐ NUEVO

### Tabla: `courses`
```sql
CREATE TABLE courses (
    id INTEGER PRIMARY KEY DEFAULT nextval('courses_id_seq'),
    title VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    description TEXT,
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
    instructor_id UUID REFERENCES users(id),
    institution_id INTEGER REFERENCES institutions(id),
    status VARCHAR(20) DEFAULT 'draft',
    subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    academic_period VARCHAR(50),
    start_date DATE,
    end_date DATE,
    schedule JSONB DEFAULT '[]'::jsonb,
    max_students INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
```

**Foreign Keys:**
- `teacher_id` REFERENCES `users(id)` ON DELETE CASCADE
- `institution_id` REFERENCES `institutions(id)`
- `subject_id` REFERENCES `subjects(id)` ON DELETE SET NULL

**Unique Constraints:**
- `code` - Código único del curso

**Índices:**
- `idx_courses_teacher` en `teacher_id`
- `idx_courses_subject` en `subject_id`
- `idx_courses_period` en `academic_period`

### Tabla: `course_modules`
```sql
CREATE TABLE course_modules (
    id BIGINT PRIMARY KEY DEFAULT nextval('course_modules_id_seq'),
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

**⚠️ INCONSISTENCIA DE TIPO DETECTADA:**
- `course_modules.course_id` es `BIGINT` pero `courses.id` es `INTEGER`
- Esto puede causar problemas en las foreign keys
- **Solución:** Ver script `sql_scripts/75_fix_course_modules_type.sql`

**Foreign Keys:**
- `course_id` REFERENCES `courses(id)` ON DELETE CASCADE (⚠️ tipo no coincide)

**Índices:**
- `idx_course_modules_course_id` en `course_id`

### Tabla: `course_units` (Unidades/Lecciones del Curso)
```sql
CREATE TABLE course_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    number INT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    -- Campos de contenido rico (agregados en script 31)
    content_html TEXT,
    content_markdown TEXT,
    learning_objectives TEXT[], -- Array de objetivos de aprendizaje
    duration_hours DECIMAL(5,2),
    order_index INTEGER,
    thumbnail_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Índices:**
- `idx_course_units_course` en `course_id`
- `idx_course_units_order` en `(course_id, order_index)`

**Comentarios:**
- `content_html`: Contenido didáctico en formato HTML (permite imágenes, videos, formato enriquecido)
- `content_markdown`: Contenido didáctico en formato Markdown (alternativa al HTML)
- `learning_objectives`: Objetivos de aprendizaje de la unidad (array de textos)
- `order_index`: Orden de visualización (permite reordenar sin cambiar number)

### Tabla: `sessions` (Sesiones/Clases Individuales)
```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES course_units(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    description TEXT,
    -- Campos de contenido rico (agregados en script 31)
    content_html TEXT,
    content_markdown TEXT,
    learning_objectives TEXT[], -- Array de objetivos específicos de la sesión
    activities JSONB DEFAULT '[]'::jsonb, -- Actividades (ejercicios, prácticas, evaluaciones)
    resources JSONB DEFAULT '[]'::jsonb, -- Recursos multimedia (videos, imágenes, enlaces)
    duration_minutes INTEGER,
    order_index INTEGER,
    session_type VARCHAR(50) DEFAULT 'lecture', -- lecture, practice, lab, exam, discussion, etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Índices:**
- `idx_sessions_course_unit` en `(course_id, unit_id)`
- `idx_sessions_order` en `(unit_id, order_index)` WHERE unit_id IS NOT NULL
- `idx_sessions_type` en `session_type`

**Comentarios:**
- `content_html`: Contenido didáctico de la sesión en formato HTML
- `activities`: Actividades de la sesión en formato JSON (ejercicios, prácticas, evaluaciones)
- `resources`: Recursos multimedia en formato JSON (videos, imágenes, enlaces)

### Tabla: `materials` (Materiales de Curso)
```sql
CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES course_units(id) ON DELETE SET NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    kind TEXT NOT NULL, -- markdown | pdf | link | video | other
    url TEXT,
    mime_type TEXT,
    size_bytes BIGINT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Índices:**
- `idx_materials_rel` en `(course_id, unit_id, session_id)`

### Tabla: `course_materials`
```sql
CREATE TABLE course_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    module_id BIGINT REFERENCES course_modules(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    type VARCHAR(50) DEFAULT 'material',
    difficulty VARCHAR(20) DEFAULT 'intermediate',
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    file_url TEXT,
    source_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Foreign Keys:**
- `course_id` REFERENCES `courses(id)` ON DELETE CASCADE
- `module_id` REFERENCES `course_modules(id)` ON DELETE SET NULL

**Índices:**
- `idx_course_materials_course_id` en `course_id`
- `idx_course_materials_module_id` en `module_id`
- `idx_course_materials_type` en `type`
- `idx_course_materials_difficulty` en `difficulty`
- `idx_course_materials_active` en `is_active`

### Tabla: `enrollments`
```sql
CREATE TABLE enrollments (
    id INTEGER PRIMARY KEY,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    enrollment_date TIMESTAMP,
    status VARCHAR(20),
    grade NUMERIC,
    role TEXT,
    user_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 🎓 FASE 1: ESTRUCTURA ACADÉMICA BASE (Implementada)

### Tabla: `careers` (Carreras/Programas Académicos)
```sql
CREATE TABLE careers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    coordinator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    duration_months INTEGER DEFAULT 48,
    total_credits INTEGER DEFAULT 0,
    degree_type VARCHAR(50) DEFAULT 'bachelor',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_duration CHECK (duration_months > 0),
    CONSTRAINT valid_credits CHECK (total_credits >= 0)
);
```

**Índices:**
- `idx_careers_coordinator` en `coordinator_id`
- `idx_careers_active` en `is_active`
- `idx_careers_code` en `code`

### Tabla: `subjects` (Materias/Disciplinas)
```sql
CREATE TABLE subjects (
    id SERIAL PRIMARY KEY,
    career_id INTEGER REFERENCES careers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    credits INTEGER DEFAULT 0,
    hours_per_week INTEGER DEFAULT 0,
    semester INTEGER,
    prerequisite_subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
    is_core BOOLEAN DEFAULT true,
    difficulty_level VARCHAR(20) DEFAULT 'intermediate',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(career_id, code),
    CONSTRAINT valid_semester CHECK (semester IS NULL OR (semester >= 1 AND semester <= 20)),
    CONSTRAINT valid_credits CHECK (credits >= 0),
    CONSTRAINT valid_hours CHECK (hours_per_week >= 0)
);
```

**Índices:**
- `idx_subjects_career` en `career_id`
- `idx_subjects_prerequisite` en `prerequisite_subject_id`
- `idx_subjects_semester` en `(career_id, semester)`

### Tabla: `career_enrollments` (Matriculación en Carreras)
```sql
CREATE TABLE career_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    career_id INTEGER NOT NULL REFERENCES careers(id) ON DELETE CASCADE,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'active',
    graduation_date DATE,
    current_semester INTEGER DEFAULT 1,
    total_credits_earned INTEGER DEFAULT 0,
    gpa DECIMAL(4,2),
    academic_status VARCHAR(50) DEFAULT 'normal',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(student_id, career_id),
    CONSTRAINT valid_semester CHECK (current_semester >= 1),
    CONSTRAINT valid_credits CHECK (total_credits_earned >= 0),
    CONSTRAINT valid_gpa CHECK (gpa IS NULL OR (gpa >= 0 AND gpa <= 10))
);
```

**Índices:**
- `idx_career_enrollments_student` en `student_id`
- `idx_career_enrollments_career` en `career_id`
- `idx_career_enrollments_status` en `status`

### Tabla: `course_enrollments` (Inscripción en Cursos)
```sql
CREATE TABLE course_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'active',
    final_grade DECIMAL(5,2),
    letter_grade VARCHAR(5),
    attendance_percentage DECIMAL(5,2) DEFAULT 0,
    participation_score DECIMAL(5,2) DEFAULT 0,
    completion_percentage DECIMAL(5,2) DEFAULT 0,
    time_spent_minutes INTEGER DEFAULT 0,
    last_access_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(student_id, course_id),
    CONSTRAINT valid_final_grade CHECK (final_grade IS NULL OR (final_grade >= 0 AND final_grade <= 100)),
    CONSTRAINT valid_percentage CHECK (
        attendance_percentage >= 0 AND attendance_percentage <= 100 AND
        participation_score >= 0 AND participation_score <= 100 AND
        completion_percentage >= 0 AND completion_percentage <= 100
    ),
    CONSTRAINT valid_time CHECK (time_spent_minutes >= 0)
);
```

**Índices:**
- `idx_course_enrollments_student` en `student_id`
- `idx_course_enrollments_course` en `course_id`
- `idx_course_enrollments_status` en `status`

### Tabla: `subject_assignments` (Asignación Docente-Materia)
```sql
CREATE TABLE subject_assignments (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    academic_period VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(subject_id, teacher_id, academic_period),
    CONSTRAINT valid_dates CHECK (end_date >= start_date)
);
```

**Índices:**
- `idx_subject_assignments_subject` en `subject_id`
- `idx_subject_assignments_teacher` en `teacher_id`
- `idx_subject_assignments_period` en `academic_period`

## 🔐 Políticas de Seguridad (RLS)

### Políticas para `roles`:
- **"Allow public read access to roles"** - Permite lectura pública de roles (necesario para registro)

### Políticas para `users`:
- **"Allow user registration"** - Permite inserción de nuevos usuarios
- **"Allow authenticated read users"** - Permite lectura a usuarios autenticados
- **"Users can update own profile"** - Permite actualización de perfil propio

### Políticas para Fase 1 (Estructura Académica):

#### Tabla `careers`:
- **"coordinators_manage_own_careers"** (ALL) - Coordinadores y admin pueden gestionar sus carreras
- **"everyone_reads_active_careers"** (SELECT) - Todos pueden leer carreras activas

#### Tabla `subjects`:
- **"coordinators_manage_subjects"** (ALL) - Coordinadores y admin pueden gestionar materias de sus carreras
- **"everyone_reads_subjects"** (SELECT) - Todos pueden leer materias

#### Tabla `career_enrollments`:
- **"students_view_own_career_enrollments"** (SELECT) - Estudiantes ven sus propias matriculaciones
- **"coordinators_view_career_enrollments"** (SELECT) - Coordinadores ven matriculaciones de sus carreras
- **"students_enroll_in_careers"** (INSERT) - Estudiantes pueden matricularse en carreras

#### Tabla `course_enrollments`:
- **"students_view_own_enrollments"** (SELECT) - Estudiantes ven sus propias inscripciones
- **"teachers_view_course_enrollments"** (SELECT) - Docentes ven inscripciones de sus cursos
- **"admins_view_all_enrollments"** (SELECT) - Admins y coordinadores ven todas las inscripciones
- **"students_enroll_in_courses"** (INSERT) - Estudiantes pueden inscribirse en cursos
- **"teachers_update_course_enrollments"** (UPDATE) - Docentes pueden actualizar inscripciones de sus cursos

#### Tabla `subject_assignments`:
- **"coordinators_manage_assignments"** (ALL) - Coordinadores y admin pueden gestionar asignaciones
- **"teachers_view_own_assignments"** (SELECT) - Docentes ven sus propias asignaciones

**Total de políticas implementadas:** 73 políticas RLS en total

**Funciones Helper de RLS:**
- `is_admin()` - Verifica si el usuario es administrador
- `is_admin_or_coordinator()` - Verifica si el usuario es admin o coordinador
- `is_admin_or_teacher()` - Verifica si el usuario es admin o profesor
- `is_teacher()` - Verifica si el usuario es profesor
- `student_is_enrolled_in_course(p_student_id, p_course_id)` - Verifica si un estudiante está inscrito (SECURITY DEFINER para evitar recursión)

## 🔄 Triggers y Funciones

### Función: `handle_new_user()`
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, role_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    COALESCE((new.raw_user_meta_data->>'role_id')::integer, 1) -- Default: student (ID: 1)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Trigger: `on_auth_user_created`
```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

### Función: `update_updated_at_column()`
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Triggers para `updated_at`:
- `trigger_careers_updated_at` - Actualiza `updated_at` en `careers`
- `trigger_subjects_updated_at` - Actualiza `updated_at` en `subjects`
- `trigger_career_enrollments_updated_at` - Actualiza `updated_at` en `career_enrollments`
- `trigger_course_enrollments_updated_at` - Actualiza `updated_at` en `course_enrollments`
- `trigger_course_units_updated_at` - Actualiza `updated_at` en `course_units`
- `trigger_subject_assignments_updated_at` - Actualiza `updated_at` en `subject_assignments`
- `update_roles_updated_at` - Actualiza `updated_at` en `roles`
- `update_users_updated_at` - Actualiza `updated_at` en `users`
- `trg_set_updated_at_course_modules` - Actualiza `updated_at` en `course_modules`
- `update_course_grading_weights_timestamp` - Actualiza `updated_at` en `course_grading_weights`

**Total de Triggers:** 10 triggers implementados

### Función RPC: `update_unit_learning_objectives`
```sql
CREATE OR REPLACE FUNCTION public.update_unit_learning_objectives(
  unit_id UUID,
  objectives TEXT[]
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  learning_objectives TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar que el usuario tenga permiso para actualizar esta unidad
  -- (pertenece a un curso del profesor autenticado o es admin)
  IF NOT EXISTS (
    SELECT 1
    FROM public.course_units cu_inner
    INNER JOIN public.courses c_inner ON c_inner.id = cu_inner.course_id
    WHERE cu_inner.id = unit_id
      AND (
        c_inner.teacher_id = auth.uid()
        OR public.is_admin()
      )
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para actualizar esta unidad o la unidad no existe';
  END IF;

  -- Actualizar learning_objectives y devolver los datos actualizados
  RETURN QUERY
  UPDATE public.course_units cu_update
  SET learning_objectives = objectives,
      updated_at = NOW()
  WHERE cu_update.id = unit_id
  RETURNING cu_update.id, cu_update.title, cu_update.learning_objectives;
END;
$$;
```

**Propósito:**
- Actualiza el array `learning_objectives` de una unidad evitando problemas de serialización del cliente JS
- Maneja el array `TEXT[]` directamente en PostgreSQL
- Verifica permisos RLS usando `auth.uid()` del usuario autenticado
- Utiliza `SECURITY DEFINER` para ejecutar con permisos del creador (admin)

**Permisos:**
- `GRANT EXECUTE ON FUNCTION public.update_unit_learning_objectives TO authenticated;`

### Funciones RPC Adicionales:

**`match_course_chunks`** - Búsqueda de fragmentos de contenido:
```sql
FUNCTION match_course_chunks(
    query_embedding vector,
    p_course_id text,
    match_threshold double precision,
    match_count integer
) RETURNS TABLE(id uuid, course_id text, content text, similarity double precision)
```

**`search_course_content_chunks`** - Búsqueda optimizada de contenido:
```sql
FUNCTION search_course_content_chunks(
    query_embedding vector,
    p_course_id text,
    match_count integer
) RETURNS TABLE(id uuid, content text, similarity double precision)
```

**`create_user_profile`** - Creación de perfil de usuario:
```sql
FUNCTION create_user_profile(
    p_user_id uuid,
    p_email text,
    p_first_name text,
    p_last_name text,
    p_role_id integer DEFAULT 3
) RETURNS TABLE(...)
```

**`admin_change_user_password`** - Cambio de contraseña por administrador:
```sql
FUNCTION admin_change_user_password(
    p_user_id uuid,
    p_new_password text
) RETURNS TABLE(success boolean, message text)
```

**`admin_confirm_user_email`** - Confirmación de email por administrador:
```sql
FUNCTION admin_confirm_user_email(
    p_user_id uuid
) RETURNS TABLE(id uuid, email text, email_confirmed_at timestamptz, status text)
```

**Nota:** La base de datos incluye 130 funciones en total, incluyendo funciones del sistema pgvector para búsqueda semántica y operaciones con embeddings vectoriales.

## 🚀 Estado de Funcionalidades

### ✅ Completamente Funcional:
- **Autenticación** - Login y registro
- **Sistema de roles** - Asignación automática
- **Interfaz de usuario** - Diseño moderno y responsive
- **Base de datos** - Estructura completa y optimizada

### 🔧 Configuración Actual:
- **Supabase Auth** - Habilitado con confirmación de email
- **Row Level Security** - Configurado y funcionando
- **Triggers automáticos** - Sincronización de usuarios
- **Políticas de seguridad** - Implementadas correctamente

## 📝 Notas Importantes

1. **Confirmación de email:** Actualmente habilitada en Supabase
2. **Sincronización:** Los usuarios se sincronizan automáticamente entre `auth.users` y `public.users`
3. **Roles por defecto:** Los nuevos usuarios se asignan como "student" (ID: 1)
4. **Seguridad:** RLS habilitado con políticas específicas para cada operación

## 📋 Resumen de Tablas

**Tablas Existentes:**
- ✅ `roles` - Roles del sistema (admin, teacher, student)
- ✅ `users` - Usuarios del sistema
- ✅ `courses` - Cursos (con nuevas columnas de Fase 1)
- ✅ `course_modules` - Módulos de curso
- ✅ `course_materials` - Materiales de curso
- ✅ `enrollments` - Inscripciones (tabla original)

**Tablas de Contenido Didáctico:**
- ✅ `course_units` - Unidades/lecciones del curso (con contenido rico: HTML, Markdown, learning_objectives)
- ✅ `sessions` - Sesiones/clases individuales (con contenido rico: HTML, actividades JSONB, recursos JSONB)
- ✅ `materials` - Materiales de curso (vinculados a unidades y sesiones)

**Tablas Fase 1 (Nuevas):**
- ✅ `careers` - Carreras/programas académicos
- ✅ `subjects` - Materias/disciplinas
- ✅ `career_enrollments` - Matriculación en carreras
- ✅ `course_enrollments` - Inscripción en cursos (estructura mejorada)
- ✅ `subject_assignments` - Asignación docente-materia

**Tablas de Evaluación:**
- ✅ `assignments` - Tareas/Asignaciones de cursos
- ✅ `assignment_submissions` - Entregas de estudiantes
- ✅ `assessments` - Evaluaciones (quizzes, trivias, exámenes)
- ✅ `questions` - Preguntas de evaluaciones
- ✅ `assessment_attempts` - Intentos de estudiantes en evaluaciones
- ✅ `question_responses` - Respuestas de estudiantes a preguntas
- ✅ `course_grading_weights` - Ponderación de evaluaciones por curso ⭐ NUEVA

**Total de Tablas:** 29

**Tablas Adicionales Identificadas:**
- ✅ `assignment_submissions` - Entregas de estudiantes para tareas
- ✅ `assignments` - Tareas/Asignaciones de cursos
- ✅ `assessments` - Evaluaciones (quizzes, trivias, exámenes)
- ✅ `questions` - Preguntas de evaluaciones
- ✅ `assessment_attempts` - Intentos de estudiantes en evaluaciones
- ✅ `question_responses` - Respuestas de estudiantes a preguntas
- ✅ `chunks` - Fragmentos de contenido para RAG
- ✅ `course_content_chunks` - Fragmentos de contenido de cursos
- ✅ `course_grading_scales` - Escalas de calificación por curso
- ✅ `course_grading_weights` - Ponderación de evaluaciones por curso ⭐ NUEVA
- ✅ `course_images` - Imágenes asociadas a cursos
- ✅ `course_pedagogical_settings` - Configuraciones pedagógicas por curso
- ✅ `institutions` - Instituciones educativas
- ✅ `role_permissions` - Permisos por rol
- ✅ `search_course_content_chunks` - Fragmentos de búsqueda para RAG
- ✅ `student_learning_profiles` - Perfiles de aprendizaje de estudiantes
- ✅ `tutor_conversations` - Conversaciones con tutor virtual
- ✅ `tutor_messages` - Mensajes en conversaciones del tutor
- ✅ `user_institutions` - Relación usuarios-instituciones
- ✅ `vw_admin_course_overview` - Vista administrativa de cursos
- ✅ `vw_admin_modules_by_teacher` - Vista de módulos por profesor

## 📋 Tablas Adicionales del Sistema

### Tabla: `assignments` (Tareas/Asignaciones)
```sql
CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES course_units(id) ON DELETE SET NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_at TIMESTAMPTZ,
    max_points DECIMAL(5,2) DEFAULT 100,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Foreign Keys:**
- `course_id` REFERENCES `courses(id)` ON DELETE CASCADE
- `unit_id` REFERENCES `course_units(id)` ON DELETE SET NULL
- `session_id` REFERENCES `sessions(id)` ON DELETE SET NULL

**Índices:**
- `idx_assignments_rel` en `(course_id, unit_id, session_id)`

### Tabla: `assignment_submissions` (Entregas de Estudiantes)
```sql
CREATE TABLE assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    url TEXT,
    text TEXT,
    grade DECIMAL(5,2),
    feedback TEXT
);
```

**Foreign Keys:**
- `assignment_id` REFERENCES `assignments(id)` ON DELETE CASCADE
- `student_id` REFERENCES `users(id)` ON DELETE CASCADE

**Índices:**
- `idx_submissions_assignment_student` en `(assignment_id, student_id)`

### Tabla: `course_grading_scales` (Escalas de Calificación)
```sql
CREATE TABLE course_grading_scales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    scale_name VARCHAR(100) NOT NULL,
    scale_type VARCHAR(20) DEFAULT 'percentage',
    min_score DECIMAL(5,2) DEFAULT 0,
    max_score DECIMAL(5,2) DEFAULT 100,
    passing_score DECIMAL(5,2) DEFAULT 60,
    grade_scale JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Foreign Keys:**
- `course_id` REFERENCES `courses(id)` ON DELETE CASCADE

**Unique Constraints:**
- `course_id` (un solo scale por curso)

### Tabla: `course_grading_weights` (Ponderación de Evaluaciones) ⭐ NUEVA
```sql
CREATE TABLE course_grading_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  
  -- Ponderaciones por tipo de evaluación (en porcentaje)
  quizzes_weight DECIMAL(5,2) DEFAULT 30.00,  -- Quizzes, trivias, tareas
  exam1_weight DECIMAL(5,2) DEFAULT 20.00,    -- Primer examen
  exam2_weight DECIMAL(5,2) DEFAULT 20.00,    -- Segundo examen
  final_exam_weight DECIMAL(5,2) DEFAULT 30.00, -- Examen final
  
  -- Configuración adicional
  allow_custom_weights BOOLEAN DEFAULT true,   -- Permitir modificar ponderaciones
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(course_id),
  CONSTRAINT weights_sum_check CHECK (
    ABS((quizzes_weight + exam1_weight + exam2_weight + final_exam_weight) - 100.00) < 0.01
  )
);
```

**Foreign Keys:**
- `course_id` REFERENCES `courses(id)` ON DELETE CASCADE

**Unique Constraints:**
- `course_id` (una configuración de ponderación por curso)

**Check Constraints:**
- `weights_sum_check` - La suma de todas las ponderaciones debe ser exactamente 100%

**Índices:**
- `idx_course_grading_weights_course_id` en `course_id`

**Comentarios:**
- `quizzes_weight`: Porcentaje que representan quizzes, trivias y tareas (30% por defecto)
- `exam1_weight`: Porcentaje del primer examen (20% por defecto)
- `exam2_weight`: Porcentaje del segundo examen (20% por defecto)
- `final_exam_weight`: Porcentaje del examen final (30% por defecto)
- Permite a docentes/coordinadores configurar cómo se calcula la nota final del curso

**Políticas RLS:**
- **"Teachers can manage grading weights for their courses"** (ALL) - Docentes pueden gestionar ponderaciones de sus cursos
- **"Coordinators and admins can manage all grading weights"** (ALL) - Coordinadores y admins pueden gestionar todas las ponderaciones
- **"Students can view grading weights for their courses"** (SELECT) - Estudiantes pueden ver ponderaciones de sus cursos

**Triggers:**
- `update_course_grading_weights_timestamp` - Actualiza `updated_at` automáticamente

### Tabla: `course_images` (Imágenes de Cursos)
```sql
CREATE TABLE course_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text VARCHAR(255),
    image_type VARCHAR(50) DEFAULT 'content',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

**Foreign Keys:**
- `course_id` REFERENCES `courses(id)` ON DELETE CASCADE

### Tabla: `course_pedagogical_settings` (Configuraciones Pedagógicas)
```sql
CREATE TABLE course_pedagogical_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    learning_style VARCHAR(50) DEFAULT 'visual',
    difficulty_level VARCHAR(20) DEFAULT 'intermediate',
    teaching_approach VARCHAR(50) DEFAULT 'constructivist',
    assessment_method VARCHAR(50) DEFAULT 'formative',
    feedback_frequency VARCHAR(20) DEFAULT 'immediate',
    interaction_style VARCHAR(50) DEFAULT 'collaborative',
    teaching_style TEXT,
    feedback_type TEXT,
    focus_area TEXT,
    voice_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Foreign Keys:**
- `course_id` REFERENCES `courses(id)` ON DELETE CASCADE

**Unique Constraints:**
- `course_id` (una configuración por curso)

### Tabla: `student_learning_profiles` (Perfiles de Aprendizaje)
```sql
CREATE TABLE student_learning_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    preferred_learning_style VARCHAR(50) DEFAULT 'visual',
    difficulty_preference VARCHAR(20) DEFAULT 'intermediate',
    interaction_preference VARCHAR(50) DEFAULT 'collaborative',
    feedback_preference VARCHAR(20) DEFAULT 'immediate',
    topics_struggled TEXT[] DEFAULT '{}',
    topics_mastered TEXT[] DEFAULT '{}',
    interaction_count INTEGER DEFAULT 0,
    avg_session_duration INTEGER DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Foreign Keys:**
- `student_id` REFERENCES `users(id)` ON DELETE CASCADE
- `course_id` REFERENCES `courses(id)` ON DELETE CASCADE

**Unique Constraints:**
- `(student_id, course_id)` - Un perfil por estudiante-curso

**Índices:**
- `idx_student_profiles_student_course` en `(student_id, course_id)`
- `idx_student_profiles_course_id` en `course_id`
- `idx_student_profiles_student_id` en `student_id`

### Tabla: `institutions` (Instituciones Educativas)
```sql
CREATE TABLE institutions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);
```

### Tabla: `user_institutions` (Relación Usuarios-Instituciones)
```sql
CREATE TABLE user_institutions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    institution_id INTEGER REFERENCES institutions(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT now()
);
```

**Foreign Keys:**
- `user_id` REFERENCES `users(id)`
- `institution_id` REFERENCES `institutions(id)` ON DELETE CASCADE

**Unique Constraints:**
- `(user_id, institution_id)` - Un registro por usuario-institución

### Tabla: `tutor_conversations` (Conversaciones del Tutor Virtual)
```sql
CREATE TABLE tutor_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'Nueva conversación',
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Foreign Keys:**
- `student_id` REFERENCES `users(id)` ON DELETE CASCADE
- `course_id` REFERENCES `courses(id)` ON DELETE CASCADE

**Índices:**
- `idx_tutor_conversations_student_id` en `student_id`
- `idx_tutor_conversations_course_id` en `course_id`

### Tabla: `tutor_messages` (Mensajes del Tutor)
```sql
CREATE TABLE tutor_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES tutor_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    audio_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

**Foreign Keys:**
- `conversation_id` REFERENCES `tutor_conversations(id)` ON DELETE CASCADE

**Check Constraints:**
- `role` debe ser 'user', 'assistant', o 'system'

**Índices:**
- `idx_tutor_messages_conversation_id` en `conversation_id`

### Tabla: `chunks` (Fragmentos para RAG)
```sql
CREATE TABLE chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Índices:**
- `chunks_course_id_idx` en `course_id`
- `chunks_embedding_idx` - Índice IVFFlat para búsqueda vectorial

### Tabla: `course_content_chunks` (Fragmentos de Contenido)
```sql
CREATE TABLE course_content_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Índices:**
- `course_content_chunks_course_id_idx` en `course_id`
- `course_content_chunks_embedding_idx` - Índice IVFFlat para búsqueda vectorial

### Tabla: `search_course_content_chunks` (Búsqueda de Fragmentos)
```sql
CREATE TABLE search_course_content_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabla: `role_permissions` (Permisos por Rol)
```sql
CREATE TABLE role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES roles(id),
    permission_id INTEGER,
    created_at TIMESTAMP DEFAULT now()
);
```

**Unique Constraints:**
- `(role_id, permission_id)`

## 📚 Mejoras Recientes (Script 31)

### Contenido Didáctico Rico:
1. ✅ **course_units** - Agregadas columnas:
   - `content_html` - Contenido enriquecido HTML
   - `content_markdown` - Contenido en formato Markdown
   - `learning_objectives` - Array TEXT[] de objetivos de aprendizaje
   - `duration_hours` - Duración estimada
   - `order_index` - Orden de visualización
   - `thumbnail_url` - Imagen representativa
   - `updated_at` - Timestamp de última actualización

2. ✅ **sessions** - Agregadas columnas:
   - `content_html` - Contenido enriquecido HTML
   - `content_markdown` - Contenido en formato Markdown
   - `learning_objectives` - Array TEXT[] de objetivos
   - `activities` - JSONB con actividades (ejercicios, prácticas, evaluaciones)
   - `resources` - JSONB con recursos multimedia (videos, imágenes, enlaces)
   - `duration_minutes` - Duración estimada
   - `order_index` - Orden de visualización
   - `session_type` - Tipo de sesión (lecture, practice, lab, exam, etc.)

3. ✅ **Función RPC** - `update_unit_learning_objectives`:
   - Actualiza arrays TEXT[] evitando problemas de serialización del cliente JS
   - Maneja permisos RLS correctamente
   - Utilizada por el frontend para actualizar objetivos de aprendizaje

## 🔄 Próximos Pasos

1. ✅ **Fase 1 completada** - Estructura académica base implementada
2. ✅ **Contenido Rico implementado** - Soporte para HTML, Markdown, actividades y recursos
3. ✅ **Función RPC creada** - Actualización segura de learning_objectives
4. **Implementar RLS** - Aplicar políticas de seguridad para nuevas tablas
5. **Migración de datos** - Considerar migración de `enrollments` a `course_enrollments`
6. **Agregar rol 'coordinator'** - Si no existe en la tabla `roles`
7. **Implementar funcionalidades** - Gestión de carreras, materias y matriculación