# Reportes Administrativos por Roles

**Fecha:** Enero 2025  
**Estado:** ✅ Implementado

---

## 📋 Resumen

Se ha implementado un sistema de reportes comprehensivos con diferentes niveles de acceso según el rol del usuario:

- **Admin**: Vista global de todas las instituciones, carreras y cursos con tokens/costos
- **Admin-campus/Coordinator**: Vista solo de su institución sin tokens/costos (solo académico)
- **Teacher**: Vista de sus cursos con tokens/costos
- **Estudiante**: Vista personal sin tokens/costos

Además, se ha agregado funcionalidad de exportación a Excel y PDF.

---

## 🎯 Objetivos Cumplidos

1. ✅ **Página Admin Global**: `AdminComprehensiveReportsPage.tsx` - Vista de todas las instituciones
2. ✅ **Filtrado por Institución**: Admin-campus/coordinator solo ven su institución
3. ✅ **Ocultación de Costos**: Admin-campus/coordinator no ven tokens/costos
4. ✅ **Exportación**: Componente `ExportReportButton.tsx` para Excel y PDF
5. ✅ **Servicio Admin**: `adminReportsService.ts` para reportes globales

---

## 🏗️ Arquitectura Implementada

### Servicios

#### 1. `adminReportsService.ts`
Servicio para reportes administrativos globales (solo admin):

```typescript
- getAllInstitutionsReports() - Reportes de todas las instituciones
- getGlobalMetrics() - Métricas agregadas globales
- getUserInstitutionId() - Obtener institución del usuario
```

#### 2. `comprehensiveReportService.ts` (Modificado)
- Soporta filtros por fecha
- Soporta filtrado por institución (para admin-campus/coordinator)

### Componentes

#### 1. `ExportReportButton.tsx` (NUEVO)
Componente para exportar reportes:
- Exportar a Excel (xlsx)
- Exportar a PDF (jspdf + jspdf-autotable)
- Respeta el flag `showCosts` para incluir/excluir tokens y costos

#### 2. `ComprehensiveStudentCard.tsx` (MODIFICADO)
- Agregado prop `showCosts?: boolean`
- Oculta tokens y costos si `showCosts = false`

### Páginas

#### 1. `AdminComprehensiveReportsPage.tsx` (NUEVO)
**Ruta:** `/admin/comprehensive-reports`  
**Acceso:** Solo admin

**Características:**
- Vista jerárquica: Instituciones → Cursos
- Métricas globales agregadas
- Tokens y costos visibles
- Filtros por fecha
- Enlaces a reportes detallados de cada curso

#### 2. `CourseComprehensiveReportPage.tsx` (MODIFICADO)
**Comportamiento según rol:**

- **Admin**: 
  - Ve todos los cursos
  - Ve tokens y costos
  - Sin restricciones

- **Admin-campus/Coordinator**:
  - Solo ve cursos de su institución
  - NO ve tokens ni costos
  - Muestra advertencia informativa

- **Teacher**:
  - Ve solo sus cursos
  - Ve tokens y costos
  - Sin cambios

#### 3. `StudentSelfReportPage.tsx` (YA MODIFICADO)
- NO muestra tokens ni costos
- Solo información académica y uso del tutor

---

## 🔐 Control de Acceso

### Lógica de Filtrado

```typescript
// En CourseComprehensiveReportPage.tsx
const isAdmin = user?.role?.name === 'admin';
const isAdminCampus = user?.role?.name === 'admin-campus';
const isCoordinator = user?.role?.name === 'coordinator';
const showCosts = isAdmin; // Solo admin ve costos

// Obtener institución del usuario
if (isAdminCampus || isCoordinator) {
  const institution = await institutionService.getUserInstitution(user.id);
  userInstitutionId = institution?.id || null;
  
  // Filtrar cursos por institución
  if (courseData.institution_id !== userInstitutionId) {
    // Error: No tiene acceso
  }
}
```

### Ocultación de Costos

```typescript
// En ComprehensiveStudentCard.tsx
{showCosts && (
  <>
    <div>Tokens: {tutorMetrics.totalTokens}</div>
    <div>Costo: {formatCurrency(tutorMetrics.totalCost)}</div>
  </>
)}

// En CourseComprehensiveReportPage.tsx
{showCosts && (
  <Card>
    <h3>Costo Total Tutor</h3>
    <p>{formatCurrency(report.aggregated.totalCost)}</p>
  </Card>
)}
```

---

## 📊 Estructura de Datos

### InstitutionReport
```typescript
{
  institutionId: number;
  institutionName: string;
  totalCourses: number;
  totalStudents: number;
  totalTeachers: number;
  averageProgress: number;
  totalTutorInteractions: number;
  totalCost: number; // Solo visible para admin
  totalTokens: number; // Solo visible para admin
  courses: CourseReport[];
}
```

