# Evaluación de Estructura Pedagógica y Académica

## 📚 Análisis de la Jerarquía Actual

### Estructura Implementada:

```
Carrera (Programa Académico)
    ↓
Materia (Disciplina/Temática)
    ↓
Curso (Instancia del período académico)
    ↓
Unidades (Bloques temáticos)
    ↓
Sesiones (Clases/Encuentros específicos)
    ↓
Materiales (Recursos complementarios)
```

## ✅ Evaluación Pedagógica

### **Estructura Académica (CORRECTA)**

1. **Carrera → Materia → Curso**
   - ✅ **Correcto pedagógicamente**: La carrera define el programa completo, las materias son disciplinas dentro de la carrera, y los cursos son instancias específicas de esas materias en períodos académicos.
   - ✅ **Bien implementado**: La relación está correctamente establecida con foreign keys.

2. **Curso → Unidades → Sesiones**
   - ✅ **Correcto pedagógicamente**: 
     - **Unidades** agrupan temas relacionados (ej: "Unidad 1: Fundamentos", "Unidad 2: Aplicaciones Avanzadas")
     - **Sesiones** son las clases individuales dentro de cada unidad (ej: "Sesión 1: Introducción", "Sesión 2: Práctica")
   - ✅ **Jerarquía lógica**: Las sesiones pertenecen a unidades (unit_id), lo que permite organizar el contenido de forma progresiva.

3. **Materiales como recursos complementarios**
   - ✅ **Correcto**: Los materiales son archivos externos (PDFs, videos, enlaces) que complementan el contenido didáctico.
   - ⚠️ **Mejora necesaria**: El contenido didáctico principal debería estar directamente en Unidades y Sesiones, no solo como materiales externos.

## 🔍 Problemas Identificados

### 1. **Falta de Contenido Didáctico Rico en Unidades y Sesiones**

**Problema actual:**
- `course_units.description` → Solo texto plano (TEXT)
- `sessions.description` → Solo texto plano (TEXT)
- No hay soporte para:
  - Imágenes embebidas
  - Videos embebidos
  - Gráficos y diagramas
  - Formato enriquecido (negritas, listas, etc.)

**Impacto pedagógico:**
- ❌ No se pueden crear contenidos didácticos visuales y atractivos
- ❌ Dificultad para explicar conceptos complejos sin visualizaciones
- ❌ El contenido depende exclusivamente de materiales externos

### 2. **Relación Unidad-Sesión**

**Estado actual:**
- ✅ Las sesiones pueden pertenecer a unidades (unit_id) → CORRECTO
- ⚠️ Pero también pueden existir sin unidad (unit_id NULL) → Esto puede ser correcto para sesiones introductorias o generales

**Recomendación:**
- Mantener `unit_id` como opcional permite flexibilidad
- Aconsejar a los docentes agrupar sesiones en unidades para mejor organización

## 💡 Propuesta de Mejora

### Campos a Agregar:

#### Para `course_units`:
```sql
ALTER TABLE course_units ADD COLUMN IF NOT EXISTS content_html TEXT;
ALTER TABLE course_units ADD COLUMN IF NOT EXISTS content_markdown TEXT;
ALTER TABLE course_units ADD COLUMN IF NOT EXISTS learning_objectives TEXT[];
ALTER TABLE course_units ADD COLUMN IF NOT EXISTS duration_hours DECIMAL(5,2);
ALTER TABLE course_units ADD COLUMN IF NOT EXISTS order_index INTEGER;
```

#### Para `sessions`:
```sql
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS content_html TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS content_markdown TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS learning_objectives TEXT[];
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS activities JSONB DEFAULT '[]'::jsonb;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS resources JSONB DEFAULT '[]'::jsonb;
```

### Estrategia de Contenido:

1. **Contenido Principal**: En `content_html` / `content_markdown` de Unidades y Sesiones
2. **Recursos Multimedia**: 
   - Embedding de videos (YouTube, Vimeo)
   - Imágenes almacenadas (Supabase Storage)
   - Gráficos interactivos (SVG embebido o enlaces a herramientas)
3. **Materiales Complementarios**: Mantener la tabla `materials` para archivos pesados (PDFs, videos largos)

## 📐 Estructura Pedagógica Recomendada

```
Carrera
  └── Materia (Disciplina académica)
      └── Curso (Período 2024-1, 2024-2, etc.)
          └── Unidad 1: Título
              ├── Contenido: [HTML/Markdown con imágenes/videos]
              ├── Objetivos: [Lista]
              └── Sesiones:
                  ├── Sesión 1.1: Introducción
                  │   ├── Contenido: [HTML/Markdown rico]
                  │   ├── Actividades: [JSON]
                  │   └── Recursos: [Videos, imágenes]
                  └── Sesión 1.2: Práctica
          └── Unidad 2: ...
```

## ✅ Conclusión

**La estructura académica es pedagógicamente correcta**, pero necesita:
1. ✅ Soporte para contenido rico en Unidades y Sesiones
2. ✅ Editor WYSIWYG o Markdown con soporte multimedia
3. ✅ Almacenamiento de imágenes/videos en Supabase Storage
4. ✅ Campos adicionales para objetivos de aprendizaje y actividades

**Orden de implementación sugerido:**
1. Script SQL para agregar campos de contenido rico
2. Instalar editor de texto enriquecido (React Quill o similar)
3. Actualizar servicios para manejar contenido HTML/Markdown
4. Modificar interfaces de edición de Unidades y Sesiones
5. Implementar upload de imágenes a Supabase Storage
6. Agregar soporte para videos embebidos (YouTube/Vimeo)

