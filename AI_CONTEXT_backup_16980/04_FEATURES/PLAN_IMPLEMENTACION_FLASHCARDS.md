# 🎴 Plan de Implementación - Flashcards Interactivas

**Fecha:** Enero 2025  
**Estado:** 📋 Plan Técnico Detallado  
**Prioridad:** Alta

---

## 📋 Tabla de Contenidos

1. [Arquitectura General](#arquitectura-general)
2. [Esquema de Base de Datos](#esquema-base-datos)
3. [Estructura de Componentes](#estructura-componentes)
4. [Servicios y APIs](#servicios-apis)
5. [Fases de Implementación](#fases-implementacion)
6. [Scripts SQL](#scripts-sql)
7. [Consideraciones Técnicas](#consideraciones-tecnicas)

---

## 🏗️ Arquitectura General {#arquitectura-general}

### Flujo de Datos

```
Docente crea flashcards
    ↓
Almacenamiento en BD + Supabase Storage (imágenes)
    ↓
Estudiante accede a flashcards del curso
    ↓
Sistema muestra flashcards con Spaced Repetition
    ↓
Estudiante interactúa (sé/no sé)
    ↓
Sistema actualiza progreso y calcula próxima revisión
    ↓
Analytics muestra dominio y estadísticas
```

### Integración con Features Existentes

- **Tutor IA**: Puede sugerir flashcards relevantes
- **Quizzes**: Pueden usar imágenes de flashcards
- **Analytics**: Tracking de dominio de flashcards
- **Tracking**: Progreso de flashcards por estudiante

---

## 🗄️ Esquema de Base de Datos {#esquema-base-datos}

### Tabla: `flashcards`

```sql
CREATE TABLE flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES course_units(id) ON DELETE SET NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    
    -- Contenido del frente
    front_text TEXT,
    front_image_url TEXT, -- URL en Supabase Storage
    front_audio_url TEXT, -- Opcional para futuro
    
    -- Contenido del reverso
    back_text TEXT NOT NULL,
    back_image_url TEXT,
    back_audio_url TEXT, -- Opcional para futuro
    
    -- Metadatos
    title VARCHAR(255), -- Título opcional para organización
    tags TEXT[], -- Tags para categorización
    difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
    
    -- Relaciones
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Configuración
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT false, -- Si otros docentes pueden verla
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_flashcards_course ON flashcards(course_id);
CREATE INDEX idx_flashcards_unit ON flashcards(unit_id);
CREATE INDEX idx_flashcards_created_by ON flashcards(created_by);
CREATE INDEX idx_flashcards_tags ON flashcards USING GIN(tags);
```

### Tabla: `flashcard_progress`

```sql
CREATE TABLE flashcard_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
    
    -- Nivel de dominio (0-5)
    -- 0 = No visto
    -- 1 = Muy difícil
    -- 2 = Difícil
    -- 3 = Regular
    -- 4 = Fácil
    -- 5 = Dominado
    mastery_level INTEGER DEFAULT 0 CHECK (mastery_level BETWEEN 0 AND 5),
    
    -- Estadísticas
    times_studied INTEGER DEFAULT 0,
    times_correct INTEGER DEFAULT 0,
    times_incorrect INTEGER DEFAULT 0,
    
    -- Spaced Repetition (Algoritmo SM-2)
    ease_factor DECIMAL(3, 2) DEFAULT 2.5, -- Factor de facilidad
    interval_days INTEGER DEFAULT 1, -- Días hasta próxima revisión
    repetitions INTEGER DEFAULT 0, -- Número de repeticiones consecutivas correctas
    
    -- Fechas
    last_studied_at TIMESTAMPTZ,
    next_review_at TIMESTAMPTZ, -- Calculado con Spaced Repetition
    last_correct_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint único
    UNIQUE(student_id, flashcard_id)
);

-- Índices
CREATE INDEX idx_flashcard_progress_student ON flashcard_progress(student_id);
CREATE INDEX idx_flashcard_progress_flashcard ON flashcard_progress(flashcard_id);
CREATE INDEX idx_flashcard_progress_next_review ON flashcard_progress(next_review_at);
CREATE INDEX idx_flashcard_progress_mastery ON flashcard_progress(mastery_level);
```

### Tabla: `flashcard_decks` (Opcional - Para agrupar)

```sql
CREATE TABLE flashcard_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES course_units(id) ON DELETE SET NULL,
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de relación muchos-a-muchos
CREATE TABLE flashcard_deck_items (
    deck_id UUID NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
    flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    
    PRIMARY KEY (deck_id, flashcard_id)
);
```

---

## 🎨 Estructura de Componentes {#estructura-componentes}

### Componentes React

```
components/
├── flashcards/
│   ├── FlashcardCard.tsx          # Tarjeta individual (frente/reverso)
│   ├── FlashcardEditor.tsx         # Editor para crear/editar
│   ├── FlashcardList.tsx           # Lista de flashcards
│   ├── FlashcardStudyMode.tsx      # Modo de estudio interactivo
│   ├── FlashcardProgress.tsx      # Indicador de progreso
│   ├── FlashcardStats.tsx          # Estadísticas del estudiante
│   └── ImageUploader.tsx           # Upload de imágenes a Supabase
```

### Páginas

```
pages/
├── FlashcardBuilderPage.tsx        # Página para docentes crear flashcards
├── FlashcardStudyPage.tsx           # Página para estudiantes estudiar
├── FlashcardDeckPage.tsx            # Vista de un deck completo
└── FlashcardAnalyticsPage.tsx       # Analytics para docentes
```

### Servicios

```
services/
├── flashcardService.ts              # CRUD de flashcards
├── flashcardProgressService.ts      # Gestión de progreso y Spaced Repetition
└── flashcardAnalyticsService.ts     # Analytics y estadísticas
```

---

## 🔧 Servicios y APIs {#servicios-apis}

### `services/flashcardService.ts`

```typescript
export interface Flashcard {
  id: string;
  course_id: number;
  unit_id?: string;
  session_id?: string;
  front_text?: string;
  front_image_url?: string;
  back_text: string;
  back_image_url?: string;
  title?: string;
  tags?: string[];
  difficulty_level: number;
  created_by: string;
  is_active: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface FlashcardProgress {
  id: string;
  student_id: string;
  flashcard_id: string;
  mastery_level: number;
  times_studied: number;
  times_correct: number;
  times_incorrect: number;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  last_studied_at?: string;
  next_review_at?: string;
  last_correct_at?: string;
}

// Funciones principales
export async function createFlashcard(flashcard: Omit<Flashcard, 'id' | 'created_at' | 'updated_at'>): Promise<Flashcard>
export async function updateFlashcard(id: string, updates: Partial<Flashcard>): Promise<Flashcard>
export async function deleteFlashcard(id: string): Promise<void>
export async function getFlashcardsByCourse(courseId: number): Promise<Flashcard[]>
export async function getFlashcardsByUnit(unitId: string): Promise<Flashcard[]>
export async function uploadFlashcardImage(file: File, courseId: number): Promise<string>
```

### `services/flashcardProgressService.ts`

```typescript
// Algoritmo Spaced Repetition (SM-2)
export function calculateNextReview(
  quality: number, // 0-5 (0=muy difícil, 5=fácil)
  currentEase: number,
  currentInterval: number,
  currentRepetitions: number
): {
  newEase: number;
  newInterval: number;
  newRepetitions: number;
  nextReviewDate: Date;
}

// Funciones principales
export async function recordFlashcardStudy(
  studentId: string,
  flashcardId: string,
  quality: number // 0-5
): Promise<FlashcardProgress>

export async function getFlashcardsToReview(
  studentId: string,
  courseId?: number
): Promise<Flashcard[]>

export async function getStudentProgress(
  studentId: string,
  courseId?: number
): Promise<{
  total: number;
  mastered: number;
  learning: number;
  new: number;
  dueToday: number;
}>
```

---

## 📅 Fases de Implementación {#fases-implementacion}

### Fase 1: MVP (2-3 semanas)

#### Objetivos:
- ✅ Crear flashcards básicas (texto + imagen)
- ✅ Ver flashcards (frente/reverso)
- ✅ Marcar progreso (sé/no sé)
- ✅ Agrupar por curso/unidad
- ✅ Estadísticas básicas

#### Tareas:

**Semana 1:**
- [ ] Crear script SQL (`103_create_flashcards_system.sql`)
- [ ] Crear tabla `flashcards` y `flashcard_progress`
- [ ] Implementar políticas RLS
- [ ] Crear servicio `flashcardService.ts`
- [ ] Crear servicio `flashcardProgressService.ts` (básico)

**Semana 2:**
- [ ] Crear componente `FlashcardCard.tsx`
- [ ] Crear componente `FlashcardEditor.tsx`
- [ ] Crear página `FlashcardBuilderPage.tsx` (para docentes)
- [ ] Implementar upload de imágenes a Supabase Storage
- [ ] Crear página `FlashcardStudyPage.tsx` (para estudiantes)

**Semana 3:**
- [ ] Integrar con sistema de cursos (agregar enlace en unidades)
- [ ] Crear componente `FlashcardStats.tsx`
- [ ] Agregar ruta en sidebar para docentes
- [ ] Testing y corrección de bugs
- [ ] Documentación básica

#### Entregables:
- ✅ Docentes pueden crear flashcards con imágenes
- ✅ Estudiantes pueden estudiar flashcards
- ✅ Sistema básico de progreso (sé/no sé)
- ✅ Estadísticas básicas

---

### Fase 2: Interactividad (2-3 semanas)

#### Objetivos:
- ✅ Sistema de Spaced Repetition (SM-2)
- ✅ Modos de estudio (baraja, solo difíciles, solo nuevas)
- ✅ Filtros y búsqueda
- ✅ Mejoras visuales

#### Tareas:

**Semana 4:**
- [ ] Implementar algoritmo SM-2 completo
- [ ] Calcular `next_review_at` automáticamente
- [ ] Crear función `getFlashcardsToReview()`
- [ ] Modo "Estudiar Ahora" (solo las que tocan revisar)

**Semana 5:**
- [ ] Modo "Baraja Aleatoria"
- [ ] Modo "Solo Difíciles" (mastery_level < 3)
- [ ] Modo "Solo Nuevas" (mastery_level = 0)
- [ ] Filtros por unidad, tags, dificultad
- [ ] Búsqueda de flashcards

**Semana 6:**
- [ ] Animaciones de flip (frente/reverso)
- [ ] Indicadores visuales de dominio
- [ ] Progreso visual (barra de completitud)
- [ ] Mejoras de UX

#### Entregables:
- ✅ Spaced Repetition funcional
- ✅ Múltiples modos de estudio
- ✅ Filtros y búsqueda
- ✅ UX mejorada

---

### Fase 3: Avanzado (Futuro)

#### Objetivos:
- ✅ Generación automática con IA
- ✅ Audio en flashcards
- ✅ Compartir flashcards entre docentes
- ✅ Competencias y rankings

#### Tareas Futuras:
- [ ] Integración con Tutor IA para generar flashcards
- [ ] Upload y reproducción de audio
- [ ] Sistema de compartir (is_public)
- [ ] Marketplace de flashcards
- [ ] Competencias entre estudiantes
- [ ] Rankings y logros

---

## 📜 Scripts SQL {#scripts-sql}

### `sql_scripts/103_create_flashcards_system.sql`

```sql
-- =====================================================
-- SISTEMA DE FLASHCARDS INTERACTIVAS
-- =====================================================
-- Script: 103_create_flashcards_system.sql
-- Fecha: Enero 2025
-- Descripción: Crea tablas y funciones para sistema de flashcards

-- Tabla de flashcards
CREATE TABLE IF NOT EXISTS flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES course_units(id) ON DELETE SET NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    
    -- Contenido del frente
    front_text TEXT,
    front_image_url TEXT,
    
    -- Contenido del reverso
    back_text TEXT NOT NULL,
    back_image_url TEXT,
    
    -- Metadatos
    title VARCHAR(255),
    tags TEXT[],
    difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
    
    -- Relaciones
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Configuración
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de progreso
CREATE TABLE IF NOT EXISTS flashcard_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
    
    mastery_level INTEGER DEFAULT 0 CHECK (mastery_level BETWEEN 0 AND 5),
    times_studied INTEGER DEFAULT 0,
    times_correct INTEGER DEFAULT 0,
    times_incorrect INTEGER DEFAULT 0,
    
    -- Spaced Repetition (SM-2)
    ease_factor DECIMAL(3, 2) DEFAULT 2.5,
    interval_days INTEGER DEFAULT 1,
    repetitions INTEGER DEFAULT 0,
    
    -- Fechas
    last_studied_at TIMESTAMPTZ,
    next_review_at TIMESTAMPTZ,
    last_correct_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(student_id, flashcard_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_flashcards_course ON flashcards(course_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_unit ON flashcards(unit_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_created_by ON flashcards(created_by);
CREATE INDEX IF NOT EXISTS idx_flashcards_tags ON flashcards USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_flashcard_progress_student ON flashcard_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_progress_flashcard ON flashcard_progress(flashcard_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_progress_next_review ON flashcard_progress(next_review_at);
CREATE INDEX IF NOT EXISTS idx_flashcard_progress_mastery ON flashcard_progress(mastery_level);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_flashcard_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_flashcard_updated_at
    BEFORE UPDATE ON flashcards
    FOR EACH ROW
    EXECUTE FUNCTION update_flashcard_updated_at();

-- Función para calcular próxima revisión (Spaced Repetition SM-2)
CREATE OR REPLACE FUNCTION calculate_next_review(
    p_quality INTEGER, -- 0-5
    p_current_ease DECIMAL,
    p_current_interval INTEGER,
    p_current_repetitions INTEGER
)
RETURNS TABLE(
    new_ease DECIMAL,
    new_interval INTEGER,
    new_repetitions INTEGER
) AS $$
DECLARE
    v_new_ease DECIMAL;
    v_new_interval INTEGER;
    v_new_repetitions INTEGER;
BEGIN
    -- Calcular nuevo ease factor
    v_new_ease := p_current_ease + (0.1 - (5 - p_quality) * (0.08 + (5 - p_quality) * 0.02));
    IF v_new_ease < 1.3 THEN
        v_new_ease := 1.3;
    END IF;
    
    -- Calcular nuevo intervalo y repeticiones
    IF p_quality < 3 THEN
        -- Respuesta incorrecta: reiniciar
        v_new_interval := 1;
        v_new_repetitions := 0;
    ELSE
        -- Respuesta correcta
        IF p_current_repetitions = 0 THEN
            v_new_interval := 1;
        ELSIF p_current_repetitions = 1 THEN
            v_new_interval := 6;
        ELSE
            v_new_interval := ROUND(p_current_interval * v_new_ease)::INTEGER;
        END IF;
        v_new_repetitions := p_current_repetitions + 1;
    END IF;
    
    RETURN QUERY SELECT v_new_ease, v_new_interval, v_new_repetitions;
END;
$$ LANGUAGE plpgsql;

-- Habilitar RLS
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_progress ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para flashcards
-- Docentes pueden ver/editar sus propias flashcards
CREATE POLICY "Teachers can manage their own flashcards"
    ON flashcards FOR ALL
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

-- Docentes pueden ver flashcards de sus cursos
CREATE POLICY "Teachers can view flashcards in their courses"
    ON flashcards FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM courses c
            WHERE c.id = flashcards.course_id
            AND c.teacher_id = auth.uid()
        )
    );

-- Estudiantes pueden ver flashcards de sus cursos
CREATE POLICY "Students can view flashcards in enrolled courses"
    ON flashcards FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM course_enrollments ce
            WHERE ce.course_id = flashcards.course_id
            AND ce.student_id = auth.uid()
        )
    );

-- Políticas RLS para flashcard_progress
-- Estudiantes pueden ver/editar su propio progreso
CREATE POLICY "Students can manage their own progress"
    ON flashcard_progress FOR ALL
    USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

-- Docentes pueden ver progreso de sus estudiantes
CREATE POLICY "Teachers can view progress in their courses"
    ON flashcard_progress FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM flashcards f
            JOIN courses c ON c.id = f.course_id
            WHERE f.id = flashcard_progress.flashcard_id
            AND c.teacher_id = auth.uid()
        )
    );

-- Administradores y coordinadores pueden ver todo
CREATE POLICY "Admins can view all flashcards"
    ON flashcards FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN roles r ON r.id = u.role_id
            WHERE u.id = auth.uid()
            AND r.name IN ('admin', 'coordinator')
        )
    );

-- Comentarios
COMMENT ON TABLE flashcards IS 'Sistema de flashcards interactivas para aprendizaje';
COMMENT ON TABLE flashcard_progress IS 'Progreso de estudiantes con flashcards usando Spaced Repetition';
```

---

## 🔒 Consideraciones Técnicas {#consideraciones-tecnicas}

### Almacenamiento de Imágenes

**Supabase Storage:**
```typescript
// Estructura de carpetas
flashcards/
  {course_id}/
    {flashcard_id}/
      front_image.jpg
      back_image.jpg
```

**Límites:**
- Tamaño máximo: 5MB por imagen
- Formatos: JPG, PNG, WebP
- Optimización: Comprimir antes de subir

### Algoritmo Spaced Repetition (SM-2)

**Parámetros:**
- `ease_factor`: Inicia en 2.5, ajusta según calidad de respuesta
- `interval_days`: Días hasta próxima revisión
- `repetitions`: Número de repeticiones consecutivas correctas

**Calidad de Respuesta (0-5):**
- 0: Muy difícil (no recordé)
- 1: Difícil (recordé con dificultad)
- 2: Regular (recordé con algo de esfuerzo)
- 3: Fácil (recordé bien)
- 4: Muy fácil (recordé perfectamente)
- 5: Trivial (demasiado fácil, puede saltarse)

### Rendimiento

**Optimizaciones:**
- Lazy loading de imágenes
- Paginación de flashcards (20 por página)
- Caché de progreso en localStorage
- Índices en BD para consultas rápidas

### Integración con Tutor IA

```typescript
// El Tutor IA puede sugerir flashcards
async function suggestFlashcards(question: string, courseId: number) {
  // Buscar flashcards relacionadas con la pregunta
  // Usar embeddings para similitud semántica
  // Retornar flashcards relevantes
}
```

---

## 📊 Métricas de Éxito

### KPIs a Medir:

1. **Adopción:**
   - % de docentes que crean flashcards
   - % de estudiantes que usan flashcards
   - Número promedio de flashcards por curso

2. **Engagement:**
   - Tiempo promedio de estudio con flashcards
   - Frecuencia de uso (días/semana)
   - Flashcards completadas por estudiante

3. **Efectividad:**
   - Mejora en calificaciones después de usar flashcards
   - Tasa de dominio (mastery_level >= 4)
   - Reducción en tiempo de estudio

---

## 🚀 Próximos Pasos Inmediatos

1. **Revisar y aprobar plan** ✅
2. **Crear script SQL** (`103_create_flashcards_system.sql`)
3. **Crear estructura de servicios** (`flashcardService.ts`)
4. **Crear componente básico** (`FlashcardCard.tsx`)
5. **Implementar upload de imágenes**
6. **Crear página de creación** (para docentes)
7. **Crear página de estudio** (para estudiantes)
8. **Testing y refinamiento**

---

**Última Actualización:** Enero 2025  
**Estado:** Listo para implementación

