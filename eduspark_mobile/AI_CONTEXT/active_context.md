# Contexto Activo: EduSpark Mobile 🧠

## 📅 Última Actualización: 2026-05-16
## 🎯 Objetivo Actual: Inicialización del Proyecto

## 🏗️ Estado de la Tarea
- [x] Escaneo de Stack Tecnológico (Flutter + Supabase)
- [x] Mapeo de Arquitectura
- [x] Generación de AI_CONTEXT inicial
- [x] Estabilización de entorno (Fix permisos SDK + build/ cache)
- [x] Documentación de requisitos de entorno (Developer Mode)
- [x] Habilitar navegación por pestañas (Inicio, Cursos, Tutor, Perfil)
- [x] Implementar Logout funcional (Drawer + Profile Tab + AppBar)
- [x] Corregir error de ambigüedad en Supabase (Fix PGRST201)
- [x] Inyectar dependencias de contenido (YouTube, Markdown, URL Launcher)
- [ ] Listo para recibir nuevas tareas de desarrollo

## 📝 Notas de Contexto
- El proyecto utiliza **Supabase** como backend principal.
- Se ha implementado una arquitectura de navegación basada en `IndexedStack` en `DashboardScreen`.
- El cierre de sesión ahora limpia tanto la sesión de Supabase como el `flutter_secure_storage`.
- Se requiere especificar explícitamente las claves foráneas en las consultas de Supabase cuando hay ambigüedad (ej. `users!subject_assignments_teacher_id_fkey`).
- El soporte para videos de YouTube y Markdown está habilitado mediante `youtube_player_iframe` y `flutter_markdown`.

## 🚀 Próximos Pasos Recomendados
- Implementar la lógica real del "Tutor AI" en la pestaña correspondiente.
- Optimizar la carga de imágenes (avatars y miniaturas) con `cached_network_image`.
- Asegurar consistencia visual total en `lib/native_v2/`.
