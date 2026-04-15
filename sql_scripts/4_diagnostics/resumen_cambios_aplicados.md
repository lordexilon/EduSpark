# Resumen de Cambios Aplicados para Solucionar Problema de Búsqueda

**Fecha:** Enero 2025  
**Problema:** "Williams Gineco.pdf" no aparece en los resultados de búsqueda "estadio cancer mama"  
**Causa raíz:** Ranking bajo (0.417) vs Schwartz (1.0) + límites demasiado restrictivos

---

## ✅ Cambios Aplicados

### 1. Aumentar límite de resultados de la función RPC
**Archivo:** `src/modules/tutor/services/ragService.ts`
- **Línea 378:** `result_limit: 15` → `result_limit: 30`
- **Línea 436:** `result_limit: 15` → `result_limit: 30` (función fallback)
- **Impacto:** La función RPC ahora devuelve hasta 30 resultados en lugar de 15

### 2. Aumentar chunks procesados
**Archivo:** `src/modules/tutor/services/ragService.ts`
- **Línea 484:** `textChunks.slice(0, 5)` → `textChunks.slice(0, 15)`
- **Impacto:** Ahora se procesan hasta 15 chunks en lugar de 5

### 3. Aumentar chunks incluidos en el prompt
**Archivo:** `src/modules/tutor/services/ragService.ts`
- **Línea 1354:** `maxItems = 7` → `maxItems = 10`
- **Línea 1355:** `maxChunks = 5` → `maxChunks = 10`
- **Impacto:** El prompt ahora incluye hasta 10 chunks en lugar de 5

---

## 📊 Comparación Antes/Después

| Parámetro | Antes | Después | Mejora |
|-----------|-------|---------|--------|
| `result_limit` (RPC) | 15 | 30 | +100% |
| Chunks procesados (`slice`) | 5 | 15 | +200% |
| Chunks en prompt (`maxChunks`) | 5 | 10 | +100% |
| Items totales en prompt (`maxItems`) | 7 | 10 | +43% |

---

## ⚠️ Impacto Esperado

### Positivo:
- ✅ Incluirá más resultados, incluyendo "Williams Gineco.pdf" con ranking 0.417
- ✅ Mejor cobertura de diferentes materiales
- ✅ Más contexto para el tutor

### Negativo:
- ⚠️ **Mayor tiempo de respuesta** (más resultados a procesar)
- ⚠️ **Mayor tamaño del prompt** (más tokens enviados a Gemini)
- ⚠️ **Mayor costo** (si Gemini cobra por tokens)

---

## 🔄 Próximos Pasos

1. **Rebuild/Redeploy:** Los cambios requieren rebuild/redeploy para aplicarse
2. **Monitorear tiempo de respuesta:** Si es demasiado alto (>5 segundos), considerar:
   - Reducir `result_limit` a 25
   - Reducir `maxChunks` a 8
   - Implementar paginación
3. **Probar búsqueda:** Ejecutar búsqueda "estadio cancer mama" y verificar si encuentra "Williams Gineco.pdf"

---

## 📝 Notas

- Los cambios están aplicados en el código fuente
- **Requerido:** Rebuild/redeploy para que surtan efecto
- **Recomendado:** Monitorear tiempo de respuesta después del deploy
- Si el tiempo es aceptable pero aún no funciona, verificar:
  - Que "Williams Gineco.pdf" esté en los primeros 30 resultados de la RPC
  - Que esté en los primeros 15 chunks procesados
  - Que esté en los primeros 10 chunks incluidos en el prompt

---

**Última actualización:** Enero 2025
