# Mejoras Recientes - Enero 2025

## Estado: ✅ IMPLEMENTADO

### Fecha: Enero 2025

---

## Resumen

Este documento describe las mejoras implementadas en enero de 2025, incluyendo:
1. Sistema de reportes de consumo de IA para administradores
2. Mejoras en el chat del asistente IA (formato Markdown, expandir/colapsar, exportar)
3. Mejora de visibilidad del icono del chat flotante

---

## 1. Sistema de Reportes de Consumo de IA

### Descripción

Sistema completo para rastrear y reportar el consumo de tokens y costos de Gemini API por usuario, permitiendo a los administradores monitorear el uso de recursos de IA en la plataforma.

### Componentes Implementados

#### 1.1 Base de Datos (`sql_scripts/102_create_ai_usage_tracking.sql`)

**Tabla Principal: `ai_usage_tracking`**
- Almacena cada uso de tokens con información detallada:
  - `user_id`: Usuario que realizó la consulta
  - `course_id`: Curso asociado (opcional)
  - `session_id`: Sesión asociada (opcional)
  - `model`: Modelo de Gemini utilizado (ej: gemini-2.5-flash)
  - `request_type`: Tipo de solicitud (chat, embedding, transcription, etc.)
  - `conversation_id`: ID de conversación si aplica
  - `input_tokens`: Tokens de entrada (prompt)
  - `output_tokens`: Tokens de salida (respuesta)
  - `total_tokens`: Total de tokens
  - `input_cost`: Costo de tokens de entrada en USD
  - `output_cost`: Costo de tokens de salida en USD
  - `total_cost`: Costo total en USD
  - `metadata`: Metadatos adicionales (JSONB)

**Vistas para Reportes:**
- `ai_usage_daily_stats`: Estadísticas diarias por usuario y modelo
- `ai_usage_monthly_stats`: Estadísticas mensuales por usuario y modelo
- `ai_usage_user_totals`: Totales acumulados por usuario

**Políticas RLS:**
- Usuarios pueden ver solo sus propios registros
- Administradores y coordinadores pueden ver todos los registros
- Usuarios pueden insertar sus propios registros

#### 1.2 Servicio de Tracking (`services/aiUsageService.ts`)

**Funciones Principales:**
- `recordUsage()`: Registra el uso de tokens en la base de datos
- `getUserUsageStats()`: Obtiene estadísticas de uso por usuario
- `getDailyUsageStats()`: Obtiene estadísticas diarias agregadas
- `getMonthlyUsageStats()`: Obtiene estadísticas mensuales agregadas
- `getTotalUsageStats()`: Obtiene totales generales del sistema

**Cálculo de Costos:**
- Precios actualizados de Gemini API (por 1M tokens):
  - `gemini-1.5-flash`: $0.075 entrada / $0.30 salida
  - `gemini-1.5-pro`: $1.25 entrada / $5.00 salida
  - `gemini-2.5-flash`: $0.075 entrada / $0.30 salida
  - `gemini-2.5-pro`: $1.25 entrada / $5.00 salida

#### 1.3 Integración con RAG (`audio-tutor/services/ragService.ts`)

**Registro Automático:**
- Cada consulta RAG registra automáticamente el uso de tokens en la BD
- Captura contexto completo: userId, courseId, sessionId, conversationId
- Manejo de errores sin afectar el flujo principal
- Registro dual: localStorage (existente) + Base de Datos (nuevo)

**Flujo de Registro:**
1. Usuario envía mensaje al chat de IA
2. RAGAgent procesa la consulta con Gemini API
3. Se obtienen tokens de entrada y salida de la respuesta
4. Se registra en localStorage (sistema existente)
5. Se registra en BD para reportes de administración

#### 1.4 Página de Administración (`pages/AIUsageReportPage.tsx`)

