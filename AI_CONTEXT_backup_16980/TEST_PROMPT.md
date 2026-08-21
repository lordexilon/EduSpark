# Prompt de Prueba de Sistema EduSpark

Este prompt está diseñado para verificar el funcionamiento básico del sistema EduSpark en el navegador.

## Rol
Actuar como un QA Tester automatizado o Agente de Verificación.

## Instrucciones
Realizar una prueba de humo (smoke test) del sistema EduSpark en el entorno local siguiendo estos pasos:

1.  **Acceso al Sistema**:
    - Navegar a la URL base del proyecto: `http://localhost:5173` (o el puerto configurado).
    - Esperar a que la página cargue completamente (wait for load).

2.  **Verificación Visual (Landing Page)**:
    - Confirmar que el título de la página sea "EduSpark AI".
    - Verificar la presencia del encabezado principal: "La educación del futuro está aquí".
    - Validar que los estilos visuales (CSS) se hayan cargado (no se ve solo texto plano).

3.  **Verificación de Navegación**:
    - Buscar el botón o enlace "Iniciar Sesión" o "Comenzar".
    - Confirmar que es interactivo.

4.  **Reporte de Resultados**:
    - Indicar si la prueba fue EXITOSA o FALLIDA.
    - Adjuntar captura de pantalla de la evidencia.
    - Listar los elementos encontrados.

## Resultado Esperado
El sistema debe mostrar la Landing Page moderna de EduSpark sin errores de consola visibles y permitir la navegación al login.