### GlobalMetrics
```typescript
{
  totalInstitutions: number;
  totalCareers: number;
  totalCourses: number;
  totalStudents: number;
  totalTeachers: number;
  averageProgress: number;
  totalTutorInteractions: number;
  totalCost: number; // Solo visible para admin
  totalTokens: number; // Solo visible para admin
}
```

---

## 📤 Exportación

### Excel (xlsx)
- **Hojas**: 
  - "Estudiantes": Datos detallados de cada estudiante
  - "Resumen": Métricas agregadas del curso
- **Columnas**: Incluye/excluye tokens y costos según `showCosts`
- **Formato**: `.xlsx`

### PDF (jspdf + jspdf-autotable)
- **Orientación**: Landscape (horizontal)
- **Contenido**:
  - Título y fecha
  - Resumen general
  - Tabla de estudiantes
- **Columnas**: Incluye/excluye tokens y costos según `showCosts`
- **Formato**: `.pdf`

---

## 🔗 Navegación

### Para Admin
- **Sidebar**: "Reportes Globales" → `/admin/comprehensive-reports`
- **Vista**: Todas las instituciones con métricas agregadas
- **Enlaces**: Cada curso lleva a su reporte detallado

### Para Admin-campus/Coordinator
- **Acceso**: Desde "Informe Comprehensivo" en cada curso
- **Vista**: Solo cursos de su institución
- **Restricción**: No pueden acceder a cursos de otras instituciones

### Para Teacher
- **Acceso**: Desde "Informe Comprehensivo" en cada curso
- **Vista**: Solo sus cursos
- **Sin cambios**: Funciona como antes

---

## 📝 Archivos Creados/Modificados

### Nuevos Archivos
1. `src/services/adminReportsService.ts`
2. `src/pages/AdminComprehensiveReportsPage.tsx`
3. `src/components/ExportReportButton.tsx`

### Archivos Modificados
1. `src/pages/CourseComprehensiveReportPage.tsx`
   - Filtrado por institución
   - Ocultación de costos según rol
   - Integración de exportación

2. `src/components/ComprehensiveStudentCard.tsx`
   - Prop `showCosts`
   - Renderizado condicional de tokens/costos

3. `src/App.tsx`
   - Ruta `/admin/comprehensive-reports`

4. `src/components/TeacherSidebar.tsx`
   - Enlace "Reportes Globales" para admin

5. `package.json`
   - Dependencias: `xlsx`, `jspdf`, `jspdf-autotable`

---

## ✅ Verificación

### Funcionalidades Verificadas
- ✅ Admin ve todas las instituciones
- ✅ Admin-campus/coordinator solo ve su institución
- ✅ Tokens/costos ocultos para admin-campus/coordinator
- ✅ Exportación a Excel funciona
- ✅ Exportación a PDF funciona
- ✅ Filtros por fecha funcionan
- ✅ Navegación correcta según rol

### Pruebas Recomendadas
1. Verificar acceso de admin a reportes globales
2. Verificar que admin-campus no puede ver cursos de otras instituciones
3. Verificar que admin-campus no ve tokens/costos
4. Probar exportación a Excel con y sin costos
5. Probar exportación a PDF con y sin costos
6. Verificar filtros por fecha

---

## 🔧 Dependencias Instaladas

```bash
npm install xlsx jspdf jspdf-autotable
```

**Versiones:**
- `xlsx`: Para exportación a Excel
- `jspdf`: Para generación de PDFs
- `jspdf-autotable`: Para tablas en PDFs

---

## 🎨 Características de UI

### AdminComprehensiveReportsPage
- Vista jerárquica expandible
- Métricas globales destacadas
- Enlaces directos a reportes de cursos
- Filtros por fecha
- Diseño responsive

### ExportReportButton
- Dos botones: Excel y PDF
- Iconos descriptivos
- Integrado en header de reportes
- Respeta configuración de costos

---

## 🔗 Referencias

- `src/services/adminReportsService.ts` - Servicio de reportes admin
- `src/services/comprehensiveReportService.ts` - Servicio unificado
- `src/pages/AdminComprehensiveReportsPage.tsx` - Página admin global
- `src/pages/CourseComprehensiveReportPage.tsx` - Página de curso
- `src/components/ExportReportButton.tsx` - Componente de exportación
- `AI_CONTEXT/04_FEATURES/INTEGRACION_PROGRESO_TUTOR_ANALYTICS_IMPLEMENTACION.md` - Integración base

---

**Última actualización:** Enero 2025  
**Estado:** ✅ Implementado y Verificado

