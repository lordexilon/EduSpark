# Instrucciones para Ejecutar Análisis de Almacenamiento

## Opción 1: Análisis Rápido (Recomendado para empezar)

Ejecuta el archivo **`analizar_uso_almacenamiento_resumen.sql`** primero para ver un resumen ejecutivo con los datos más importantes.

### Pasos:
1. Abre Supabase Dashboard → SQL Editor
2. Copia y pega el contenido de `analizar_uso_almacenamiento_resumen.sql`
3. Ejecuta (Run)
4. Revisa los resultados

Este script te mostrará:
- ✅ Tamaño total de almacenamiento
- ✅ Cantidad de chunks, cursos y materiales
- ✅ Costos totales acumulados
- ✅ Proyección de ahorro con optimización
- ✅ Oportunidades de limpieza

---

## Opción 2: Análisis Completo (Para análisis detallado)

Ejecuta el archivo **`analizar_uso_almacenamiento.sql`** para ver todos los detalles.

### ⚠️ Importante:
Este script tiene **múltiples consultas separadas**. Puedes:

**Opción A: Ejecutar todo de una vez**
- Copia todo el contenido
- Ejecuta en Supabase SQL Editor
- Verás múltiples resultados (uno por cada SELECT)

**Opción B: Ejecutar por secciones (Recomendado)**
1. **Sección 1**: Análisis de almacenamiento (líneas 4-48)
2. **Sección 2**: Análisis de costos (líneas 50-86)
3. **Sección 3**: Oportunidades de optimización (líneas 88-127)
4. **Sección 4**: Proyección de costos (líneas 129-149)
5. **Sección 5**: Resumen ejecutivo (líneas 151-176)

---

## Interpretación de Resultados

### Tamaño de Almacenamiento
- **tamaño_total_tabla**: Tamaño completo (datos + índices)
- **tamaño_datos**: Solo los datos
- **tamaño_indices**: Solo los índices

### Costos
- **costo_total_usd**: Suma de todos los costos reales
- **costo_promedio_por_job**: Costo promedio por archivo procesado

### Optimización
- **promedio_chunks_por_pagina**: Si es < 0.04 (25 páginas/chunk), la optimización ayudará
- **porcentaje_reduccion**: Reducción estimada con chunks de 60 páginas

### Oportunidades
- **chunks_pequeños**: Chunks con <500 caracteres (pueden consolidarse)
- **chunks_huérfanos**: Chunks sin material_id (pueden eliminarse si no se usan)

---

## Ejemplo de Resultados Esperados

```
📊 ALMACENAMIENTO TOTAL: 15.2 GB
📦 TOTAL DE CHUNKS: 45,230
💰 COSTOS TOTALES: $234.56
📊 PÁGINAS POR CHUNK: 25.3 (actual) → objetivo: 60
🎯 PROYECCIÓN: 58% reducción estimada
```

---

## Próximos Pasos Después del Análisis

1. **Si el tamaño es > 50GB**: Las optimizaciones son críticas
2. **Si promedio_chunks_por_pagina < 0.04**: La optimización a 60 páginas ayudará mucho
3. **Si hay muchos chunks pequeños**: Considerar consolidación
4. **Si hay chunks huérfanos**: Evaluar si pueden eliminarse

---

## Notas

- Los resultados pueden tardar unos segundos si hay muchos datos
- Algunas consultas pueden no devolver resultados si las tablas están vacías
- Los tamaños se muestran en formato legible (GB, MB, KB)

