# 🏛️ Especificación Arquitectónica: EduSpark AI Gateway (AIaaS / LTI / OpenAPI)
**Fecha:** 2026-07-03  
**Versión:** 1.0.0 (SCA v3.0 - Swarm Edition)  
**Estado:** Especifiación Aprobada - Nodo 1  

---

## 1. Visión y Objetivos del Desacoplamiento
La arquitectura tradicional de **EduSpark LMS** (v2.6) acoplaba estrechamente el frontend nativo de React con los servicios de Inteligencia Artificial (`ragService`, `tutorAnalyticsService`, reportes ANEAES). 

Para escalar comercialmente y posicionarnos como la **Capa de Inteligencia Modular (AI Layer)** en el ecosistema educacional latinoamericano, rediseñamos el backend hacia un modelo de **Inteligencia Artificial como Servicio (AIaaS)**. Este Gateway expone las tres capacidades nucleares de EduSpark mediante contratos estándar (**OpenAPI 3.1** y **LTI 1.3 Advantage**), permitiendo:
1. **Consumo por LMS de Terceros:** Moodle, Canvas o Blackboard pueden contratar 1, 2 o los 3 servicios sin cambiar su plataforma institucional.
2. **Plataforma de Enseñanza Técnica (OpenChat / LibreChat):** Una interfaz conversacional pura y avanzada estilo ChatGPT Plus, donde estudiantes técnicos e ingenieros interactúan con manuales complejos, esquemas y agentes resolutivos sin fricción.
3. **Optimización Bimodal:** Enrutamiento dinámico entre modelos locales eficientes (Qwen/Ollama) y modelos de frontera en la nube (Gemini / Claude / GPT-4o) para respetar límites de costo ($50 USD/mes por tenant) y maximizar rendimiento.

---

## 2. Los 3 Servicios Nucleares ("A la Carta")

