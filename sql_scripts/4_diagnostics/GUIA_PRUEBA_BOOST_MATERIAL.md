# Guía de Prueba: Boost por Material

**Fecha:** Enero 2025  
**Optimización:** Boost por Material - Priorizar "Williams Gineco.pdf"  
**Estado:** ✅ Implementado - Listo para probar

---

## 🧪 Pasos para Probar

### 1. Iniciar Servidor de Desarrollo

```bash
# Si no está corriendo, ejecutar:
npm run dev

# O si hay problemas de caché:
npm run dev:clean
```

**Verificar:** Deberías ver:
```
VITE v6.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

---

### 2. Abrir la Aplicación

1. Abre el navegador: `http://localhost:5173`
2. Inicia sesión como estudiante
3. Ve al **Curso 12** (Ginecología-Obstetricia)
4. Abre el **Tutor Virtual**

---

### 3. Probar la Búsqueda

#### Query de Prueba:
```
estadio cancer mama
```

**O también puedes probar:**
- "estadificación del cáncer mamario"
- "estadio cáncer de mama"
- "clasificación TNM cáncer mama"

---

### 4. Verificar Logs en Consola

Abre la **Consola del Navegador** (F12 → Console) y busca:

#### ✅ Logs Esperados (Éxito):

```
✅ RAGService - Encontrados X chunks con búsqueda de texto completo (SIN costo de embedding)
✅ RAGService - X chunks prioritarios encontrados, priorizados en resultados
```

**Ejemplo:**
```
✅ RAGService - Encontrados 30 chunks con búsqueda de texto completo (SIN costo de embedding)
✅ RAGService - 3 chunks prioritarios encontrados, priorizados en resultados
```

#### ⚠️ Si NO ves el segundo log:
- Significa que no se encontraron chunks de "Williams Gineco.pdf"
- Puede ser que el material no esté en los primeros 30 resultados de la RPC
- O que el nombre del archivo no coincida exactamente

---

### 5. Verificar Resultados

#### ✅ Resultado Esperado:

El tutor debería:
1. **Encontrar información** sobre estadificación del cáncer de mama
2. **Mencionar "Williams Ginecología"** o "Williams Gineco.pdf" en la respuesta
3. **Incluir información de páginas** (ej: páginas 371-375)

#### ❌ Si NO funciona:

**Síntomas:**
- El tutor dice "no encuentro información"
- No menciona "Williams Ginecología"
- Respuesta genérica sin detalles específicos

**Posibles causas:**
1. El material no está en los primeros 30 resultados de la RPC
2. El nombre del archivo no coincide (verificar en metadata)
3. Los chunks no tienen el contenido esperado

---

## 🔍 Diagnóstico Rápido

### Verificar que el Material Existe

Ejecuta en Supabase SQL Editor:

```sql
-- Verificar si existe "Williams Gineco.pdf" en curso 12
SELECT 
  metadata->>'file_name' as archivo,
  COUNT(*) as cantidad_chunks
FROM course_content_chunks
WHERE 
  course_id = 12
  AND metadata->>'file_name' ILIKE '%williams%gineco%'
GROUP BY metadata->>'file_name';
```

**Resultado esperado:**
```
archivo              | cantidad_chunks
---------------------|----------------
Williams Gineco.pdf  | 727
```

### Verificar Búsqueda RPC

```sql
-- Probar la función RPC directamente
SELECT 
  metadata->>'file_name' as archivo,
  metadata->>'pageStart' as pagina,
  LEFT(content, 200) as preview
FROM search_course_content_chunks_text_clean(
  'estadio cancer mama',
  12,
  30,  -- result_limit
  0.001 -- min_relevance
)
WHERE metadata->>'file_name' ILIKE '%williams%gineco%'
LIMIT 5;
```

**Resultado esperado:**
- Debería mostrar chunks de "Williams Gineco.pdf"
- Con páginas alrededor de 371-375

---

## 📊 Qué Observar

### 1. Logs de Consola

**Buscar:**
- `✅ RAGService - X chunks prioritarios encontrados`
- Este log confirma que el boost está funcionando

### 2. Respuesta del Tutor

**Verificar:**
- ¿Menciona "Williams Ginecología" o "Williams Gineco.pdf"?
- ¿Incluye información específica sobre estadificación?
- ¿Menciona páginas (ej: "páginas 371-375")?

### 3. Tiempo de Respuesta

**Esperado:**
- 1-3 segundos (similar a antes)
- No debería aumentar significativamente

---

## 🐛 Solución de Problemas

### Problema 1: No aparece el log de chunks prioritarios

**Causa:** El material no está en los primeros 30 resultados de la RPC

**Solución:**
1. Verificar que el material existe (SQL arriba)
2. Verificar que la búsqueda RPC lo encuentra
3. Si no, puede necesitar aumentar `result_limit` a 50

### Problema 2: El log aparece pero el tutor no menciona el material

**Causa:** El LLM (Gemini) no está usando el contexto priorizado

**Solución:**
- Verificar que los chunks prioritarios tienen contenido relevante
- Puede necesitar ajustar el prompt (futura optimización)

### Problema 3: Error en consola

**Causa:** Error de sintaxis o tipo

**Solución:**
1. Verificar que el código se compiló correctamente
2. Revisar errores en consola del navegador
3. Verificar que `courseIdInt` es un número válido

---

## ✅ Checklist de Prueba

- [ ] Servidor de desarrollo corriendo (`npm run dev`)
- [ ] Aplicación abierta en navegador
- [ ] Consola del navegador abierta (F12)
- [ ] Curso 12 seleccionado
- [ ] Tutor Virtual abierto
- [ ] Query enviada: "estadio cancer mama"
- [ ] Log de chunks prioritarios visible
- [ ] Respuesta del tutor menciona "Williams Ginecología"
- [ ] Respuesta incluye información específica

---

## 📝 Notas

- **Primera prueba:** Puede tardar un poco más (caché frío)
- **Pruebas subsecuentes:** Deberían ser más rápidas (caché)
- **Si no funciona:** Revisar logs y ejecutar SQL de diagnóstico

---

**Última actualización:** Enero 2025  
**Autor:** Guía de prueba para optimización Boost por Material
