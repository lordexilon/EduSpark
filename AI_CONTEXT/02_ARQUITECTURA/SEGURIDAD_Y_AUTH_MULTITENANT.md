# 🛡️ Modelo de Seguridad, API Keys & Aislamiento Multi-Tenant
**Fecha:** 2026-07-03  
**Versión:** 1.0.0 (SCA v3.0 - Swarm Edition)  
**Estado:** Especificación Aprobada - Nodo 3  

---

## 1. Arquitectura de Aislamiento de Datos (Multi-Tenant RLS)
EduSpark funciona como una plataforma SaaS multi-institución. Cuando se exponen las funciones principales a través de APIs de consumo externo (AIaaS), es crítico garantizar un **aislamiento absoluto a nivel de datos** para evitar filtraciones de información (*Data Leakage*) entre diferentes universidades o centros de formación técnica.

Para lograr esto, implementamos un esquema de seguridad de dos niveles:

```
                  ┌─────────────────────────────────────────┐
                  │          PETICIÓN EN EL GATEWAY         │
                  │      (LTI JWT o X-EduSpark-Api-Key)     │
                  └────────────────────┬────────────────────┘
                                       │ 1. Autentica & Extrae
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │      RESOLUCIÓN DE INSTITUTION_ID       │
                  │       (Ej. institution_id = 12)         │
                  └────────────────────┬────────────────────┘
                                       │ 2. Inyecta variable de sesión
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │    SUPABASE - CONTROL DE TRANSACCIÓN     │
                  │  SET LOCAL app.current_institution_id=12 │
                  └────────────────────┬────────────────────┘
                                       │ 3. Evalúa Políticas RLS
                                       ▼
             ┌───────────────────────────────────────────────────┐
             │       TABLAS DE LA BASE DE DATOS (Supabase)       │
             │  (Sólo retorna registros de la institución 12)    │
             └───────────────────────────────────────────────────┘
```

### Inyección de Contexto RLS en Supabase
Para peticiones que se autentican mediante API Keys (donde no existe una sesión web interactiva tradicional de Supabase Auth), el API Gateway abre una transacción y establece una variable de configuración de base de datos antes de ejecutar cualquier consulta:

```sql
-- Ejecutado al inicio de cada petición por el API Gateway
SET LOCAL app.current_institution_id = '12';
```

Las políticas de **Row Level Security (RLS)** en tablas críticas (`courses`, `course_content_chunks`, `processed_documents`) evalúan esta variable para filtrar automáticamente las filas accesibles:

```sql
-- Ejemplo de política RLS para asegurar que los chunks vectoriales estén aislados
CREATE POLICY "Aislamiento estricto por institución" 
ON public.course_content_chunks
FOR SELECT
TO authenticated, service_role
USING (
  institution_id = COALESCE(
    NULLIF(current_setting('app.current_institution_id', true), '')::integer,
    (auth.jwt() ->> 'user_metadata')::json->>'institution_id'::integer
  )
);
```

---

## 2. Esquema de API Keys Institucionales
Para la venta de integraciones B2B a otras universidades y el consumo desde LibreChat/OpenChat, el Gateway implementa un sistema de API Keys seguro y auditado.

### Diseño de la Tabla `api_keys`
Las claves no se almacenan en texto plano. En su lugar, el sistema guarda un **hash criptográfico SHA-256** de la clave generada, similar al patrón estándar de la industria.

```sql
CREATE TABLE public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id INTEGER NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- Ej: "Moodle Producción Medicina"
    key_prefix VARCHAR(8) NOT NULL, -- Ej: "edsp_live"
    key_hash VARCHAR(64) NOT NULL UNIQUE, -- Hash SHA-256 de la API Key completa
    scopes TEXT[] NOT NULL DEFAULT '{"tutor:chat"}', -- Scopes autorizados
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'revoked', 'expired'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_api_keys_hash ON public.api_keys(key_hash) WHERE status = 'active';
```

