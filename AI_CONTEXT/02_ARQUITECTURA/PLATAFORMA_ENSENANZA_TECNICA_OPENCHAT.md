# 🛠️ Arquitectura de Enseñanza Técnica & Integración con OpenChat/LibreChat
**Fecha:** 2026-07-03  
**Versión:** 1.0.0 (SCA v3.0 - Swarm Edition)  
**Estado:** Especificación Aprobada - Nodo 2  

---

## 1. Naturaleza de la Enseñanza Técnica vs. Académica
La enseñanza académica tradicional suele basarse en la lectura conceptual, discusiones teóricas y evaluaciones memorísticas u orientadas a casos generales. 
Por el contrario, la **Enseñanza Técnica** (medicina especializada, mantenimiento de maquinaria pesada, aeronáutica, redes y telecomunicaciones) demanda:
* **Precisión Procedimental Absoluta:** Un paso omitido en un checklist de seguridad o en un protocolo quirúrgico puede causar fallas catastróficas.
* **Consulta Rápida de Especificaciones:** Acceso a manuales técnicos, árboles de fallas (*troubleshooting*), *datasheets* de componentes y diagramas de flujo.
* **Trazabilidad de Fuentes:** Los estudiantes deben saber exactamente de qué manual, edición, sección y página proviene una directiva técnica.

Para soportar esto, desacoplamos la UI y habilitamos a **LibreChat** (u OpenChat) como el front conversacional premium, conectándolo a la base cognitiva de EduSpark.

---

## 2. Modelado de Agentes y Presets Técnicos en LibreChat
LibreChat permite configurar perfiles de comportamiento aislados llamados **Presets** o **Agents** que encapsulan System Prompts, temperaturas y acceso a herramientas de búsqueda específicas. En EduSpark AI Layer implementamos tres perfiles core para el ámbito técnico:

```
                  ┌────────────────────────────────────────┐
                  │          CLIENTE LIBRECHAT             │
                  └─────┬──────────────┬──────────────┬────┘
                        │              │              │
         ┌──────────────▼──────┐┌──────▼──────┐┌──────▼─────────────┐
         │ PRESET: DIAGNÓSTICO ││   PRESET:   ││       PRESET:      │
         │  Y TROUBLESHOOTING  ││PROCEDIMIENTOS││ ESPECIFICACIONES  │
         └──────────┬──────────┘└──────┬──────┘└──────┬─────────────┘
                    │                  │              │
                    └──────────────────┼──────────────┘
                                       │ (OpenAPI /v1/tutor/chat)
                                ┌──────▼──────┐
                                │  EDUSPARK   │
                                │  AI GATEWAY │
                                └─────────────┘
```

### A. Preset: Diagnóstico y Troubleshooting (Resolución de Fallas)
* **Objetivo:** Guiar al estudiante en el diagnóstico lógico de una falla de sistema o equipo.
* **System Prompt Core:**
  > Actúas como un Ingeniero de Soporte Senior y Diagnóstico Técnico. Cuando el usuario describa un problema o síntoma en una máquina o sistema, no des la solución directamente. Guíalo a través de un proceso inductivo siguiendo los árboles de fallas de los manuales técnicos disponibles en tu RAG. Pide que el usuario realice mediciones o comprobaciones secuenciales e introduce posibles hipótesis de fallo basadas en la bibliografía oficial.
* **Herramientas asignadas:** `/materials/search` (restringido a manuales de taller, diagramas eléctricos y mecánicos).

### B. Preset: Instructor de Procedimientos y Checklists
* **Objetivo:** Enseñar secuencias operativas estrictas y medidas de seguridad industrial.
* **System Prompt Core:**
  > Eres un Instructor Técnico de Operaciones. Tu tarea es entrenar al estudiante en la ejecución de procedimientos paso a paso. Cuando solicite un procedimiento, enumera claramente las herramientas requeridas, los Elementos de Protección Personal (EPP) obligatorios y el checklist de pre-encendido. Si el usuario pregunta por un paso intermedio, exígele que confirme haber completado los pasos previos de seguridad. Cita siempre el manual y la página del procedimiento.
