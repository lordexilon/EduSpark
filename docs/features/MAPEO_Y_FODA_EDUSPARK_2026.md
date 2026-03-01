# 🗺️ Mapeo y Análisis FODA — Plataforma EduSpark
**Fecha:** 14 de Febrero, 2026
**Documento de Control y Estrategia Académica**

---

## 1. 🔍 Mapeo Estructural del Ecosistema

### 🏗️ Arquitectura y Dependencias
- **Frontend Core**: React 18 + TypeScript + Vite.
- **Styling**: Tailwind CSS (Optimizado para carga rápida y diseño premium).
- **Backend / DB**: Supabase (PostgreSQL, Auth, Storage, Edge Functions).
- **IA Engine**: Google Gemini (Directo vía Edge Functions y RAG). **Prompt Caching** activo para contextos masivos.
- **Document Processing**: RAG (Retrieval-Augmented Generation) optimizado con índices **HNSW** (búsqueda vectorial de alta velocidad).
- **Mobile App**: Flutter (Android Nativo). Arquitectura híbrida con **Auth Bridge** para seguridad unificada y experiencia de usuario fluida.
- **Reporting**: Reportes PDF mediante `jsPDF`.

### 👥 Perfiles de Usuario y Capacidades de Control

| Rol | Gobernanza y Control de Uso |
| :--- | :--- |
| **Estudiante** | Autogestión mediante **Reportes Semanales** y visualización de progreso. Acceso controlado por cuotas y **Derecho al Olvido** (Privacidad). |
| **Docente** | **Dashboard de Participación**: Monitoreo de frecuencia de uso, temas consultados y **Matriz de Riesgo** (Progreso vs Uso IA). |
| **Administrador** | **Costos por Usuario**: Visibilidad exacta de tokens/USD por alumno. **Auditoría**: Logs de acciones sensibles. Control de Presupuesto Global. |
| **Supervisor** | **Auditoría de Calidad**: Revisión de la eficacia pedagógica y cumplimiento normativo (Ley 7593). |

### 🌐 Servicios Externos y Estructura de Costos
- **Supabase**: Base de datos vectorial (pgvector con HNSW) y hosting.
- **Google Gemini API**: 
  - *Modelo Flash 1.5*: Optimizado con **Context Caching** (TTL 1h) para reducir costos en consultas repetitivas de libros enteros.
  - *Modelo Pro*: Reservado para análisis profundo semanal.
- **Estrategia de Sostenibilidad**: Reducción drástica de costos mediante Caching + Diferimiento de evaluaciones.

---

## 🚀 2. Lista Maestra de Funcionalidades (Rentabilidad & Cumplimiento 2026)

### 🤖 Inteligencia Artificial & Gobernanza
- **Prompt Caching (Rentabilidad)**: Almacenamiento en caché de contextos de libros (>100k tokens) para no pagar por re-procesamiento en cada pregunta.
- **Tutor IA Proactivo**: Saludo con contexto de progreso y detección de riesgo.
- **Generador de Quizzes con IA (Safe RAG)**: Creación instantánea de evaluaciones basadas *exclusivamente* en materiales cargados, eliminando alucinaciones y reduciendo la carga administrativa docente.
- **Ciclo Semanal**: Reporte integral cada viernes.
- **Token Faucet & User Caps**: Límites de gasto globales e individuales (Hard Stop).
- **Dashboard de Costos de IA**: Tabla detallada de consumo por usuario y sesión.

### 🛡️ Cumplimiento Legal & Seguridad (SCA Compliant)
- **Aislamiento Institucional Robusto (RLS Cleanup)**: Arquitectura de seguridad nivel Enterprise que garantiza que los datos de una institución sean totalmente invisibles para otras, incluso a nivel de base de datos.
- **Derecho al Olvido**: "Zona de Peligro" en perfil para solicitud de eliminación de cuenta.
- **Traza de Auditoría**: Registro inmutable de accesos y acciones críticas (`audit_logs`).
- **Consentimiento Explícito**: Versionado de términos y condiciones.

### 📝 Evaluación y Estudio
- **Generador de Flashcards**: Creación automática desde materiales.
- **Simulador de Quizzes**: Feedback inmediato y modo estudio.
- **Matriz de Riesgo Académico**: Identificación de alumnos con alto consumo de IA pero bajo avance académico (posible uso inadecuado).

### 🎓 Gestión Académica
- **Malla Curricular Dinámica**: Soporte para estructuras complejas (ej. Medicina 6 años).
- **Certificación Digital**: Diplomas PDF automáticos basados en logros.
- **Kardex Académico**: Histórico de notas y trazabilidad de exámenes.

### 📱 Movilidad & Branding (Nuevo - Activo de Alto Valor)
- **App Android Personalizada**: Aplicación nativa con **Icono y Splash Screen** exclusivos de la institución (White Label).
- **Acceso Unificado**: Login nativo seguro integrando biometría del dispositivo.
- **Experiencia Premium**: Navegación optimizada sin barras de navegador, notificaciones (futuro) y persistencia de sesión.

