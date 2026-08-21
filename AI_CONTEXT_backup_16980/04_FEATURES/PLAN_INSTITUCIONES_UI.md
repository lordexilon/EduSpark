# Plan de Implementación: Instituciones en Landing y Sidebar

## Objetivo
1. Mostrar instituciones habilitadas en la landing page
2. Mostrar nombre de institución del usuario en el sidebar
3. Mostrar logo de la institución en el sidebar

## Cambios a Realizar

### 1. Landing Page - Sección de Instituciones

**Archivo:** `pages/LandingPage.tsx`

**Implementación:**
- Agregar sección "Nuestras Instituciones" después de la sección de características
- Cargar instituciones activas usando `institutionService.getAllInstitutions()`
- Mostrar tarjetas con:
  - Logo de la institución (si existe)
  - Nombre
  - Descripción breve
  - Link al sitio web (si existe)

### 2. Sidebar - Información de Institución

**Archivos a modificar:**
- `components/TeacherSidebar.tsx`
- `components/Sidebar.tsx` (si existe para estudiantes)

**Implementación:**
- Agregar hook para cargar institución del usuario
- Mostrar en la parte inferior del sidebar:
  - Logo de la institución (pequeño, 32x32px)
  - Nombre de la institución
  - Estilo: fondo sutil, texto pequeño

### 3. Hook Personalizado para Institución

**Archivo nuevo:** `hooks/useUserInstitution.ts`

**Funcionalidad:**
- Cargar institución del usuario actual
- Cachear resultado
- Retornar: `{ institution, loading, error }`

## Estructura de Datos

```typescript
interface Institution {
  id: number;
  name: string;
  description?: string;
  logo_url?: string;
  website?: string;
  email?: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

## Diseño Visual

### Landing Page - Instituciones
- Grid responsive (1 col móvil, 2-3 cols desktop)
- Tarjetas con hover effect
- Logo centrado arriba
- Nombre en negrita
- Descripción en texto gris
- Botón "Visitar sitio web" si existe

### Sidebar - Institución
- Posición: Bottom del sidebar, arriba del logout
- Layout: Horizontal (logo + texto)
- Logo: 32x32px, redondeado
- Texto: Nombre en 1 línea, truncado si es muy largo
- Background: bg-gray-50 dark:bg-gray-800
- Padding: p-3
- Border top: border-t

## Orden de Implementación

1. ✅ Crear hook `useUserInstitution`
2. ✅ Modificar `TeacherSidebar.tsx`
3. ✅ Modificar `Sidebar.tsx` (estudiantes)
4. ✅ Modificar `LandingPage.tsx`
5. ✅ Probar y ajustar estilos