* **Herramientas asignadas:** `/materials/search` (restringido a guías de operación y manuales del fabricante).

### C. Preset: Analista de Especificaciones y Fichas Técnicas
* **Objetivo:** Consultar rangos térmicos, tolerancias de voltaje, torque de apriete y compatibilidad de repuestos.
* **System Prompt Core:**
  > Eres un Asistente de Ingeniería de Materiales y Datasheets. Tu única función es extraer parámetros numéricos, tolerancias, límites operativos e información de compatibilidad de las fichas técnicas del fabricante indexadas en el sistema. Si la información no se encuentra textualmente en los documentos recuperados, indícalo claramente y no intentes extrapolar ni alucinar valores críticos.
* **Herramientas asignadas:** `/materials/search` (restringido a catálogos de componentes y datasheets).

---

## 3. Optimización del RAG Híbrido para Contenido Técnico
Para cumplir con las exigencias del entorno técnico, el `RAGService` de EduSpark opera bajo las siguientes optimizaciones de indexación y recuperación:

1. **Estructura de Chunk Orientada a Tablas y Procedimientos:**
   * Los manuales técnicos contienen abundantes tablas de datos. El motor de procesamiento (`pdfjs-dist` y `xlsx` / `office-libs` que aislamos en el refactor de Vite) está configurado para extraer tablas en formato **Markdown estructurado** o **JSON**, evitando que se rompa la relación de columnas.
   * Cada fragmento técnico incluye metadatos específicos: `device_model`, `manufacturer`, `section_type` (ej. *Electrical*, *Mechanical*, *Safety*), además de `page_number` y `document_title`.

2. **Normalización y Sinónimos Técnicos:**
   * El preprocesamiento semántico en el backend normaliza abreviaturas técnicas comunes (ej. "VCA" a "Voltios de Corriente Alterna", "Nm" a "Newton-metro"). Esto previene fallos de coincidencia cuando el alumno busca usando abreviaturas o términos del taller y el manual usa la terminología formal.

3. **Fallback a Coincidencia de Keywords Estricta:**
   * Si la búsqueda vectorial arroja puntuaciones bajas debido a nombres de partes ultra-específicos (ej. un número de parte como *"312-A9091"*), la búsqueda textual directa (`search_course_content_chunks_text_clean` optimizada con el CTE Bounded en el Hotfix 178) actúa como red de seguridad para forzar la recuperación exacta del fragmento que contiene dicho código alfanumérico.

---

## 4. Flujo de Trabajo del Estudiante Técnico en LibreChat
1. **Selección del Entorno:** El estudiante ingresa a LibreChat y selecciona el preset del agente que desea usar (ej. *Diagnóstico de Motores*).
2. **Interacción:** Escribe su caso: *"Tengo un motor trifásico que zumba pero no arranca"*.
3. **Llamada al Gateway:** LibreChat invoca al endpoint `/tutor/chat` enviando la consulta y la preferencia del modelo.
4. **Recuperación y Respuesta:** El backend ejecuta la búsqueda híbrida en la base de manuales técnicos de la institución y retorna la respuesta en Markdown, estructurando los pasos y mostrando las fuentes citadas:
   > **Diagnóstico inicial:**
   > El zumbido sin arranque en motores trifásicos suele deberse a la pérdida de una fase (operación monofásica) o a un bloqueo mecánico. Sigue estos pasos para diagnosticar:
   > 1. Desconecta la energía y verifica la tensión en las tres fases en la bornera de entrada.
   > 2. Mide la resistencia de los devanados para descartar una bobina abierta.
   > 
   > *Fuente: Manual de Taller de Máquinas Eléctricas ABC, Sección 4: Localización de Averías, Pág. 89-91.*
