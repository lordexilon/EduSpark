# Propuesta Técnica: Motor de Ingesta RAG Híbrido (Python Local ETL)

**Estado:** Propuesta / Evaluación  
**Fecha:** 2026-02-04  
**Contexto:** Solución al problema de ingesta de archivos masivos (>100MB) en EduSpark.

---

## 1. Resumen Ejecutivo
Se propone una **Arquitectura Híbrida** que combina la agilidad de Google Cloud Functions (Node.js) para operaciones ligeras con la robustez de un **Script ETL (Extract, Transform, Load) en Python** ejecutado localmente para cargas masivas (libros, manuales). Esta estrategia resuelve los problemas de memoria (`Heap Out of Memory`) y timeouts eludiendo las limitaciones del entorno serverless para tareas de larga duración.

## 2. El Problema Actual (RAG-02)
La arquitectura actual basada puramente en *Serverless Node.js* falla con documentos grandes como "Schwartz Principios de Cirugia" (111 MB).

*   **Limitación de RAM:** Node.js intenta cargar el PDF y sus objetos en memoria. El Garbage Collector no da abasto, provocando crashes.
*   **Timeouts:** Cloud Functions mata cualquier proceso que exceda los 9 minutos (540s), lo cual es insuficiente para procesar miles de páginas y generar embeddings.
*   **Costos:** El re-procesamiento por fallos dispara el consumo de CPU y llamadas a APIs.

## 3. La Solución Propuesta: Python ETL Local

Implementar un script de administración (`ingest_biblioteca.py`) que se ejecuta fuera de la nube (ej. máquina local o VM dedicada) y sube los datos procesados a la nube.

### Pilares Técnicos
1.  **Lazy Loading con Generadores (`yield`):**
    *   En lugar de `pdf = load(file)`, se usa un iterador que lee **una página a la vez**.
    *   **Impacto:** El consumo de RAM se mantiene plano (~100MB) sin importar si el archivo pesa 100MB o 10GB.

2.  **Deduplicación Inteligente:**
    *   Cálculo de Hash (MD5) por bloque de texto.
    *   Si el hash ya existe en la base de datos, se salta el procesamiento.
    *   **Beneficio:** Ahorro directo en costos de API de Embeddings (Gemini).

3.  **Persistencia Directa en Supabase:**
    *   Aunque el procesamiento es local, los vectores resultantes se inyectan directamente en la base de datos PostgreSQL de Supabase (tabla `documents` con `pgvector`).
    *   **Resultado:** La aplicación web (EduSpark) accede a los datos inmediatamente, sin saber que fueron procesados localmente.

## 4. Análisis Comparativo: Node.js Serverless vs. Python Local

| Característica | Arquitectura Actual (Node.js Serverless) | Propuesta (Python Local ETL) |
| :--- | :--- | :--- |
| **Caso de Uso** | Archivos de usuario ligeros (<10MB), respuesta rápida. | "Biblioteca Maestra", libros pesados, ingestión batch. |
| **Gestión Memoria** | Crítica. Propenso a desbordamiento. | Óptima. Streaming de datos constante. |
| **Tiempo Ejecución** | Límite estricto (Max 540s). | Ilimitado. Puede correr por horas. |
| **Costo Computación** | Pago por uso (CPU/GB-s). | **$0** (Hardware existente). |
| **Stack Tecnológico** | TypeScript (Unificado). | Python (Mejor ecosistema para IA/Datos). |
| **Complejidad** | Baja (Todo en un solo repo). | Media (Requiere entorno Python separado). |

## 5. Arquitectura Híbrida Recomendada

Para EduSpark, no se debe eliminar la infraestructura actual, sino complementarla:

1.  **Carril Rápido (Cloud Functions):** Para que los estudiantes suban sus tareas o apuntes breves. Se mantiene la experiencia de usuario mágica e inmediata.
2.  **Carril Pesado (Python Script):** Herramienta interna ("Back Office") para que el equipo de EduSpark cargue la bibliografía base del sistema.

### Flujo de Datos Propuesto
```
[PDF Masivo 2GB] 
       ⬇
   (Local Machine)
   Python Script (LangChain + PyPDF)
       ⬇
   1. Lee Página X (Lazy)
   2. Chunking (1000 chars, 200 overlap)
   3. Hash Check (Deduplicación)
   4. Generar Embedding (Gemini API)
       ⬇
   [Supabase Database (Cloud)]
   (Tabla: documents)
       ⬇
   [EduSpark Web App]
   (Consume vía RAG Search)
```

## 6. Próximos Pasos (Hoja de Ruta)

1.  **Configurar Entorno:** Crear carpeta `scripts/ingestion_python` y `requirements.txt`.
2.  **Desarrollar Script:** Implementar lectura lazy y conexión a Supabase.
3.  **Prueba de Concepto:** Ingestar "Schwartz Principios de Cirugia" completo.
4.  **Validación:** Hacer preguntas al chat sobre el libro y verificar las citas.
