# Sistema de Hashtags para Materiales del Curso

## Resumen
Se ha implementado un sistema completo de hashtags para clasificar y filtrar materiales del curso. Los docentes, admin-campus y administradores pueden agregar/editar hashtags, mientras que los estudiantes pueden visualizarlos y filtrar por ellos.

## Fecha de Implementación
Enero 2025

## Funcionalidades

### 1. Para Docentes, Admin-Campus y Administradores

#### Ubicación
- **Página**: `/teacher/materials` (MaterialsManagementPage)
- **Componente**: `src/pages/Teacher/MaterialsManagementPage.tsx`

#### Características
- **Columna de Hashtags en la Tabla**: Nueva columna en la tabla de administración de materiales
- **Edición Inline**: Campo de texto para agregar/editar hashtags directamente en la tabla
- **Formato de Entrada**:
  - Acepta hashtags separados por comas o espacios
  - Automáticamente remueve el símbolo `#` si se incluye al inicio
  - Limpia espacios en blanco y caracteres vacíos
- **Guardado Automático**:
  - Se guarda al perder el foco (blur)
  - Se guarda al presionar Enter
  - Actualización visual inmediata en el estado local
- **Visualización**: Los hashtags se muestran como tags debajo del input

#### Funciones Implementadas
```typescript
// Actualizar hashtags de un material
handleUpdateHashtags(materialId: string, hashtagsString: string)

// Obtener hashtags de un material
getMaterialHashtags(material: Material): string[]
```

#### Almacenamiento
Los hashtags se guardan en `material.metadata.hashtags` como un array de strings:
```json
{
  "metadata": {
    "hashtags": ["importante", "examen", "tarea"]
  }
}
```

### 2. Para Estudiantes

#### Ubicación
- **Página**: `/courses/:courseId` (CourseViewPage)
- **Componente**: `src/pages/Student/CourseViewPage.tsx`

#### Características
- **Visualización de Hashtags**: Los hashtags aparecen como tags clickeables en cada material
- **Filtro por Hashtag**: Selector en la sección de filtros con todos los hashtags únicos disponibles
- **Filtrado Interactivo**: Al hacer clic en un hashtag, se aplica el filtro automáticamente
- **Estilos Visuales**:
  - Hashtags en color púrpura para diferenciarlos de las categorías (azul)
  - El hashtag activo se resalta con fondo púrpura oscuro
  - Hover en los hashtags no seleccionados

#### Funciones Implementadas
```typescript
// Obtener hashtags únicos de todos los materiales
availableHashtags: useMemo(() => { ... })

// Obtener hashtags de un material específico
getMaterialHashtags(material: Material): string[]

// Filtrar materiales por hashtag
filteredAndSortedMaterials: useMemo(() => { ... })
```

#### Estados Agregados
```typescript
const [materialHashtagFilter, setMaterialHashtagFilter] = useState<string>('all');
```

## Estructura de Datos

### En la Base de Datos (Supabase)
Los hashtags se almacenan en la tabla `materials`, columna `metadata` (JSONB):
```sql
metadata->>'hashtags' -- Array de strings
```

### Ejemplo de Metadata
```json
{
  "source": "google_drive",
  "sourceFileId": "1yYXVCzNLoNkkl-ldF6P97jypCPDnKyBC",
  "hashtags": ["importante", "examen", "tarea"],
  "display_category": "Bibliografía",
  "category": "bibliography"
}
```

## Flujo de Uso

### Para Docentes/Admins:
1. Navegar a "Administración de Materiales"
2. Localizar el material en la tabla
3. En la columna "Hashtags", escribir los hashtags separados por comas
4. Presionar Enter o hacer clic fuera del campo para guardar
5. Los hashtags se guardan automáticamente en Supabase

### Para Estudiantes:
1. Navegar a la página del curso
2. Expandir la sección "Materiales del Curso"
3. Ver los hashtags como tags clickeables en cada material
4. Hacer clic en un hashtag para filtrar materiales
5. O usar el selector de filtros para elegir un hashtag específico

## Archivos Modificados

### 1. `src/pages/Teacher/MaterialsManagementPage.tsx`
- Agregado import de `Hash` de lucide-react
- Agregada función `handleUpdateHashtags`
- Agregada función `getMaterialHashtags`
- Agregada columna "Hashtags" en la tabla
- Agregado input inline para editar hashtags
- Agregada visualización de hashtags como tags

### 2. `src/pages/Student/CourseViewPage.tsx`
- Agregado import de `Hash` de lucide-react
- Agregado estado `materialHashtagFilter`
- Agregado `useMemo` para `availableHashtags`
- Agregada función `getMaterialHashtags` con `useCallback`
- Agregado filtro por hashtag en `filteredAndSortedMaterials`
- Agregado selector de filtro por hashtag en la UI
- Agregada visualización de hashtags en materiales (videos y otros)
- Agregado reset de filtro de hashtags en "Limpiar filtros"

## Consideraciones Técnicas

### Validación
- Los hashtags se limpian automáticamente (espacios, caracteres especiales)
- Se remueve el símbolo `#` si se incluye al inicio
- Se filtran hashtags vacíos

### Rendimiento
- Uso de `useMemo` para optimizar el cálculo de hashtags únicos
- Uso de `useCallback` para la función `getMaterialHashtags`
- Actualización optimista del estado local antes de guardar en Supabase

### Compatibilidad
- Compatible con materiales existentes (sin hashtags)
- Maneja tanto arrays como strings únicos en `metadata.hashtags`
- Retrocompatible con materiales que no tienen hashtags

## Próximas Mejoras Sugeridas

1. **Autocompletado**: Sugerir hashtags existentes mientras se escribe
2. **Estadísticas**: Mostrar cuántos materiales tienen cada hashtag
3. **Búsqueda por Hashtag**: Agregar búsqueda por hashtag en la barra de búsqueda
4. **Hashtags Populares**: Mostrar los hashtags más usados
5. **Validación de Hashtags**: Limitar longitud o caracteres permitidos
6. **Eliminación de Hashtags**: Botón para eliminar hashtags individuales

## Notas de Desarrollo

- Los hashtags se almacenan en `metadata.hashtags` para no modificar el esquema de la base de datos
- La funcionalidad es completamente opcional: los materiales sin hashtags funcionan normalmente
- Los estudiantes solo pueden ver y filtrar, no editar hashtags (seguridad)

