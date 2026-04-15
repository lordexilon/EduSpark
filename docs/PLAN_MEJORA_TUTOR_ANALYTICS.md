# Plan de Mejora: Reporte de Analíticas del Tutor IA

**Fecha**: 2026-01-04  
**URL del Reporte**: https://cacavelos.com.py/teacher/tutor-analytics  
**Archivos Principales**:
- `src/pages/Teacher/TeacherTutorAnalyticsPage.tsx`
- `src/services/tutorAnalyticsService.ts`

---

## 📋 Resumen del Análisis Actual

### Estado Actual del Reporte
El reporte actual muestra:
1. **Filtros limitados**: Solo filtro por curso
2. **Métricas resumidas**: Tarjetas con participación, interacciones, costos y tokens
3. **Análisis IA**: Resumen ejecutivo, insights y recomendaciones generadas por IA
4. **Tabla de estudiantes**: Datos de interacciones, tokens, costo, última interacción y desempeño
5. **Sin exportación**: No existe funcionalidad de exportar a Excel
6. **Sin ordenamiento**: Las columnas de la tabla no tienen sorting

### Datos Disponibles
Según el código analizado, la tabla `tutor_interactions` tiene:
- `created_at`: Campo timestamp con fecha y hora completas
- `student_id`: ID del estudiante
- `course_id`: ID del curso
- `tokens_used`: Tokens consumidos
- `cost`: Costo de la interacción
- `response_time_ms`: Tiempo de respuesta
- `question`: Pregunta del estudiante

---

## 🎯 Mejoras Solicitadas

### 1. **Filtros de Fecha y Hora** ⭐
#### 1.1 Filtro de Rango de Fechas
- **Componentes necesarios**:
  - Input "Fecha Desde" (DatePicker)
  - Input "Fecha Hasta" (DatePicker)
  - Botón "Aplicar Filtros"
  - Botón "Limpiar Filtros"

#### 1.2 Inclusión de Hora
- **Verificación**: ✅ El campo `created_at` en `tutor_interactions` ya incluye hora
- **Implementación**:
  - Filtros con rango de fecha Y hora (opcional: agregar selectores de hora)
  - Mostrar hora en la columna "Última Interacción" de la tabla
  - Formato sugerido: "14 dic 2025, 15:30" (fecha + hora)

### 2. **Filtros por Personas y Roles** ⭐
#### 2.1 Filtro por Estudiantes
- Multi-select de estudiantes del curso
- Autocompletado para facilitar la búsqueda
- Opción "Todos los estudiantes" por defecto

#### 2.2 Filtro por Roles
**Análisis de roles disponibles**:
- Según el contexto del sistema, los roles son: `admin`, `coordinator`, `teacher`, `student`
- **Para este reporte**: El filtro debe ser por **estudiantes específicos**, no por roles generales
- **Propuesta alternativa**: 
  - Filtrar por "Estado de actividad": 
    - Todos
    - Activos (con interacciones)
    - Inactivos (sin interacciones)
    - Necesitan atención (según alertas)

### 3. **Exportación a Excel Profesional** ⭐⭐⭐
#### 3.1 Estructura del Excel
El archivo Excel debe contener:

**Hoja 1: "Resumen Ejecutivo"**
- Logo y título del reporte
- Información del curso seleccionado
- Período de análisis (fechas del filtro)
- Métricas generales:
  - Participación Total
  - Total de Interacciones
  - Costo Total
  - Tokens Totales
- Análisis del Asesor IA (si está disponible)

**Hoja 2: "Desempeño por Estudiante"**
- Tabla completa con todas las columnas:
  - Estudiante (nombre)
  - Email
  - Total Interacciones
  - Tokens Utilizados
  - Costo Total (USD)
  - Última Interacción (fecha y hora)
  - Desempeño (%)
  - Estado (Activo/Inactivo/Atención)

**Hoja 3: "Temas Consultados"**
- Top 10 temas más consultados
- Cantidad de consultas por tema

**Hoja 4: "Estudiantes que Necesitan Atención"**
- Lista de estudiantes con alertas
- Razón de la alerta
- Prioridad (Alta/Media/Baja)

