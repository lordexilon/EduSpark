# Changelog - EduSpark

## [1.2.0] - 2026-01-25

### Añadido
- **Sistema de Voz Avanzado:** Integración de Gemini 2.5 Flash TTS para respuestas de audio expresivas.
- **Modos de Interacción:** Selector en la cabecera para cambiar entre modo Silencioso, Híbrido y Audio.
- **Configuración por Curso:** Los docentes ahora pueden habilitar o deshabilitar las funciones de audio por curso.
- **Vista de Estudiante:** Nuevo botón en la interfaz del docente para previsualizar el curso completo como un alumno.
- **Detección de Navegador:** Aviso automático sobre compatibilidad para usuarios de Brave.

### Mejoras
- **Optimización de Audio:** Pre-inicialización del `AudioContext` para eliminar retrasos en la primera respuesta.
- **UI/UX:** Mejorado el diseño de las tarjetas de curso y controles de audio.
- **Documentación:** Creadas guías de despliegue en GCP y contribución.

### Corregido
- Problemas de renderizado en el historial de mensajes del chat.
- Vulnerabilidades detectadas en el manejo de buffers de audio.