### Proceso de Validación en el API Gateway
1. El cliente envía la cabecera: `X-EduSpark-Api-Key: edsp_live_abc123xyz789...`
2. El Gateway separa el prefijo y calcula el hash de la clave recibida en memoria usando SHA-256.
3. Realiza una búsqueda rápida indexada en la tabla `api_keys` filtrando por el hash calculado y confirmando que el `status` sea `active` y no haya expirado.
4. Si la clave es válida, obtiene el `institution_id` y los `scopes` para autorizar la ejecución del endpoint.

---

## 3. Integración Segura LTI 1.3 Advantage (Moodle / Canvas)
La integración con LMS de terceros se realiza siguiendo las especificaciones del estándar **IMS LTI 1.3 Advantage**, el cual reemplaza las firmas SHA-1 obsoletas de LTI 1.1 por un protocolo basado en **OAuth 2.0 y firmas asimétricas JWT**.

### Flujo del Lanzamiento Autenticado (LTI Launch)
1. **Inicio de Lanzamiento (OIDC Login Initiator):**
   * El alumno hace clic en "Tutor Inteligente" dentro de su curso de Moodle.
   * El LMS redirige a EduSpark Gateway al endpoint `/api/v1/auth/lti/login`.
   * El Gateway valida los datos básicos de registro del LMS y redirige al alumno de vuelta a la URL de autorización del LMS, previniendo ataques de tipo CSRF y de fijación de sesión.
2. **Autorización y Redirección de Retorno:**
   * El LMS autentica la sesión del alumno en su sistema y redirige a EduSpark al endpoint `/api/v1/auth/lti/launch` enviando un `id_token` firmado por el LMS.
3. **Validación de Token con JWKS:**
   * El Gateway no confía en los datos del token ciegamente. Descarga dinámicamente las claves públicas del LMS utilizando la URL **JWKS (JSON Web Key Set)** registrada para la institución emisora.
   * Verifica la firma del JWT usando la clave RSA pública del LMS.
   * Valida la vigencia y las propiedades estándar (`iss`, `aud`, `exp`).
4. **Mapeo de Contexto y Sesión:**
   * Si la firma es correcta, el Gateway extrae el ID del curso externo del LMS, lo asocia al curso de EduSpark correspondiente a través de la tabla de misiones/asignaciones, e inicia una sesión segura retornando el widget del Tutor en un iFrame.

---

## 4. Control de Presupuesto, Cuotas y Mitigación de Abuso
Para evitar la facturación excesiva e imprevista en modelos de nube avanzada (Gemini/Claude) y mitigar ataques de denegación de servicio (DDoS), el Gateway implementa políticas automáticas en cada llamada a la API:

### A. Chequeo y Consumo de Presupuesto ($50 USD/mes)
Antes de procesar cualquier consulta al tutor en `/tutor/chat`, el Gateway ejecuta de forma atómica:
1. **Verificación de Límite:**
   * Consulta si la institución ha excedido su límite mensual utilizando la función de base de datos `check_tutor_cost_limit(institution_id)`.
   * Si el límite fue alcanzado, interrumpe la petición de inmediato retornando un código **HTTP 429 Too Many Requests** con el mensaje: *"Límite presupuestario mensual de la institución excedido"*.
2. **Registro de Consumo Post-Ejecución:**
   * Una vez completada la generación de la respuesta y medidos los tokens de entrada y salida, calcula el costo en base al modelo utilizado (ej: $0.075 USD por cada llamada a Gemini).
   * Registra y acumula el costo ejecutando `track_tutor_interaction_cost(user_id, course_id, model, tokens_in, tokens_out, cost)`.

### B. Rate Limiting por API Key
Para evitar bucles infinitos de agentes externos de terceros o ataques de fuerza bruta:
* Implementamos un middleware de **Token Bucket** en Redis para limitar la frecuencia a nivel de API Key (ej. máximo de 60 peticiones por minuto por institución / 10 peticiones concurrentes).
* Si un cliente excede esta frecuencia, se retorna **HTTP 429 Too Many Requests** de forma temporal para proteger el rendimiento de los servidores de backend.
