# Manual de Gestión de Materiales para Tutor RAG

**Versión:** 1.0  
**Fecha:** 27 de Noviembre de 2025  
**Audiencia:** Profesores, Coordinadores, Admin-Campus, Administradores

## 1. Introducción

El **Motor de Ingesta Asíncrono para RAG** es la herramienta encargada de procesar documentos educativos (PDFs, PowerPoints, Imágenes) para que el Tutor AI (Inteligencia Artificial) pueda "leerlos" y responder preguntas sobre ellos a los estudiantes.

Este proceso transforma archivos estáticos en conocimiento interactivo accesible a través del chat del curso.

## 2. Roles y Permisos

Es fundamental entender quién puede asignar materiales y bajo qué condiciones.

| Rol | Permisos de Asignación | Alcance |
| :--- | :--- | :--- |
| **Profesor** | ✅ Puede asignar | Solo a los cursos donde es el **docente titular**. |
| **Coordinador** | ⚠️ Restringido | Actualmente debe estar asignado como docente al curso para subir materiales. |
| **Admin-Campus** | ⚠️ Restringido | Actualmente debe estar asignado como docente al curso para subir materiales. |
| **Administrador** | ✅ Acceso Total | Puede gestionar todo, pero la interfaz actual requiere asignación docente. |

> **⚠️ NOTA IMPORTANTE:** Actualmente, para que un curso aparezca en la lista de selección, **el usuario conectado debe figurar como el profesor del curso**. Si eres Coordinador o Admin y no ves un curso, asegúrate de estar asignado temporalmente como profesor del mismo.

## 3. Flujo de Trabajo Paso a Paso

### Paso 1: Acceso a la Herramienta
Navega a la sección **"Procesamiento de Archivos"** o **"Gestión de Materiales RAG"** en el menú principal.
- URL: `/file-processing`

### Paso 2: Carga de Archivos desde Google Drive
La herramienta se conecta directamente a tu Google Drive.
1.  Si es la primera vez, deberás autorizar el acceso a tu cuenta de Google.
2.  El sistema buscará automáticamente una carpeta llamada `EduSpark` (o similar) en tu Drive.
3.  Si no existe, intentará crearla.
4.  Sube tus archivos (PDF, PPTX, Imágenes) a esa carpeta en tu Google Drive.
5.  Recarga la página o pulsa el botón de actualizar para ver la lista de archivos.

### Paso 3: Análisis Previo (Costos y Tokens)
Antes de procesar, el sistema analiza el archivo para estimar el consumo de tokens (costo de IA).
1.  Haz clic en el botón **"Analizar"** (icono de ojo/lupa) junto al archivo.
2.  El sistema calculará:
    - Número de páginas.
    - Si requiere OCR (reconocimiento de texto en imágenes).
    - Costo estimado de procesamiento.

### Paso 4: Asignación a Curso y Categoría (CRÍTICO)
Una vez analizado, se abrirá una ventana modal para confirmar el procesamiento.

1.  **Seleccionar Curso:** Elige el curso al que pertenece este material.
    - *Recuerda: Solo verás los cursos donde eres el profesor asignado.*
2.  **Seleccionar Categoría:** Clasifica el material para ayudar al Tutor AI a entender su contexto.
    - **Libro:** Material base, alta prioridad.
    - **Bibliografía:** Material complementario.
    - **Temario:** Estructura del curso.
    - **Examen:** Material de evaluación (útil para generar preguntas de práctica).
    - **Folleto/Otro:** Material misceláneo.

### Paso 5: Iniciar Procesamiento
1.  Selecciona el tipo de procesamiento (generalmente "Completo").
2.  Haz clic en **"Confirmar y Procesar"**.
3.  El sistema creará un "Job" (trabajo) en segundo plano.

## 4. Monitoreo y Estados

Puedes ver el progreso en la sección **"Estado de Procesamiento"** en la parte derecha (o inferior) de la pantalla.

| Estado | Significado | Acción Requerida |
| :--- | :--- | :--- |
| **Processing** (Azul) | El archivo se está leyendo, dividiendo y vectorizando. | Esperar. Puede tardar varios minutos según el tamaño. |
| **Completed** (Verde) | ¡Listo! El material ya es conocido por el Tutor AI. | Ninguna. Ya está disponible para los estudiantes. |
| **Failed** (Rojo) | Ocurrió un error (timeout, archivo corrupto, etc.). | Reintentar o contactar soporte técnico. |

## 5. Gestión de Errores Comunes

### "No veo mis cursos en la lista"
- **Causa:** No estás asignado como profesor titular del curso en la base de datos.
- **Solución:** Contacta a un administrador para que te asigne al curso, o si eres admin, asígnate tú mismo temporalmente.

### "Error: API de Google Drive no habilitada"
- **Causa:** El proyecto de Google Cloud no tiene la API activada.
- **Solución:** Contactar al equipo técnico (Desarrolladores) para habilitar la API en la consola de Google Cloud.

### "El procesamiento se queda 'pegado' en Processing"
- **Causa:** Puede ser un archivo muy grande o un problema de red momentáneo.
- **Solución:** Si lleva más de 2 horas, el sistema lo marcará como posible error. Puedes intentar procesarlo de nuevo.

### "Error de Tokens / Cuota Excedida"
- **Causa:** Se ha superado el límite de uso de la API de OpenAI o Google.
- **Solución:** Esperar o contactar al administrador para aumentar cuotas.

## 6. Buenas Prácticas para Materiales

1.  **PDFs con Texto Seleccionable:** Son mucho más rápidos y baratos de procesar que los PDFs escaneados (imágenes).
2.  **Nombres Claros:** Usa nombres de archivo descriptivos (ej: `Unidad_1_Anatomia_Cardiaca.pdf` en lugar de `scan001.pdf`). El Tutor AI usa el nombre del archivo para entender el contexto.
3.  **Un Archivo por Tema:** Es mejor subir archivos separados por capítulos o unidades que un solo libro gigante de 1000 páginas.
