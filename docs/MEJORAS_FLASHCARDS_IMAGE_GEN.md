# 🎴 Mejoras en Generación de Flashcards e Imágenes con IA

**Fecha:** 14 de febrero de 2026  
**Versión:** 1.x  
**Autor:** EduSpark Dev Team  

---

## 📋 Resumen de Cambios

Esta actualización mejora significativamente el flujo de generación de flashcards, corrige errores críticos en la generación de imágenes con IA, y agrega funcionalidad de eliminación selectiva de tarjetas.

---

## 🔧 Cambios Realizados

### 1. Corrección de Generación de Imágenes con Gemini

**Problema:** La generación de imágenes fallaba silenciosamente con errores de timeout y modelos incorrectos.

**Causa raíz identificada:**
- Se usaba el modelo `gemini-2.0-flash-exp` que NO soporta generación de imágenes
- Se intentó `imagen-3.0-generate-002` que solo funciona con Vertex AI (no con AI Studio)
- La autenticación usaba `?key=` en la URL en vez del header correcto
- El modelo de imagen requiere plan de pago (free tier tiene limit: 0)

**Solución implementada:**
- **Modelo correcto:** `gemini-2.5-flash-image` (modelo oficial de Google para generación de imágenes)
- **Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`
- **Autenticación:** Header `x-goog-api-key` (según documentación oficial)
- **Response Modalities:** `["TEXT", "IMAGE"]`
- **Timeout:** 30 segundos con `AbortController`

**Archivos modificados:**
- `supabase/functions/generate-flashcards/index.ts` — Sección `generate-image`

### 2. Eliminación de Generación Masiva de Imágenes

**Problema:** Al generar flashcards en lote con la opción "Generar Imágenes" activada, se disparaban 10+ llamadas paralelas a la API de Gemini, causando:
- Errores 429 (cuota excedida)
- Bloqueo completo del flujo de generación
- Experiencia de usuario degradada

**Solución:**
- ❌ Se eliminó el checkbox **"Generar Imágenes (Experimental)"** del paso de selección de temas
- ❌ Se eliminó la lógica de generación masiva de imágenes en `handleGenerateCards()`  
- ✅ Las tarjetas se crean ahora **sin imágenes** (solo texto)
- ✅ La generación de imágenes se realiza **individualmente** desde el modal de edición

**Archivos modificados:**
- `src/components/Features/flashcards/FlashcardGenerator.tsx`

### 3. Mejora en Mensajes de Error de Imágenes

**Problema:** Los errores de la API de Gemini se mostraban solo en consola con un mensaje genérico.

**Solución:**
- El backend ahora devuelve el **error detallado** de Gemini al frontend
- El modal de edición muestra **alertas amigables** según el tipo de error:
  - **429 (Cuota):** Mensaje explicando opciones (facturación, esperar, URL externa)
  - **Timeout:** Sugerencia de simplificar el prompt
  - **Otros:** Mensaje genérico en el preview

**Archivos modificados:**
- `supabase/functions/generate-flashcards/index.ts`
- `src/components/Features/flashcards/EditFlashcardModal.tsx`

### 4. Selección Múltiple para Eliminar Tarjetas

**Funcionalidad nueva:** Permite seleccionar y eliminar múltiples tarjetas antes de guardar.

**Características:**
- ✅ **Checkbox por tarjeta** — A la izquierda de cada flashcard
- ✅ **Barra de acciones** — Con "Seleccionar todas" y botón de eliminar
- ✅ **Contador visual** — Badge mostrando "X seleccionadas"
- ✅ **Confirmación** — Diálogo de confirmación antes de eliminar
- ✅ **Efecto visual** — Tarjetas seleccionadas se atenúan con borde rojo

**Archivos modificados:**
- `src/components/Features/flashcards/FlashcardGenerator.tsx`

---

## 🎯 Flujo de Usuario Actualizado

### Generar Flashcards (Profesor)

```
1. Subir documento (PDF/Video/Texto)
   └── El sistema analiza el contenido con Gemini

2. Seleccionar temas y cantidad de tarjetas
   └── Sin opción de imágenes masivas (eliminada)

3. Revisar tarjetas generadas
   ├── ✏️ Editar cualquier tarjeta individualmente
   │    └── 🖼️ Generar imagen con IA (botón individual)
   ├── ☑️ Seleccionar tarjetas no deseadas
   │    └── 🗑️ Eliminar seleccionadas
   └── 💾 Guardar en colección
```

### Generar Imagen Individual (en Modal de Edición)

```
1. Abrir modal de edición de una tarjeta
2. (Opcional) Escribir una descripción de imagen personalizada
3. (Opcional) Clic en ✨ para optimizar el prompt con IA
4. Clic en "Generar Imagen"
   ├── ✅ Éxito: La imagen aparece en el preview
   ├── ⚠️ Error 429: Alerta de cuota agotada con opciones
   └── ⏱️ Timeout: Sugerencia de simplificar prompt
5. La imagen se guarda como data:image/png;base64 en la tarjeta
```

---

## 📁 Archivos Modificados

| Archivo | Tipo de Cambio |
|---------|---------------|
| `supabase/functions/generate-flashcards/index.ts` | Corrección modelo Gemini, errores detallados |
| `src/components/Features/flashcards/FlashcardGenerator.tsx` | Eliminación gen. masiva, multi-select delete |
| `src/components/Features/flashcards/EditFlashcardModal.tsx` | Alertas amigables de error |
| `src/services/aiService.ts` | Manejo de errores del backend |

---

## ⚙️ Configuración Requerida

### API Key de Google AI Studio

La generación de imágenes requiere una API Key de Google AI Studio con **facturación habilitada**:

1. Ir a [Google AI Studio](https://aistudio.google.com/)
2. Obtener una API Key
3. Habilitar facturación (el modelo de imágenes NO funciona en plan gratuito)
4. Configurar la variable `GEMINI_API_KEY` en los secrets de Supabase Edge Functions

> **Nota:** El modelo `gemini-2.5-flash-image` tiene limit: 0 en el free tier. Se requiere plan de pago para generar imágenes.

### Modelo Utilizado

| Modelo | Uso | Resolución |
|--------|-----|-----------|
| `gemini-2.5-flash-image` | Generación de imágenes | 1024px |
| `gemini-2.0-flash` | Generación de texto/flashcards | N/A |

---

## 🐛 Problemas Conocidos y Soluciones

| Problema | Causa | Solución |
|----------|-------|---------|
| Error 429 al generar imagen | Cuota agotada o plan gratuito | Habilitar facturación en Google AI Studio |
| Timeout 30s | Prompt muy complejo o API lenta | Simplificar el prompt de imagen |
| Imagen no aparece | Error en la API silencioso | Revisar consola para el error detallado |

---

## 📊 Impacto

- **Estabilidad:** La generación de flashcards ya no falla por errores de imagen
- **UX:** El profesor tiene control total sobre qué tarjetas conservar
- **Rendimiento:** Sin 10+ llamadas paralelas a la API de imágenes
- **Debugging:** Errores detallados visibles tanto en consola como en UI

---

## 🔗 Referencias

- [Documentación oficial de Gemini Image Generation](https://ai.google.dev/gemini-api/docs/image-generation)
- [Google AI Studio Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
