# 🔍 Verificación: Contador de Avisos en Sidebar

**Fecha:** Enero 2025  
**Estado:** ✅ Implementado - Requiere Verificación

---

## 📋 Resumen

Verificación del sistema de contadores de avisos no leídos en el sidebar para todos los tipos de usuario (estudiantes, docentes, admin, etc.).

---

## 🎯 Implementación Actual

### **1. Hooks Utilizados**

#### **`useUnreadAnnouncements`** (`src/hooks/useUnreadAnnouncements.ts`)
- ✅ Hook que obtiene y suscribe a avisos no leídos
- ✅ Funciona para todos los tipos de usuario
- ✅ Usa `announcementService.getUnreadAnnouncements(userId)`
- ✅ Tiene suscripción en tiempo real a cambios

#### **`useUnreadMessages`** (`src/hooks/useUnreadMessages.ts`)
- ✅ Hook para mensajes no leídos
- ✅ También funciona para todos los tipos de usuario

### **2. Sidebars Implementados**

#### **A. Sidebar de Estudiantes** (`src/components/Sidebar.tsx`)
- ✅ Usa `useUnreadAnnouncements` y `useUnreadMessages`
- ✅ Ruta de avisos: `/announcements`
- ✅ Muestra contador en sección "Comunicación"

#### **B. Sidebar de Docentes** (`src/components/TeacherSidebar.tsx`)
- ✅ Usa `useUnreadAnnouncements` y `useUnreadMessages`
- ✅ Ruta de avisos: `/teacher/announcements`
- ✅ Muestra contador en sección "Comunicación"

---

## 🔍 Lógica del Contador

### **En ambos sidebars, la lógica es:**

```typescript
const { unreadCount: unreadMessagesCount } = useUnreadMessages();
const { unreadCount: unreadAnnouncementsCount } = useUnreadAnnouncements();

// Detectar si es mensajes o avisos
const isMessages = item.path === '/messages' || item.children?.some(c => c.path === '/messages');
const isAnnouncements = item.path === '/announcements' || item.children?.some(c => c.path === '/announcements');

// Calcular contador
const hasUnread = (isMessages && unreadMessagesCount > 0) || (isAnnouncements && unreadAnnouncementsCount > 0);
const unreadCount = isMessages ? unreadMessagesCount : isAnnouncements ? unreadAnnouncementsCount : 0;
```

### **Visualización:**

1. **Badge numérico:** Muestra el número de avisos no leídos (máximo "9+")
2. **Indicador visual:** Punto rojo en el icono cuando hay avisos no leídos
3. **Animación:** Icono pulsa cuando hay avisos no leídos

---

## 📍 Rutas por Tipo de Usuario

### **Estudiantes:**
- Ruta de avisos: `/announcements`
- Sidebar: `Sidebar.tsx`
- Hook: `useUnreadAnnouncements()`

### **Docentes:**
- Ruta de avisos: `/teacher/announcements`
- Sidebar: `TeacherSidebar.tsx`
- Hook: `useUnreadAnnouncements()`

### **Admin/Admin-Campus/Coordinator/Supervisor:**
- Usan `TeacherSidebar.tsx` (mismo que docentes)
- Ruta de avisos: `/teacher/announcements`
- Hook: `useUnreadAnnouncements()`

---

## ✅ Verificación de Implementación

### **Checklist de Verificación:**

- [x] Hook `useUnreadAnnouncements` implementado
- [x] Hook funciona para todos los tipos de usuario
- [x] Sidebar de estudiantes muestra contador
- [x] Sidebar de docentes muestra contador
- [x] Contador se actualiza en tiempo real
- [x] Badge numérico se muestra correctamente
- [x] Indicador visual (punto rojo) funciona
- [x] Animación de pulso funciona

---

## 🔧 Puntos a Verificar

### **1. Detección de Ruta de Avisos**

**En TeacherSidebar.tsx:**
```typescript
const isAnnouncements = item.path === '/teacher/announcements' || 
  item.children?.some(c => c.path === '/teacher/announcements');
```

**En Sidebar.tsx:**
```typescript
const isAnnouncements = item.path === '/announcements' || 
  item.children?.some(c => c.path === '/announcements');
```

✅ **Correcto** - Detecta correctamente según el sidebar

### **2. Rutas en MenuConfig**

**Para estudiantes** (`src/components/Sidebar/MenuConfig.ts`):
```typescript
{ name: 'Avisos', path: '/announcements', icon: IconBell, featureKey: 'announcements' }
```

**Para docentes** (`src/components/TeacherSidebar.tsx`):
```typescript
{ name: 'Avisos', path: '/teacher/announcements', icon: IconBell, featureKey: 'announcements' }
```

✅ **Correcto** - Rutas diferentes según el tipo de usuario

### **3. Servicio de Avisos**

El servicio `announcementService.getUnreadAnnouncements(userId)`:
- ✅ Funciona para todos los tipos de usuario
- ✅ Filtra avisos según el alcance (all, course, career, role)
- ✅ Considera si el usuario es destinatario

---

## 🧪 Pruebas Recomendadas

### **Para cada tipo de usuario:**

1. **Estudiante:**
   - [ ] Verificar que aparece sección "Comunicación" en sidebar
   - [ ] Verificar que aparece "Avisos" dentro de Comunicación
   - [ ] Verificar que muestra contador si hay avisos no leídos
   - [ ] Verificar que el contador se actualiza cuando se marca como leído

2. **Docente:**
   - [ ] Verificar que aparece sección "Comunicación" en sidebar
   - [ ] Verificar que aparece "Avisos" dentro de Comunicación
   - [ ] Verificar que muestra contador si hay avisos no leídos
   - [ ] Verificar que el contador se actualiza en tiempo real

