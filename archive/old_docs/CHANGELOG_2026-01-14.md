# Changelog - 14 Enero 2026

## 🎯 Nuevas Funcionalidades

### Sistema de Control de Presupuesto del Tutor
- **Límite mensual:** $50 USD por usuario (configurable)
- **Límite diario:** $2 USD por usuario (configurable)
- **Tracking en tiempo real:** Costos diarios y mensuales
- **Bloqueo automático:** Previene interacciones cuando se alcanza el límite
- **Indicador visual:** Muestra presupuesto restante con colores (verde/amarillo/rojo)
- **Proyección mensual:** Calcula proyección basada en uso actual

### Tarjeta de Presupuesto en Analytics
- Nueva tarjeta en `/teacher/tutor-analytics`
- Muestra: costo usado / límite total, restante, proyección
- Presupuesto agregado del curso (suma de todos los estudiantes)
- Indicadores visuales de estado del presupuesto

### Despliegue Automatizado a Google Cloud Run
- Script PowerShell para despliegue automatizado
- Configuración de Cloud Build con variables de entorno
- Guía completa de despliegue y troubleshooting

---

## 🔧 Mejoras Técnicas

### Base de Datos
- **Nueva tabla:** `tutor_cost_tracking` - Tracking de costos diarios/mensuales
- **Nueva tabla:** `tutor_cost_limits` - Límites configurables por usuario/institución
- **Nuevas funciones SQL:**
  - `check_tutor_cost_limit()` - Verifica límites antes de interacción
  - `track_tutor_interaction_cost()` - Registra costos reales
  - `get_user_cost_stats()` - Obtiene estadísticas de presupuesto

### Frontend
- Integración de control de presupuesto en `TutorVirtualPage`
- Verificación de límites antes de enviar mensajes
- Tracking automático de costos después de respuestas
- Indicador visual de presupuesto en header del tutor
- Tarjeta de presupuesto en analytics de profesores

### Infraestructura
- Configuración de Cloud Build para despliegue automático
- Variables de entorno configuradas en build
- Script de despliegue automatizado
- Documentación de despliegue y troubleshooting

---

## 🐛 Correcciones

### Variables de Entorno en Build
- **Problema:** Variables `VITE_SUPABASE_ANON_KEY` y `VITE_GEMINI_API_KEY` vacías
- **Solución:** Actualización de `cloudbuild.yaml` con valores del `.env`
- **Resultado:** Frontend ahora se conecta correctamente a Supabase

---

## 📚 Documentación

### Nuevos Documentos
- `AI_CONTEXT/GUIA_DESPLIEGUE_FRONTEND_CLOUD_RUN_2026.md` - Guía de despliegue
- `AI_CONTEXT/VERIFICACION_DESPLIEGUE_FRONTEND_2026-01-14.md` - Verificación inicial
- `AI_CONTEXT/CORRECCION_VARIABLES_ENTORNO_DESPLIEGUE.md` - Corrección de variables
- `AI_CONTEXT/RESUMEN_SESION_2026-01-14.md` - Resumen completo de sesión
- `CHANGELOG_2026-01-14.md` - Este archivo

---

## 📦 Archivos Modificados

### Nuevos
- `sql_scripts/3_tutor_rag/112_control_presupuesto_50usd_mensual.sql`
- `scripts/deploy-frontend-cloudrun.ps1`
- `AI_CONTEXT/GUIA_DESPLIEGUE_FRONTEND_CLOUD_RUN_2026.md`
- `AI_CONTEXT/VERIFICACION_DESPLIEGUE_FRONTEND_2026-01-14.md`
- `AI_CONTEXT/CORRECCION_VARIABLES_ENTORNO_DESPLIEGUE.md`
- `AI_CONTEXT/RESUMEN_SESION_2026-01-14.md`
- `CHANGELOG_2026-01-14.md`

### Modificados
- `src/services/tutorCostService.ts`
- `src/pages/Student/TutorVirtualPage.tsx`
- `src/pages/Teacher/TeacherTutorAnalyticsPage.tsx`
- `cloudbuild.yaml`
- `package.json`

---

## 🚀 Despliegues

### Google Cloud Run
- **Servicio:** `eduspark-frontend`
- **URL:** https://eduspark-frontend-mcc5aevj6a-uc.a.run.app
- **Región:** us-central1
- **Build ID (Final):** `3265d201-2d27-406a-861e-5893bd336aae`
- **Estado:** ✅ SUCCESS

---

## ⚠️ Notas Importantes

### Variables de Entorno
- Las variables `VITE_*` se compilan en el bundle del frontend (visibles en el navegador)
- Esto es normal y esperado para `VITE_SUPABASE_ANON_KEY` (usa RLS para seguridad)
- `VITE_GEMINI_API_KEY` debe tener restricciones de dominio configuradas en Google Cloud Console

### Base de Datos
- Ejecutar `sql_scripts/3_tutor_rag/112_control_presupuesto_50usd_mensual.sql` en Supabase
- Las funciones SQL requieren permisos adecuados
- RLS policies están incluidas en el script

### Próximos Pasos
1. Probar login en producción
2. Verificar que el control de presupuesto funciona correctamente
3. Configurar restricciones de dominio para Gemini API
4. Monitorear costos reales y ajustar límites si es necesario

---

**Versión:** 1.0.0  
**Fecha:** 2026-01-14  
**Autor:** Sistema de Desarrollo
