# 📚 EduSpark AI - Índice Maestro de Contexto

Este documento sirve como mapa principal para la documentación del proyecto. **Para cualquier Agente IA: Comienza leyendo este archivo.**

## 📂 Estructura de Directorios

### `01_ESTADO_PROYECTO.md`
**FUENTE ÚNICA DE VERDAD** sobre el estado actual del proyecto.
- Versión actual
- Funcionalidades implementadas
- Tareas pendientes
- Últimos cambios

### `02_ARQUITECTURA/`
Documentación técnica fundamental y decisiones de diseño.
- `arquitectura_educativa_completa.md`: Visión general del sistema.
- `schema_actual.md`: Esquema de base de datos (35 tablas).
- `flujos_criticos.md`: Autenticación, RLS, navegación.
- `modelo_datos_detallado.md`: Relaciones y tipos de datos.

### `03_GUIAS/`
Guías para desarrolladores y usuarios.
- `nomenclatura_standar.md`: Convenciones de código y nombres.
- `agent_instructions.md`: Instrucciones específicas para agentes IA.
- Guías de usuario final (Quizzes, Instituciones, etc.).

### `04_FEATURES/`
Documentación específica por funcionalidad.
- **Evaluación**: Quizzes, Trivias, Ponderaciones.
- **Instituciones**: Gestión multi-tenant, RLS.
- **Tutor IA**: RAG, integración con Gemini.
- **Tracking**: Sistema de progreso y analíticas.
- **Correcciones**: 
  - `CORRECCION_RLS_MATERIAL_COURSE_ASSIGNMENTS.md` - Corrección crítica de ambigüedad en RLS ⭐ NUEVO
  - `VISUALIZACION_MATERIALES_EN_CURSOS.md` - Visualización de materiales asignados en cursos ⭐ NUEVO
  - `CORRECCIONES_ERRORES_SISTEMA_ENERO_2025.md` - Correcciones críticas: RPC, TTS, RLS, Tracking, Vinculación Chunks (✅ Script SQL ejecutado) ⭐ NUEVO
- **Sistema de Progreso**:
  - `SISTEMA_PROGRESO_ESTUDIANTES_DOCENTES.md` - Sistema completo de tracking y visualización de progreso ⭐ NUEVO
  - `PROPUESTA_INTEGRACION_PROGRESO_TUTOR_ANALYTICS.md` - Integración progreso académico + tutor IA (implementado) ⭐ NUEVO
  - `INTEGRACION_PROGRESO_TUTOR_ANALYTICS_IMPLEMENTACION.md` - Detalles de implementación ⭐ NUEVO
  - `REPORTES_ADMINISTRATIVOS_ROLES.md` - Reportes por roles con exportación Excel/PDF ⭐ NUEVO
  - `CORRECCIONES_REPORTES_ADMINISTRATIVOS_ENERO_2025.md` - Correcciones críticas y mejoras en reportes administrativos ⭐ NUEVO
  - `SISTEMA_PAGOS_SUSPENSION_AUTOMATICA.md` - Sistema de pagos con suspensión/reactivación automática desde Excel ⭐ NUEVO
  - `SISTEMA_IMPORTACION_MASIVA_USUARIOS.md` - Importación masiva con Excel, nombres y documento de identidad ⭐ ACTUALIZADO
- **Flashcards**:
  - `RESUMEN_IMPLEMENTACION_FLASHCARDS.md` - Sistema completo de flashcards con Spaced Repetition ⭐ ACTUALIZADO
    - Opciones múltiples con feedback inmediato ⭐ NUEVO
    - Filtrado por unidad desde URL ⭐ NUEVO

### `EVALUACION_COTIZACION_NOVIEMBRE_2025.md` ⭐ NUEVO
**Evaluación completa de desarrollo y cotización del sistema.**
- Grado de desarrollo (85-90%)
- Fiabilidad del sistema (80-85%)
- Cotización detallada ($112,455 USD)
- Recomendaciones de mejora
- Proyección de valor con mejoras

### `archive/`
Histórico de análisis, planes antiguos y documentos obsoletos. Consultar solo si es necesario contexto histórico.

---

## 🤖 Protocolo de Carga de Contexto para IA

1.  **Leer `00_INDICE_MAESTRO.md`** (este archivo).
2.  **Leer `01_ESTADO_PROYECTO.md`** para entender la situación actual.
3.  **Si la tarea es sobre base de datos:** Leer `02_ARQUITECTURA/schema_actual.md`.
4.  **Si la tarea es sobre una feature específica:** Buscar en `04_FEATURES/`.
5.  **Si vas a escribir código:** Consultar `03_GUIAS/nomenclatura_standar.md`.

---

## 📅 Última Actualización
Enero 2025 - Mejoras Flashcards: Opciones múltiples con feedback inmediato y filtrado por unidad
