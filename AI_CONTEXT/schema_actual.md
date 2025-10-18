# Esquema de Base de Datos para el MVP

Este documento describe la estructura y configuración de la base de datos vectorial que se utilizará en el backend del proyecto.

## a. Backend (Base de Datos Vectorial)

### Configuración de Base de Datos

-   **Plataforma**: Se utilizará una instancia de **PostgreSQL** en **Supabase**.
-   **Extensión Requerida**: La extensión `pgvector` debe estar habilitada en la instancia de Supabase para permitir el almacenamiento y la consulta de datos vectoriales.
-   **Dimensión del Vector**: El tamaño del vector debe coincidir con la salida del modelo de embedding de Gemini. Por ejemplo, si el modelo `text-embedding-004` genera vectores de 768 dimensiones, la columna `embedding` debe ser de tipo `vector(768)`.

### Esquema de Datos

Se creará una tabla principal para almacenar los fragmentos de los documentos de los cursos.

-   **Nombre de la Tabla**: `course_content_chunks`

-   **Columnas**:

| Nombre de Columna | Tipo de Dato                             | Descripción                                                                 | Restricciones      |
| ----------------- | ---------------------------------------- | --------------------------------------------------------------------------- | ------------------ |
| `id`              | `uuid`                                   | Identificador único para cada fragmento.                                    | Clave Primaria     |
| `course_id`       | `text`                                   | Identificador del curso al que pertenece el fragmento.                      | No Nulo            |
| `content`         | `text`                                   | El texto real del fragmento del documento.                                  | No Nulo            |
| `embedding`       | `vector(768)`                            | El vector numérico generado por Gemini para el `content`.                   |                    |
| `created_at`      | `timestamp with time zone`               | Fecha y hora de creación del registro.                                      | Valor por defecto: `now()` |

-   **Índices**:
    -   Se debe crear un índice IVFFlat en la columna `embedding` para acelerar las búsquedas de similitud. Esto es crucial para el rendimiento.
    -   Se recomienda un índice en `course_id` para filtrar eficientemente por curso antes de la búsqueda vectorial.

### Función de Búsqueda (Edge Function)

Se creará una Edge Function en Supabase para encapsular la lógica de búsqueda.

-   **Nombre de la Función**: `search_course_content_chunks`
-   **Entrada**:
    -   `query_embedding`: El vector de la pregunta del usuario.
    -   `course_id`: El ID del curso en el que se debe buscar.
    -   `match_count`: (Opcional) El número de fragmentos a devolver (ej. 5 por defecto).
-   **Lógica**:
    1.  Recibe el vector de la pregunta y el `course_id`.
    2.  Realiza una consulta SQL a la tabla `course_content_chunks`.
    3.  Filtra los registros por `course_id`.
    4.  Utiliza el operador de similitud de cosenos (`<=>`) de `pgvector` para encontrar los `match_count` fragmentos más cercanos al `query_embedding`.
    5.  Devuelve los fragmentos de texto (`content`) de los registros encontrados.
-   **Salida**: Un array de objetos, donde cada objeto contiene el `content` del fragmento relevante.