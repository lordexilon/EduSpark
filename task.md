# Mapeo y FODA de la Plataforma EduSpark

- [x] Investigar estructura completa: rutas, servicios, roles, dependencias externas
- [x] Mapear funcionalidades por perfil de usuario (Admin, Teacher, Student, Supervisor)
- [x] Identificar servicios externos y costos (Supabase, Firebase, Gemini, etc.)
- [x] Crear documento de análisis FODA con hallazgos (Documento: MAPEO_Y_FODA_EDUSPARK_2026.md)
- [x] Entregar al usuario para revisión

# Implementación de Control de Costos y Ciclo Semanal
- [x] **Database**: Crear tabla `ai_limits` y lógica de RPC (Migración 20260214).
- [x] **Backend**: Integrar `checkAiEligibility` en `aiService.ts` y Tutor Virtual.
- [x] **Frontend**: Crear panel de control `AIControlPanel.tsx` para Admin.
- [x] **Ciclo Semanal**: Implementar `tutorWeeklyAnalysisService` para evaluaciones los viernes.
- [x] **Logros**: Implementar `certificateService` y generación de diplomas (jsPDF).
- [x] **UI**: Integrar Reporte Semanal y Botón de Certificado en el Panel de Contenido.