#### 3.2 Formato Profesional
**Encabezados**:
- Fondo: Color corporativo (azul #1E40AF)
- Texto: Blanco, negrita, centrado
- Bordes: Líneas delgadas

**Cuerpo de la tabla**:
- Filas alternadas: Blanco y gris claro (#F9FAFB)
- Bordes: Líneas delgadas grises
- Alineación:
  - Texto: Izquierda
  - Números: Derecha
  - Fechas: Centro
- Formato de números:
  - Tokens: Separador de miles (ej: 1,234)
  - Costos: Formato moneda USD (ej: $0.0234)
  - Porcentajes: Con símbolo % (ej: 85.5%)

**Totales y Resúmenes**:
- Fila de totales al final de cada tabla
- Fondo: Gris oscuro (#E5E7EB)
- Texto: Negrita
- Incluir:
  - Total Interacciones
  - Total Tokens
  - Total Costo
  - Promedio Desempeño

**Columnas**:
- Ancho automático ajustado al contenido
- Ancho mínimo: 15 caracteres
- Ancho máximo: 40 caracteres

### 4. **Ordenamiento de Tabla (Sorting)** ⭐⭐
#### 4.1 Columnas con Sorting
Todas las columnas deben ser ordenables:
1. **Estudiante**: Alfabético A-Z / Z-A
2. **Interacciones**: Numérico ASC / DESC
3. **Tokens**: Numérico ASC / DESC
4. **Costo**: Numérico ASC / DESC
5. **Última Interacción**: Cronológico (más reciente primero / más antigua primero)
6. **Desempeño**: Numérico ASC / DESC

#### 4.2 UI de Sorting
- Iconos en encabezados de columna:
  - Sin ordenar: ↕️ (icono neutral)
  - Ascendente: ↑ (icono arriba)
  - Descendente: ↓ (icono abajo)
- Indicador visual del estado actual de ordenamiento
- Click en encabezado cambia entre: Sin ordenar → ASC → DESC → Sin ordenar

---

## 🏗️ Arquitectura de la Solución

### Componentes a Crear/Modificar

#### 1. **TeacherTutorAnalyticsPage.tsx** (Modificar)
**Nuevos estados**:
```typescript
const [filters, setFilters] = useState({
  dateFrom: null,
  dateTo: null,
  selectedStudents: [],
  activityStatus: 'all', // 'all' | 'active' | 'inactive' | 'attention'
});
const [sortConfig, setSortConfig] = useState({
  key: null,
  direction: 'asc',
});
```

**Nuevas funciones**:
- `handleFilterChange()`: Actualiza filtros
- `applyFilters()`: Aplica filtros y recarga datos
- `clearFilters()`: Limpia todos los filtros
- `handleSort(columnKey)`: Maneja el ordenamiento
- `exportToExcel()`: Genera y descarga el Excel

#### 2. **tutorAnalyticsService.ts** (Modificar)
**Modificar función `getStudentMetrics()`**:
```typescript
export async function getStudentMetrics(
  courseId: string | number,
  filters?: {
    dateFrom?: Date;
    dateTo?: Date;
    studentIds?: string[];
    activityStatus?: string;
  }
): Promise<StudentMetrics[]>
```

**Modificar función `getCourseMetrics()`**:
```typescript
export async function getCourseMetrics(
  courseId: string | number,
  filters?: {
    dateFrom?: Date;
    dateTo?: Date;
  }
): Promise<CourseMetrics | null>
```

#### 3. **TutorAnalyticsExcelExporter.ts** (Nuevo)
Servicio dedicado para generación de Excel con formato profesional.

**Funciones**:
- `exportTutorAnalyticsToExcel(data, filters)`: Función principal
- `createSummarySheet(workbook, data)`: Crea hoja de resumen
- `createStudentPerformanceSheet(workbook, students)`: Crea hoja de estudiantes
- `createTopicsSheet(workbook, topics)`: Crea hoja de temas
- `createAttentionSheet(workbook, attentionList)`: Crea hoja de alertas
- Helpers de formato:
  - `applyHeaderStyle(cell)`
  - `applyDataRowStyle(cell, rowIndex)`
  - `applyTotalRowStyle(cell)`
  - `formatCurrency(value)`
  - `formatDate(date)`

#### 4. **FilterPanel.tsx** (Nuevo componente opcional)
Componente reutilizable para el panel de filtros.

---

## 📦 Dependencias

### Librerías a Instalar
```bash
npm install xlsx xlsx-js-style
npm install --save-dev @types/xlsx
```

**Nota**: `xlsx-js-style` es necesario para aplicar estilos profesionales al Excel.

---

## 🚀 Plan de Implementación

### Fase 1: Filtros de Fecha y Hora (2-3 horas)
1. ✅ Agregar componentes de fecha en la UI
2. ✅ Implementar estado de filtros
3. ✅ Modificar servicios para aceptar filtros de fecha
4. ✅ Actualizar queries para filtrar por `created_at`
5. ✅ Mostrar hora en columna "Última Interacción"
6. ✅ Probar con diferentes rangos de fecha

### Fase 2: Filtros por Personas y Estado (2 horas)
1. ✅ Crear dropdown multi-select de estudiantes
2. ✅ Crear selector de estado de actividad
3. ✅ Integrar filtros en la lógica de carga de datos
4. ✅ Validar que los filtros funcionen correctamente
5. ✅ Agregar indicadores visuales de filtros activos

### Fase 3: Ordenamiento de Tabla (1-2 horas)
1. ✅ Implementar lógica de sorting
2. ✅ Agregar iconos de ordenamiento en encabezados
3. ✅ Aplicar estilos visuales para indicar estado de sorting
4. ✅ Probar sorting en todas las columnas
5. ✅ Manejar casos especiales (N/A, null values)

### Fase 4: Exportación a Excel (4-5 horas)
1. ✅ Instalar librerías necesarias
2. ✅ Crear servicio `TutorAnalyticsExcelExporter`
3. ✅ Implementar creación de cada hoja:
   - Hoja 1: Resumen Ejecutivo (1.5 hrs)
   - Hoja 2: Desempeño por Estudiante (1 hr)
   - Hoja 3: Temas Consultados (0.5 hrs)
   - Hoja 4: Estudiantes con Atención (0.5 hrs)
4. ✅ Aplicar estilos profesionales (1 hr)
5. ✅ Agregar botón "Exportar a Excel" en la UI
6. ✅ Probar exportación con diferentes datasets
7. ✅ Validar formato en Excel

### Fase 5: Testing y Ajustes (1-2 horas)
1. ✅ Pruebas de integración
2. ✅ Validación de data accuracy
3. ✅ Testing de performance con grandes volúmenes
4. ✅ Ajustes de UI/UX
5. ✅ Documentación de uso

**Total estimado**: 10-14 horas

---

## 🎨 Mockup de la Nueva UI

### Sección de Filtros
```
┌─────────────────────────────────────────────────────────────────┐
│ FILTROS                                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Curso: [Dropdown ▼]                                           │
│                                                                 │
│  Período:                                                       │
│  [📅 Fecha Desde]  [📅 Fecha Hasta]                            │
│                                                                 │
│  Estudiantes: [Multi-select ▼]  (Todos seleccionados)         │
│                                                                 │
│  Estado: ○ Todos  ○ Activos  ○ Inactivos  ○ Necesitan Atención│
│                                                                 │
│  [🔄 Actualizar]  [🧹 Limpiar Filtros]  [📥 Exportar Excel]   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Tabla con Sorting
```
┌──────────────────────────────────────────────────────────────────────────┐
│ DESEMPEÑO POR ESTUDIANTE                                                │
├──────────────────────────────────────────────────────────────────────────┤
│ Estudiante ↑│Interacciones ↕│Tokens ↕│Costo ↕│Última Interacción ↕│Desemp.↕│
├─────────────┼───────────────┼────────┼───────┼────────────────────┼────────┤
│ Ana García  │      25       │ 12,450 │$0.23  │ 14 dic 2025, 15:30 │ +15%   │
│ ana@...     │               │        │       │                    │   ↑    │
├─────────────┼───────────────┼────────┼───────┼────────────────────┼────────┤
│ ...         │               │        │       │                    │        │
└─────────────┴───────────────┴────────┴───────┴────────────────────┴────────┘
```

---

## 📊 Ejemplo de Excel Generado

### Resumen Ejecutivo
```
╔═══════════════════════════════════════════════════════════╗
║              REPORTE DE ANALÍTICAS DEL TUTOR IA          ║
╠═══════════════════════════════════════════════════════════╣
║ Curso: Introducción a la Programación                    ║
║ Período: 01/12/2025 - 31/12/2025                         ║
║ Generado: 04/01/2026 18:05                               ║
╠═══════════════════════════════════════════════════════════╣
║                     MÉTRICAS GENERALES                    ║
╠══════════════════════════════╦════════════════════════════╣
║ Participación Total          ║  45 / 50 (90%)            ║
║ Total Interacciones          ║  1,234                     ║
║ Total Tokens                 ║  567,890                   ║
║ Costo Total                  ║  $45.67                    ║
╚══════════════════════════════╩════════════════════════════╝
```

### Desempeño por Estudiante
```
╔═══════════╦════════════╦══════╦═══════╦═══════════════════╦═══════════╗
║ Estudiante║    Email   ║Inter.║Tokens ║      Costo        ║Última Int.║
╠═══════════╬════════════╬══════╬═══════╬═══════════════════╬═══════════╣
║Ana García ║ana@ej.com  ║  25  ║12,450 ║      $0.23        ║14/12 15:30║
╠═══════════╬════════════╬══════╬═══════╬═══════════════════╬═══════════╣
║Carlos Ruiz║car@ej.com  ║  18  ║ 9,234 ║      $0.18        ║13/12 10:15║
╠═══════════╬════════════╬══════╬═══════╬═══════════════════╬═══════════╣
║ TOTALES   ║            ║  43  ║21,684 ║      $0.41        ║           ║
╚═══════════╩════════════╩══════╩═══════╩═══════════════════╩═══════════╝
```

---

## ✅ Criterios de Aceptación

### Filtros
- [ ] Filtro de fecha desde funciona correctamente
- [ ] Filtro de fecha hasta funciona correctamente
- [ ] La hora se muestra en "Última Interacción"
- [ ] Filtro multi-select de estudiantes funciona
- [ ] Filtro de estado de actividad funciona
- [ ] Botón "Limpiar Filtros" resetea todos los filtros
- [ ] Los filtros se aplican correctamente a los datos

### Ordenamiento
- [ ] Todas las columnas tienen iconos de sorting
- [ ] Click en encabezado cambia el orden
- [ ] Indicador visual muestra el estado actual
- [ ] Sorting funciona con valores null/N/A
- [ ] Sorting se mantiene al filtrar

### Exportación a Excel
- [ ] Botón "Exportar a Excel" está visible y funcional
- [ ] Excel contiene las 4 hojas especificadas
- [ ] Formato profesional aplicado correctamente
- [ ] Datos exportados coinciden con los mostrados en pantalla
- [ ] Fórmulas de totales funcionan correctamente
- [ ] Anchos de columna se ajustan automáticamente
- [ ] Estilos de celdas (colores, bordes, fuentes) son correctos
- [ ] Formato de números (moneda, porcentajes) es correcto
- [ ] El archivo se descarga con nombre descriptivo

### UX
- [ ] UI es intuitiva y fácil de usar
- [ ] Tiempos de carga son aceptables (<3 seg)
- [ ] Feedback visual durante operaciones
- [ ] Validaciones de formulario funcionan
- [ ] Mensajes de error son claros

---

## 📝 Notas Técnicas

### Performance
- **Paginación**: Considerar implementar paginación si hay más de 100 estudiantes
- **Lazy loading**: Cargar datos de filtros bajo demanda
- **Debouncing**: Aplicar debounce en filtros de búsqueda

### Compatibilidad
- **Excel**: El formato debe ser compatible con Excel 2016+
- **Browsers**: Probar descarga de Excel en Chrome, Firefox, Edge

### Seguridad
- **Permisos**: Validar que solo profesores del curso puedan ver el reporte
- **Data sanitization**: Limpiar datos antes de exportar

### Mejoras Futuras (Backlog)
- [ ] Gráficos en Excel (charts)
- [ ] Exportación en formato PDF
- [ ] Programar reportes automáticos (envío por email)
- [ ] Comparación de períodos (mes actual vs mes anterior)
- [ ] Filtro por rangos de desempeño (alto, medio, bajo)
- [ ] Dashboard con visualizaciones interactivas (gráficos)

---

## 🔗 Referencias

- Librería xlsx: https://docs.sheetjs.com/
- xlsx-js-style: https://github.com/gitbrent/xlsx-js-style
- Guía de estilos Excel: https://support.microsoft.com/excel

---

**Documento creado por**: Antigravity AI  
**Última actualización**: 2026-01-04