**Características:**
- **Vista por Usuario**: Muestra consumo individual con nombre, email, solicitudes, tokens y costos
- **Vista Diaria**: Consumo agregado por día
- **Vista Mensual**: Consumo agregado por mes
- **Estadísticas Totales**: Tarjetas con totales de solicitudes, tokens, costos y usuarios únicos
- **Filtros**: Rango de fechas (7d, 30d, 90d, todo el tiempo)
- **Exportación**: Descarga de reporte completo en formato JSON

**Acceso:**
- Ruta: `/admin/ai-usage`
- Protegida con `AdminRoute`
- Solo accesible para administradores y coordinadores
- Visible en el sidebar de administración

### Archivos Relacionados

- `sql_scripts/102_create_ai_usage_tracking.sql`
- `services/aiUsageService.ts`
- `pages/AIUsageReportPage.tsx`
- `audio-tutor/services/ragService.ts`
- `components/TeacherSidebar.tsx` (enlace agregado)
- `App.tsx` (ruta agregada)

---

## 2. Mejoras en el Chat del Asistente IA

### Descripción

Mejoras significativas en la experiencia de usuario del chat del asistente IA, incluyendo formato Markdown, capacidad de expandir/colapsar mensajes largos, y exportación de conversaciones.

### Componentes Implementados

#### 2.1 Formato Markdown (`components/AssistantIA.tsx`)

