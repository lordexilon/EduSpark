# Segmentación por Campus y Gestión Multiorganización
**Fecha:** 2026-02-16
**Estado:** Implementado

## 🎯 Objetivo
Habilitar el aislamiento de datos (Avisos y Mensajería) por institución/campus y permitir que los administradores globales gestionen la configuración de Landing Pages de todas las instituciones desde un panel centralizado.

## 🛠️ Cambios Realizados

### 1. Base de Datos (Supabase)
Se ejecutó la migración `20260216_add_institution_to_comms.sql` que realiza lo siguiente:
- Añade la columna `institution_id` (FK a `institutions`) a las tablas `announcements` y `conversations`.
- Crea índices para optimizar las consultas filtradas por campus.
- Permite valores nulos en `institution_id` para representar contenido "Global" (visible para todos los campus).

### 2. Autenticación y Contexto (`useAuth.tsx`)
Se refactorizó el proveedor de autenticación para resolver el problema de "Institución no asignada":
- Al validar la sesión, se consulta la tabla `user_institutions` para obtener la institución marcada como `is_primary`.
- El `institution_id` resultante se almacena en el objeto `user` global.
- Se mejoró la lógica de recuperación (fallback) para asegurar que el rol y la institución se carguen correctamente incluso si falla la consulta inicial con JOIN.

### 3. Avisos y Comunicación (`announcementService.ts`, `AnnouncementsPage.tsx`)
- **Filtro por ID**: El método `getVisibleAnnouncements` ahora acepta un `institutionId` opcional.
- **Lógica de Visibilidad**: La consulta en Supabase aplica un filtro `OR`: muestra avisos donde `institution_id` coincida con el del usuario O avisos donde `institution_id` sea NULL (Globales).
- **UI**: La página de avisos ahora pasa el ID de la institución del usuario actual al servicio.

### 4. Mensajería (`messagingService.ts`, `MessagingPage.tsx`)
- **Aislamiento de Chats**: Las conversaciones nuevas se etiquetan con el `institution_id` del creador.
- **Filtro de Lista**: `getMyConversations` filtra por institución para evitar que chats de un campus aparezcan en otro (útil para Docentes o Admins que operan en múltiples campus pero quieren verlos por separado).

### 5. Configuración de Landing Pages (`LandingPageConfigPage.tsx`)
- **Selector de Institución (Admin Only)**: Si el usuario es `admin`, se muestra un desplegable con todas las instituciones activas.
- **Creación Dinámica**: Permite a los administradores crear configuraciones de landing page desde cero para cualquier institución que aún no tenga una definida.
- **Sincronización de Logo**: Se corrigió la lógica para que el cambio de logo en la landing page actualice directamente el campo `logo_url` en el registro de la institución correspondiente.

## ⚠️ Notas Técnicas y Deuda
- **RLS**: Las políticas de Row Level Security (RLS) en Supabase deben revisarse para forzar este aislamiento a nivel de base de datos, además del filtro manual en el frontend.
- **Conversaciones Existentes**: Las conversaciones creadas antes de este cambio tienen `institution_id` NULL. Por diseño, serán tratadas como "Globales" y seguirán siendo visibles.

## ✅ Verificación
1. **Admin**: Puede cambiar entre instituciones en `/admin/settings/landing-page` y ver datos distintos.
2. **Usuario**: Al entrar a `/announcements`, ve avisos de su campus y avisos generales.
3. **Perfil**: El error "No hay configuración disponible" ya no bloquea a los administradores.
