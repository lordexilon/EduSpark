# Solución: Error "Invalid API Key" en Cloud Run (Supabase)

## Descripción del Problema
Al desplegar la aplicación frontend en Google Cloud Run, se presentaba un error persistente al intentar iniciar sesión o acceder a datos de Supabase:

```json
{
    "message": "Invalid API key",
    "hint": "Double check your Supabase `anon` or `service_role` API key."
}
```

Este error ocurría **solamente en el entorno de producción (Cloud Run)**, mientras que en el entorno local (`localhost`) la aplicación funcionaba correctamente.

## Diagnóstico
Tras realizar varias pruebas de verificación:
1.  Se confirmó que la clave en el archivo `.env` local era correcta y funcional (probada vía `curl`).
2.  Se inspeccionaron los logs de la consola del navegador en la versión desplegada, observando el prefijo de la clave utilizada durante la inicialización de Supabase.
3.  **Causa Raíz:** Se identificó que el archivo `Dockerfile-cloudrun` tenía una clave `VITE_SUPABASE_ANON_KEY` antigua y "quemada" (hardcoded) en una instrucción `ARG`.
    *   El archivo `.env` local tenía dos claves definidas (una comentada y otra activa).
    *   El `Dockerfile` estaba usando la clave antigua (la comentada), ignorando la clave activa del entorno actual.

## Solución Implementada

1.  **Actualización del Dockerfile:**
    Se modificó el archivo `Dockerfile-cloudrun` para actualizar el valor por defecto del argumento `VITE_SUPABASE_ANON_KEY` con la clave correcta (la que termina en `...zBg`).

    *Archivo: `Dockerfile-cloudrun`*
    ```dockerfile
    # Antes
    ARG VITE_SUPABASE_ANON_KEY=eyJhbGci...<CLAVE_ANTIGUA>...zu8

    # Después
    ARG VITE_SUPABASE_ANON_KEY=eyJhbGci...<CLAVE_NUEVA>...zBg
    ```

2.  **Redespliegue:**
    Se ejecutó el comando de construcción y despliegue para generar una nueva imagen con la clave correcta:
    ```bash
    gcloud builds submit --config cloudbuild.yaml .
    ```

## Verificación
1.  Se accedió a la URL de la aplicación en Cloud Run.
2.  En la consola del navegador (F12), se verificó el log de "Inicializando Supabase" y se confirmó que el `keyPrefix` coincidía con el de la clave correcta.
3.  El inicio de sesión y la carga de datos (ej. Dashboard) funcionan correctamente.

## Recomendación para el Futuro
Para evitar este problema, se recomienda:
*   **No hardcodear secretos en el Dockerfile:** Idealmente, pasar estas variables como argumentos de construcción (`--build-arg`) desde el sistema de CI/CD (Cloud Build) usando sustituciones o secretos de Google Secret Manager, en lugar de escribirlos directamente en el archivo `Dockerfile`.
*   **Sincronización:** Si se regeneran las claves en Supabase, recordar actualizar **todos** los archivos de configuración (`.env`, `Dockerfile`, `cloudbuild.yaml`, etc.) donde estas puedan estar definidas.
