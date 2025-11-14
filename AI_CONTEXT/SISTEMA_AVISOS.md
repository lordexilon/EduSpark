# 📢 Sistema de Tablero de Avisos

## Descripción

Sistema completo de tablero de avisos que permite a profesores y administradores enviar comunicaciones a todos los usuarios o grupos específicos (cursos, carreras, roles), con tracking completo de recepción y lectura.

## Características

✅ **Alcance flexible**: Enviar a todos, cursos específicos, carreras o roles  
✅ **Tracking completo**: Saber cuántos recibieron y cuándo leyeron  
✅ **Prioridades**: Urgente, Alta, Normal, Baja  
✅ **Fijación**: Avisos importantes pueden fijarse  
✅ **Expiración**: Avisos con fecha de expiración  
✅ **Estadísticas**: Ver métricas de recepción y lectura  

## Estructura de Base de Datos

### Tabla: `announcements`
- `id` (UUID) - Identificador único
- `title` (VARCHAR) - Título del aviso
- `content` (TEXT) - Contenido del aviso
- `author_id` (UUID) - Usuario que creó el aviso
- `scope` (VARCHAR) - Alcance: 'all', 'course', 'career', 'role'
- `target_course_id` (INTEGER) - ID del curso si scope='course'
- `target_career_id` (INTEGER) - ID de la carrera si scope='career'
- `target_role_id` (INTEGER) - ID del rol si scope='role'
- `priority` (VARCHAR) - 'low', 'normal', 'high', 'urgent'
- `is_pinned` (BOOLEAN) - Si está fijado
- `is_active` (BOOLEAN) - Si está activo
- `published_at` (TIMESTAMPTZ) - Fecha de publicación
- `expires_at` (TIMESTAMPTZ) - Fecha de expiración
- `attachments` (JSONB) - Archivos adjuntos
- `metadata` (JSONB) - Metadatos adicionales

### Tabla: `announcement_recipients`
- `id` (UUID) - Identificador único
- `announcement_id` (UUID) - ID del aviso
- `recipient_id` (UUID) - ID del destinatario
- `sent_at` (TIMESTAMPTZ) - Cuándo se envió
- `received_at` (TIMESTAMPTZ) - Cuándo se recibió
- `read_at` (TIMESTAMPTZ) - Cuándo se leyó
- `notification_sent` (BOOLEAN) - Si se envió notificación
- `email_sent` (BOOLEAN) - Si se envió email

## Funciones SQL

### `create_announcement_recipients(announcement_uuid UUID)`
Crea automáticamente los registros de destinatarios según el alcance del aviso.

### `mark_announcement_read(announcement_uuid UUID, user_uuid UUID)`
Marca un aviso como leído por un usuario.

### `get_announcement_stats(announcement_uuid UUID)`
Retorna estadísticas del aviso:
- Total de destinatarios
- Cuántos recibieron
- Cuántos leyeron
- Porcentaje de lectura

## Servicio TypeScript

### `announcementService`

**Métodos principales:**
- `getVisibleAnnouncements(userId?)` - Obtener avisos visibles
- `getUnreadAnnouncements(userId)` - Obtener avisos no leídos
- `createAnnouncement(data, authorId)` - Crear nuevo aviso
- `markAsRead(announcementId, userId)` - Marcar como leído
- `getAnnouncementStats(announcementId)` - Obtener estadísticas
- `getMyAnnouncements(authorId)` - Obtener mis avisos (profesores)
- `updateAnnouncement(id, data, authorId)` - Actualizar aviso
- `deleteAnnouncement(id, authorId)` - Eliminar aviso (soft delete)
- `getAnnouncementRecipients(announcementId)` - Obtener destinatarios

## Páginas

### `AnnouncementsPage.tsx`
Página principal para ver todos los avisos visibles. Muestra:
- Avisos fijados primero
- Indicador de "Nuevo" para avisos no leídos
- Prioridad con colores
- Información del alcance
- Botón para marcar como leído

### `CreateAnnouncementPage.tsx` (Pendiente)
Página para crear/editar avisos. Permite:
- Seleccionar alcance (todos, curso, carrera, rol)
- Establecer prioridad
- Fijar aviso
- Establecer fechas de publicación y expiración
- Adjuntar archivos

### `AnnouncementStatsPage.tsx` (Pendiente)
Página de estadísticas para profesores. Muestra:
- Lista de avisos creados
- Estadísticas de cada aviso
- Gráficos de recepción y lectura
- Lista de destinatarios con estado

## Rutas

- `/announcements` - Ver avisos (estudiantes)
- `/teacher/announcements` - Ver avisos (profesores)
- `/teacher/announcements/new` - Crear aviso
- `/teacher/announcements/:id/edit` - Editar aviso
- `/teacher/announcements/:id/stats` - Estadísticas del aviso

## Seguridad (RLS)

- **Lectura**: Todos pueden ver avisos activos y publicados
- **Creación**: Solo profesores, coordinadores y admins
- **Edición**: Solo el autor del aviso
- **Eliminación**: Autor o administradores
- **Destinatarios**: Usuarios solo ven sus propios registros

## Próximos Pasos

1. ✅ Script SQL creado
2. ✅ Servicio TypeScript creado
3. ✅ Página de visualización creada
4. ⏳ Página de creación/edición
5. ⏳ Página de estadísticas
6. ⏳ Agregar rutas en App.tsx
7. ⏳ Agregar componente en Dashboard
8. ⏳ Notificaciones en tiempo real
9. ⏳ Envío de emails

