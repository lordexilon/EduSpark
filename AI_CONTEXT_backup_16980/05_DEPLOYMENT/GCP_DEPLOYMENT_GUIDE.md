# Guía de Despliegue en Google Cloud Platform (GCP) 🚀

Esta guía detalla el proceso para desplegar **EduSpark** en Google Cloud utilizando **Cloud Build** y **Cloud Run**.

## 🏗️ Arquitectura de Despliegue

- **Frontend:** React (Vite) desplegado en **Cloud Run**.
- **Servidor Web:** Nginx configurado para Single Page Application (SPA).
- **CI/CD:** Google Cloud Build automatizado.

---

## 📋 Requisitos Previos

1. **Google Cloud SDK (gcloud)** instalado y configurado.
2. Proyecto en GCP creado (ej: `eduspark-py`).
3. Billing habilitado en la cuenta de GCP.
4. APIs habilitadas:
   - Cloud Run API
   - Cloud Build API
   - Container Registry API

---

## 🚀 Despliegue Manual

Para subir la versión actual a producción:

```bash
gcloud builds submit --config cloudbuild.yaml .
```

Este comando realiza las siguientes acciones definidas en `cloudbuild.yaml`:
1. Instala dependencias (`npm ci`).
2. Compila el frontend (`npm run build`) inyectando las variables de entorno.
3. Construye una imagen Docker optimizada.
4. Sube la imagen a Google Container Registry (GCR).
5. Despliega/Actualiza el servicio en **Cloud Run**.

---

## ⚙️ Configuración (Variables de Entorno)

Las variables de producción se gestionan mediante sustituciones en el archivo `cloudbuild.yaml`. Asegúrate de actualizar los valores en la sección `substitutions`:

```yaml
substitutions:
  _VITE_SUPABASE_URL: 'https://tu-proyecto.supabase.co'
  _VITE_SUPABASE_ANON_KEY: 'tu-anon-key'
  _VITE_GEMINI_API_KEY: 'tu-gemini-key'
```

---

## 🐳 Docker y Nginx en Cloud Run

El despliegue utiliza `Dockerfile-cloudrun` y `nginx-cloudrun.conf`:
- **Puerto:** Cloud Run expone el puerto `$PORT` (por defecto 8080).
- **SPA Routing:** Nginx está configurado para redirigir todas las rutas a `index.html`, permitiendo que React Router funcione correctamente.

---

## 📈 Monitoreo y Logs

Puedes ver el estado del servicio y los logs de ejecución en la consola de Google Cloud:
[Consola Cloud Run - eduspark-frontend](https://console.cloud.google.com/run/detail/us-central1/eduspark-frontend/)

---

## 🛠️ Solución de Problemas Comunes

### Error de Memoria en Build
Si el build falla por memoria insuficiente, se ha configurado `machineType: 'E2_HIGHCPU_8'` en `cloudbuild.yaml` para proporcionar recursos suficientes durante la compilación de Vite.

### Rutas 404 en sub-páginas
Si al recargar una página que no es el home obtienes un 404, verifica que `nginx-cloudrun.conf` tenga la directiva `try_files $uri $uri/ /index.html;`.