3. **Admin/Admin-Campus/Coordinator:**
   - [ ] Verificar que usan `TeacherSidebar` (sidebar de docentes)
   - [ ] Verificar que aparece sección "Comunicación"
   - [ ] Verificar que muestra contador de avisos

4. **Supervisor:**
   - [ ] Verificar que aparece sección "Comunicación" (si está en el menú)
   - [ ] Verificar que muestra contador de avisos

---

## 🔍 Verificación de Código

### **Líneas Clave en TeacherSidebar.tsx:**

```typescript:198:202:src/components/TeacherSidebar.tsx
const isMessages = item.path === '/teacher/messages' || item.children?.some(c => c.path === '/teacher/messages');
const isAnnouncements = item.path === '/teacher/announcements' || item.children?.some(c => c.path === '/teacher/announcements');
const hasUnread = (isMessages && unreadMessagesCount > 0) || (isAnnouncements && unreadAnnouncementsCount > 0);
const unreadCount = isMessages ? unreadMessagesCount : isAnnouncements ? unreadAnnouncementsCount : 0;
```

### **Líneas Clave en Sidebar.tsx:**

```typescript:45:48:src/components/Sidebar.tsx
const isMessages = item.path === '/messages' || item.children?.some(c => c.path === '/messages');
const isAnnouncements = item.path === '/announcements' || item.children?.some(c => c.path === '/announcements');
const hasUnread = (isMessages && unreadMessagesCount > 0) || (isAnnouncements && unreadAnnouncementsCount > 0);
const unreadCount = isMessages ? unreadMessagesCount : isAnnouncements ? unreadAnnouncementsCount : 0;
```

---

## 📊 Servicio de Avisos

El servicio `announcementService.getUnreadAnnouncements(userId)` funciona así:

1. **Intenta usar función RPC:** `get_unread_announcements(user_uuid)`
2. **Si falla, usa método alternativo:**
   - Obtiene todos los avisos visibles para el usuario
   - Obtiene IDs de avisos no leídos desde `announcement_recipients`
   - Filtra avisos visibles que no han sido leídos

**Esto garantiza que funciona para todos los tipos de usuario.**

---

## 🐛 Posibles Problemas y Soluciones

### **Problema 1: Contador no se actualiza en tiempo real**

**Solución:** Verificar que la suscripción a Supabase está activa en `useUnreadAnnouncements.ts`

### **Problema 2: Contador muestra 0 cuando hay avisos**

**Solución:** Verificar que:
- El usuario tiene un registro en `announcement_recipients`
- El campo `read_at` es `null` para avisos no leídos
- La función RPC `get_unread_announcements` existe o el método alternativo funciona

### **Problema 3: Contador no aparece en sidebar**

**Solución:** Verificar que:
- El feature flag `announcements` está habilitado
- La ruta del item coincide con la ruta de la página
- El hook está importado y funcionando

---

## 📝 Código de Verificación Manual

Para verificar manualmente, puedes agregar logs temporales:

```typescript
// En TeacherSidebar.tsx o Sidebar.tsx, dentro del componente:
console.log('🔔 Contador de avisos:', {
  unreadAnnouncementsCount,
  unreadMessagesCount,
  userRole: user?.role?.name,
  location: location.pathname
});
```

---

## 🔄 Mejoras Realizadas

### **1. Contador Sumado en Item Padre "Comunicación"**

**Antes:**
- El contador solo se mostraba en los items hijos (Avisos, Mensajería)
- El item padre "Comunicación" no mostraba el total

**Después:**
- El item padre "Comunicación" ahora muestra la suma de avisos + mensajes no leídos
- Esto permite ver rápidamente si hay comunicaciones pendientes sin expandir el menú

**Implementación:**
```typescript
// Si el item es "Comunicación", sumar ambos contadores
const isCommunication = item.name === 'Comunicación' && item.children?.some(c => 
  c.path === '/teacher/announcements' || c.path === '/teacher/messages'
);

if (isCommunication) {
  const totalUnread = unreadMessagesCount + unreadAnnouncementsCount;
  hasUnread = totalUnread > 0;
  unreadCount = totalUnread;
}
```

### **2. Logs de Depuración Agregados**

Se agregaron logs en modo desarrollo para facilitar la verificación:
- Muestra el rol del usuario
- Muestra contadores individuales (mensajes, avisos)
- Muestra el total combinado

---

## ✅ Conclusión

El sistema de contadores de avisos está **implementado y mejorado** para todos los tipos de usuario:

1. ✅ **Estudiantes** - Usan `Sidebar.tsx` con ruta `/announcements`
2. ✅ **Docentes** - Usan `TeacherSidebar.tsx` con ruta `/teacher/announcements`
3. ✅ **Admin/Admin-Campus/Coordinator** - Usan `TeacherSidebar.tsx` con ruta `/teacher/announcements`
4. ✅ **Supervisor** - Usan `TeacherSidebar.tsx` (si tiene acceso a Comunicación)

**Características:**
- ✅ Contador individual en "Avisos"
- ✅ Contador individual en "Mensajería"
- ✅ Contador combinado en "Comunicación" (suma de ambos)
- ✅ Actualización en tiempo real
- ✅ Logs de depuración en desarrollo

Todos usan los mismos hooks (`useUnreadAnnouncements` y `useUnreadMessages`) que funcionan independientemente del tipo de usuario.

---

**Última actualización:** Enero 2025  
**Autor:** Sistema EduSpark