El contrato oficial se encuentra documentado en [`docs/api/eduspark-openapi.yaml`](file:///c:/Users/Legion%205/Documents/ApplicandoLA/EduSpark%20LMS/eduspark/docs/api/eduspark-openapi.yaml).

```
+-------------------------------------------------------------------------+
|                        EDUSPARK AI GATEWAY                              |
+---------------------+-------------------------+-------------------------+
|   SERVICIO 1        |       SERVICIO 2        |       SERVICIO 3        |
| Tutor Asistente 24/7| Analítica de Deserción  |   Reportes ANEAES/CONES |
+---------------------+-------------------------+-------------------------+
|  /v1/tutor/chat     | /v1/analytics/dropout   | /v1/compliance/aneaes   |
|  (RAG + A2A)        | (Early Warning AI)      | (Auditoría Automática)  |
+---------------------+-------------------------+-------------------------+
```

### 🎓 Servicio 1: 24/7 Tutor Asistente (RAG Híbrido + A2A)
* **Endpoint Principal:** `POST /api/v1/tutor/chat`
* **Endpoint Alias:** `POST /api/v1/tutor/chat/completions` (Compatible 100% con estándar OpenAI).
* **Función:** Orquesta nuestra arquitectura de sub-agentes (`AgentCoordinator`, `RAGAgent`, `ContextAgent`). Consulta la biblioteca institucional vectorial e híbrida (libros de referencia como Harrison o Williams, manuales técnicos y sílabos).
* **Valor Diferencial:** A diferencia de un LLM genérico, devuelve un array de `source_metadata` con el título del libro y el rango exacto de páginas (`page_start`, `page_end`), garantizando trazabilidad académica cero-alucinaciones.

### 📉 Servicio 2: Analítica Predictiva de Deserción (Early Warning AI)
* **Endpoint Principal:** `POST /api/v1/analytics/dropout-risk`
* **Función:** Ingiere telemetría académica de forma pasiva (frecuencia de login, entregas tardías, promedio de calificaciones, participación en foros e **índice de frustración** detectado por el tutor en el chat).
* **Valor Diferencial:** Cruza datos cuantitativos con análisis cualitativo de IA para emitir un `risk_score` (0 a 100) y clasificar al alumno en 4 niveles (LOW, MEDIUM, HIGH, CRITICAL), entregando recomendaciones pedagógicas de intervención en tiempo real.

### 🏛️ Servicio 3: Auditoría Regulatoria Automatizada (ANEAES / CONES)
* **Endpoint Principal:** `POST /api/v1/compliance/aneaes-audit`
* **Función:** Basa su lógica en la skill canónica `.cursor/skills/moodle-architect-paraguay-aneaes/`. Recibe los sílabos, carga horaria y mallas de un curso de Moodle o Blackboard y los contrasta con los criterios oficiales de acreditación de Paraguay.
* **Valor Diferencial:** Genera automáticamente el expediente de autoevaluación, detectando brechas en bibliografía obligatoria, perfiles docentes o coherencia de resultados de aprendizaje.

---

## 3. Integración con LibreChat / OpenChat (Plataforma Técnica)

Para la **enseñanza técnica** (tecnicaturas, ingenierías, medicina especializada), los estudiantes requieren una interfaz que soporte renderizado pesado de Markdown, tablas, diffs de código y previsualización de documentos.

### ¿Por qué LibreChat como Frontend VIP?
1. **Consumo OpenAPI Nativo:** LibreChat consume directamente nuestro archivo `eduspark-openapi.yaml` mediante su motor de **Plugins / Actions**.
2. **Drop-in OpenAI Replacement:** Al exponer `/v1/tutor/chat/completions`, podemos registrar a EduSpark AI en LibreChat como si fuera un proveedor compatible con OpenAI.
3. **System Presets & Agents:** Permite crear perfiles aislados en la interfaz:
   * **Preset "Tutor Clínico":** Restringido a búsquedas en libros médicos (Harrison) con alta rigurosidad de citación.
   * **Preset "Auditor ANEAES":** Con acceso exclusivo a la herramienta `/v1/compliance/aneaes-audit`.

---

## 4. Integración LTI 1.3 Advantage (Moodle / Canvas / Blackboard)

Para instituciones que no usan nuestra UI ni LibreChat, sino su propio Moodle institucional, el Gateway implementa el estándar LTI 1.3:
1. **OIDC Handshake & Token LTI:** El alumno hace clic en el enlace de "Tutor IA" dentro de su curso en Moodle. Moodle firma un JWT con el `user_id`, `context_id` (ID del curso en Moodle) y `resource_link_id`.
2. **Mapeo de Tenant:** EduSpark AI Gateway traduce el `context_id` externo al `course_id` e `institution_id` interno en Supabase.
3. **Inyección de Contexto:** El widget se abre en un iFrame o modal dentro de Moodle, autenticado de forma transparente y apuntando únicamente a los apuntes de esa materia.

---

## 5. Router Bimodal y Control de Presupuesto

El Gateway actúa como un firewall económico y de rendimiento:
* **Capa de Cuota ($50 USD / Mes):** Cada llamada a la API valida en Supabase la función `check_tutor_cost_limit(institution_id)`. Si se excede, el Gateway responde con un HTTP `429 Too Many Requests`.
* **Enrutamiento Cognitivo (`model_preference`):**
  * Si la consulta es una duda frecuente o de navegación: El Gateway enruta a **Ollama Local / Qwen** (Costo $0).
  * Si la consulta implica razonamiento profundo, casos clínicos o auditoría ANEAES: El Gateway enruta a **OpenRouter / Gemini 1.5 Pro / Claude 3.5** (Alto rendimiento).

---

## 6. Próximos Pasos (DAG - Nodo 2 y Nodo 3)
* **Nodo 2:** Diseño arquitectónico del ecosistema OpenChat y manuales técnicos.
* **Nodo 3:** Definición formal de la seguridad Multi-Tenant (RLS, generación de API Keys, aislamiento criptográfico entre instituciones).
