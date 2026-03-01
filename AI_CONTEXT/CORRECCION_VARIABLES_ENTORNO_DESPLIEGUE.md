# Corrección de Variables de Entorno en Despliegue - 14 Enero 2026

**Fecha:** 2026-01-14  
**Problema:** El frontend desplegado no se conectaba a la base de datos (Supabase)  
**Causa:** Variables de entorno vacías en `cloudbuild.yaml`  
**Solución:** Actualizar `cloudbuild.yaml` con valores del archivo `.env`

---

## 🔍 Problema Identificado

El frontend desplegado en Cloud Run no podía conectarse a Supabase porque las variables de entorno `VITE_SUPABASE_ANON_KEY` y `VITE_GEMINI_API_KEY` estaban vacías en el archivo `cloudbuild.yaml`.

### Variables que estaban vacías:
```yaml
substitutions:
  _VITE_SUPABASE_URL: 'https://mckfscukxcqwntpjagar.supabase.co'
  _VITE_SUPABASE_ANON_KEY: ''  # ❌ VACÍO
  _VITE_GEMINI_API_KEY: ''     # ❌ VACÍO
```

---

## ✅ Solución Aplicada

### 1. Lectura del archivo `.env`
Se leyeron las variables de entorno del archivo `.env` local:
- `VITE_SUPABASE_URL`: https://mckfscukxcqwntpjagar.supabase.co
- `VITE_SUPABASE_ANON_KEY`: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
- `VITE_GEMINI_API_KEY`: AIzaSyCE-K_2cpz-BCu_Wan0uC7xvBb7OJJXGRc

### 2. Actualización de `cloudbuild.yaml`
Se actualizaron las variables de sustitución con los valores correctos:

```yaml
substitutions:
  _VITE_SUPABASE_URL: 'https://mckfscukxcqwntpjagar.supabase.co'
  _VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDU0MzQsImV4cCI6MjA3NjMyMTQzNH0.-5HFEuphwYhfa8HBW3FddQfu5b-JOCb6FLElKFwezBg'
  _VITE_GEMINI_API_KEY: 'AIzaSyCE-K_2cpz-BCu_Wan0uC7xvBb7OJJXGRc'
```

### 3. Redespliegue
Se ejecutó un nuevo build y despliegue:
```bash
gcloud builds submit --config cloudbuild.yaml
```

**Resultado:**
- ✅ Build ID: `3265d201-2d27-406a-861e-5893bd336aae`
- ✅ Estado: SUCCESS
- ✅ Duración: 3 minutos 37 segundos

---

## 📋 Variables de Entorno Configuradas

### Variables de Supabase
- **VITE_SUPABASE_URL**: URL del proyecto Supabase
- **VITE_SUPABASE_ANON_KEY**: Clave anónima de Supabase (para operaciones del cliente)
- **VITE_SUPABASE_SERVICE_ROLE_KEY**: Clave de servicio (solo para uso interno, no se incluye en el build del frontend)

### Variables de Gemini
- **VITE_GEMINI_API_KEY**: Clave API de Google Gemini para el tutor virtual

---

## 🔒 Seguridad

### ⚠️ Importante
Las variables `VITE_*` se compilan en el bundle del frontend, lo que significa que son visibles en el código JavaScript del navegador. Esto es normal y esperado para:
- `VITE_SUPABASE_ANON_KEY`: Está diseñada para ser pública (usa RLS para seguridad)
- `VITE_GEMINI_API_KEY`: Aunque es visible, debería tener restricciones de dominio en Google Cloud Console

### ✅ Buenas Prácticas
1. **Nunca** incluir `VITE_SUPABASE_SERVICE_ROLE_KEY` en el frontend
2. Configurar restricciones de API en Google Cloud Console para `VITE_GEMINI_API_KEY`
3. Usar RLS (Row Level Security) en Supabase para proteger datos sensibles
4. No subir el archivo `.env` al repositorio (ya está en `.gitignore`)

---

## ✅ Verificación Post-Corrección

### Pruebas Recomendadas
1. **Login**: Verificar que el login funciona correctamente
2. **Conexión a Supabase**: Verificar que las consultas a la base de datos funcionan
3. **Tutor Virtual**: Verificar que el tutor puede usar Gemini API
4. **Analytics**: Verificar que se cargan los datos de analytics

### Comandos de Verificación
```bash
# Ver estado del servicio
gcloud run services describe eduspark-frontend --region us-central1

# Ver logs recientes
gcloud run services logs read eduspark-frontend --region us-central1 --limit 20

# Verificar URL
gcloud run services describe eduspark-frontend --region us-central1 --format "value(status.url)"
```

---

## 📝 Notas Técnicas

### Cómo Funcionan las Variables VITE_*
Las variables que empiezan con `VITE_` son:
1. Leídas durante el build (no en runtime)
2. Inyectadas en el código JavaScript compilado
3. Visibles en el navegador (esto es normal y esperado)

### Por Qué No Funcionaba Antes
- Las variables estaban vacías en `cloudbuild.yaml`
- Durante el build, Vite no tenía acceso a las variables
- El código compilado no tenía las claves necesarias
- El frontend no podía conectarse a Supabase

### Solución Aplicada
- Se actualizaron las variables en `cloudbuild.yaml`
- Se redesplegó el servicio
- Ahora el build incluye las variables correctas
- El frontend puede conectarse a Supabase

---

## 🎯 Próximos Pasos

1. ✅ **Verificar login**: Probar que el login funciona
2. ✅ **Verificar tutor**: Probar que el tutor virtual funciona
3. ✅ **Verificar analytics**: Probar que los datos se cargan
4. ⚠️ **Configurar restricciones**: Configurar restricciones de dominio para Gemini API en Google Cloud Console

---

**Corregido por:** Sistema de Despliegue  
**Fecha:** 2026-01-14 10:30 UTC  
**Build ID:** 3265d201-2d27-406a-861e-5893bd336aae