**Características:**
- Los mensajes del asistente se renderizan con formato Markdown completo
- Soporte para:
  - **Negritas** (`**texto**`)
  - *Cursivas* (`*texto*`)
  - `Código inline` (`` `código` ``)
  - Bloques de código (```código```)
  - Listas ordenadas y no ordenadas
  - Encabezados (##, ###)
  - Citas (blockquote)

**Componente Utilizado:**
- `MarkdownText`: Componente reutilizable para renderizar Markdown
- Los mensajes del usuario mantienen formato simple (texto plano)

#### 2.2 Expandir/Colapsar Mensajes Largos

**Funcionalidad:**
- Mensajes mayores a 200 caracteres se muestran truncados inicialmente
- Botón "Mostrar más" / "Mostrar menos" para expandir/colapsar
- Estado independiente por mensaje
- Indicador visual claro con iconos de chevron

**Implementación:**
- Estado `expandedMessages` para rastrear qué mensajes están expandidos
- Función `toggleMessageExpand()` para cambiar el estado
- Función `isLongMessage()` para detectar mensajes largos
- Función `truncateMessage()` para truncar texto

#### 2.3 Exportar Conversación

**Funcionalidad:**
- Botón de exportar en el header del chat
- Solo visible cuando hay más de 1 mensaje
- Exporta a archivo `.txt` con formato legible
- Nombre de archivo: `conversacion-eduspark-YYYY-MM-DD.txt`

**Formato de Exportación:**
```
Tú: [mensaje del usuario]

---

Asistente IA: [respuesta del asistente]

---

Tú: [siguiente mensaje]
...
```

#### 2.4 Mejoras Visuales

**Espaciado y Legibilidad:**
- Mejor espaciado en mensajes (`py-3` en lugar de `py-2`)
- Alineación mejorada (`items-start` en lugar de `items-end`)
- Mejor manejo de texto largo (`break-words`, `whitespace-pre-wrap`)

### Archivos Relacionados

- `components/AssistantIA.tsx`
- `components/MarkdownText.tsx`

---

## 3. Mejora de Visibilidad del Icono del Chat

### Descripción

Mejora significativa en la visibilidad del botón flotante del chat para que sea más fácil de identificar y acceder.

### Cambios Implementados

#### 3.1 Estilos Mejorados (`components/AssistantIA.tsx`)

**Antes:**
- Color de fondo: `bg-secondary` (podía ser transparente)
- Sombra: `shadow-lg`
- Sin borde definido

**Después:**
- Color de fondo explícito: `#9333ea` (purple-600)
- `opacity: 1` para evitar transparencia
- Sombra más fuerte: `shadow-2xl` + `boxShadow` personalizado
- Borde blanco de 2px para destacar
- Efecto de sombra en el icono (`drop-shadow`)

**Código CSS Aplicado:**
```typescript
style={{ 
  backgroundColor: '#9333ea', // purple-600
  opacity: 1,
  boxShadow: '0 10px 25px rgba(147, 51, 234, 0.4), 0 0 0 2px rgba(255, 255, 255, 0.1)'
}}
```

### Archivos Relacionados

- `components/AssistantIA.tsx`

---

## Instrucciones de Uso

### Para Administradores: Ver Reportes de Consumo de IA

1. **Acceder al Reporte:**
   - Navegar a `/admin/ai-usage` o hacer clic en "Consumo de IA" en el sidebar de administración
   - Solo visible para usuarios con rol `admin` o `coordinator`

2. **Filtrar Datos:**
   - Seleccionar rango de fechas: Últimos 7 días, 30 días, 90 días, o Todo el tiempo
   - Cambiar vista: Por Usuario, Diario, o Mensual

3. **Exportar Reporte:**
   - Hacer clic en el botón "Exportar"
   - Se descargará un archivo JSON con todos los datos del reporte

### Para Usuarios: Usar el Chat Mejorado

1. **Ver Mensajes Formateados:**
   - Los mensajes del asistente se muestran automáticamente con formato Markdown
   - Los mensajes largos se muestran truncados con opción de expandir

2. **Expandir Mensajes Largos:**
   - Hacer clic en "Mostrar más" para ver el mensaje completo
   - Hacer clic en "Mostrar menos" para colapsar nuevamente

3. **Exportar Conversación:**
   - Hacer clic en el icono de descarga en el header del chat
   - Se descargará un archivo de texto con toda la conversación

---

## Configuración Requerida

### Base de Datos

1. **Ejecutar Script SQL:**
   ```sql
   -- Ejecutar en Supabase SQL Editor
   -- Archivo: sql_scripts/102_create_ai_usage_tracking.sql
   ```

2. **Verificar Tablas Creadas:**
   - `ai_usage_tracking`
   - Vistas: `ai_usage_daily_stats`, `ai_usage_monthly_stats`, `ai_usage_user_totals`

3. **Verificar Políticas RLS:**
   - Usuarios pueden ver solo sus registros
   - Administradores pueden ver todos los registros

### Frontend

No se requiere configuración adicional. El sistema funciona automáticamente una vez que:
- El script SQL ha sido ejecutado
- Los usuarios comienzan a usar el chat de IA

---

## Próximas Mejoras Sugeridas

### Reportes de Consumo de IA

- [ ] Gráficos visuales (charts) para consumo diario/mensual
- [ ] Alertas automáticas cuando el consumo excede umbrales
- [ ] Comparación de consumo entre usuarios
- [ ] Filtros adicionales (por curso, por modelo, etc.)
- [ ] Exportación a CSV y Excel

### Chat del Asistente IA

- [ ] Soporte para imágenes en mensajes
- [ ] Búsqueda dentro de la conversación
- [ ] Historial de conversaciones anteriores
- [ ] Temas personalizables (claro/oscuro)
- [ ] Notificaciones de nuevas respuestas

---

## Referencias

- [Implementación de Videos y Transcripciones](./IMPLEMENTACION_VIDEOS_TRANSCRIPCIONES.md)
- [Botón Completado de Videos](./BOTON_COMPLETADO_VIDEOS.md)
- [Sistema A2A Local](./VERIFICACION_ENV_A2A.md)

---

## Notas Técnicas

### Precisión de Costos

Los costos se calculan basándose en los precios oficiales de Gemini API. Si los precios cambian, actualizar la constante `GEMINI_PRICING` en `services/aiUsageService.ts`.

### Rendimiento

- Los índices en la tabla `ai_usage_tracking` están optimizados para consultas rápidas
- Las vistas materializadas pueden mejorar el rendimiento en reportes grandes
- Considerar agregar índices adicionales si el volumen de datos crece significativamente

### Privacidad

- Los usuarios solo pueden ver sus propios datos de consumo
- Los administradores pueden ver todos los datos para monitoreo y facturación
- Los datos se almacenan indefinidamente (considerar política de retención)

---

**Última Actualización:** Enero 2025