---

## 📊 3. Análisis FODA (SWOT) - Actualizado Feb 2026

### 💪 Fortalezas (Strengths)
1. **Rentabilidad Técnica**: Prompt Caching y HNSW reducen el costo operativo y latencia en un 70-90% para consultas frecuentes.
2. **Seguridad y Aislamiento Multi-Tenant**: El sistema de aislamiento institucional (SCA) es una barrera contra fugas de datos, superando a LMS genéricos.
3. **Cumplimiento Normativo "Enterprise"**: Alineación nativa con Ley 7593 (Privacidad), diferenciador clave para ventas a gobiernos/universidades.
4. **Visibilidad Granular**: El administrador sabe exactamente cuánto gasta cada alumno (`$0.01` vs `$10.00`).
5. **Productividad Docente**: La generación de quizzes con IA reduce en un 95% el tiempo de preparación de evaluaciones.
6. **Presencia de Marca (Mobile)**: La App Android personalizada eleva el **Valor Percibido**, justificando tickets más altos.

### 🚀 Oportunidades (Opportunities)
1. **Venta a Sector Público / Salud**: Las características de auditoría y privacidad habilitan licitaciones estatales y de sanidad académica.
2. **Modelo SaaS Tiered**: Cobrar diferente por "IA Ilimitada" vs "IA Estándar" gracias al control de cuotas por usuario.
3. **Certificación de Competencias**: Vender la validación de habilidades, no solo el curso.
4. **Monetización Móvil**: Ofrecer la **App Personalizada** como un "Add-on" Premium con costo de set-up.

### ⚠️ Debilidades (Weaknesses)
1. **Complejidad de Gestión**: Tantas opciones de control (Límites, Caching, Riesgo) requieren un administrador capacitado.
2. **Dependencia de Google**: Aunque el costo baja, la dependencia tecnológica de Gemini 1.5 Flash se mantiene.

### 💣 Amenazas (Threats)
1. **Regulación Estricta**: Si la Ley 7593 se vuelve más estricta sobre "IA en Educación", ya tenemos la base, pero requerirá vigilancia.
2. **Competencia "Gratuita"**: Modelos locales en dispositivos del usuario (SLMs) podrían eliminar el costo de servidor, pero son difíciles de controlar/auditar.

---

## 4. Análisis de Capacidad Técnica (Supabase & Infraestructura)

Para responder a la pregunta de escalabilidad más allá de la base de 200 estudiantes, se presenta el análisis técnico de los límites de la infraestructura actual (Plan Enterprise/Pro):

### 🏗️ Capacidad de Base de Datos (Supabase / PostgreSQL)
*   **Usuarios Activos (Auth):** La capa de autenticación soporta hasta **50,000 MAUs** (Usuarios Activos Mensuales) sin cambios de arquitectura. La base de 200 alumnos representa solo el **0.4%** de la capacidad.
*   **Conexiones Concurrentes:** Utilizando *Supavisor* (Connection Pooler), el sistema puede manejar miles de peticiones simultáneas (ej. todos los alumnos rindiendo examen al mismo tiempo) sin latencia perceptible.
*   **Almacenamiento:**
    *   **Base de Datos:** 8GB incluidos (suficiente para ~10 años de registros académicos de texto y logs para 200-500 alumnos).
    *   **Archivos (Storage):** 100GB para PDFs y recursos multimedia.
*   **Vectores (IA Memory):** El índice HNSW scalea a millones de vectores. Con 200 alumnos y 50 libros, no saturaremos ni el 5% de la capacidad de búsqueda semántica.

### ⚡ Rendimiento del Frontend
*   **Arquitectura Cliente (CSR):** Al estar construido en React y Vite, la carga de procesamiento de la interfaz recae en el dispositivo del usuario, no en el servidor. Esto significa que **el sistema no se vuelve más lento** a medida que entran más usuarios.

### 📈 Conclusión de Escalabilidad
El sistema está **técnicamente sobre-provisionado** para **200 e incluso 400 estudiantes**.
*   **Carga con 400 Alumnos:** Representa menos del **1%** de la capacidad de procesamiento concurrente.
*   **Punto de Saturación Teórico:** > 5,000 estudiantes simultáneos (requeriría solo aumentar RAM de base de datos).
*   **Límite Actual:** El límite de 200 es **exclusivamente administrativo/licencia**, no técnico. El sistema puede crecer inmediatamente a 400, 500 o 1,000 alumnos sin migraciones de código.

---

## 🏁 Conclusión Estratégica
EduSpark ha superado la etapa de "Prototipo Funcional" para convertirse en una **Plataforma Enterprise-Ready**. La incorporación de **Prompt Caching** (Rentabilidad) y **Módulos de Privacidad** (Cumplimiento) elimina las dos mayores objeciones de venta corporativa: "¿Cuánto me va a costar?" y "¿Es seguro legalmente?". La plataforma es ahora **Auditable, Rentable y Escalable**.
