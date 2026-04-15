# Solución de Problemas - API Key de Gemini

## 🔍 Problema Detectado

El diagnóstico detectó un **error 403 (Forbidden)** al intentar usar la API de Gemini. Esto significa que la API key no tiene permisos o está deshabilitada.

## ✅ Verificación Actual

- ✅ API Key encontrada en `.env`
- ✅ Formato correcto de la key
- ❌ **Error 403**: La API key no tiene permisos o está deshabilitada

## 🔧 Soluciones

### 1. Verificar en Google AI Studio

1. Ir a [Google AI Studio](https://aistudio.google.com/)
2. Iniciar sesión con tu cuenta de Google
3. Ir a "Get API Key" o "API Keys"
4. Verificar que tu API key esté:
   - ✅ Activa (no deshabilitada)
   - ✅ Tiene permisos para Gemini API
   - ✅ No ha expirado

### 2. Habilitar la API de Gemini

Si la API no está habilitada:

1. Ir a [Google Cloud Console](https://console.cloud.google.com/)
2. Seleccionar tu proyecto
3. Ir a "APIs & Services" > "Library"
4. Buscar "Generative Language API" o "Gemini API"
5. Hacer clic en "Enable"

### 3. Generar una Nueva API Key (si es necesario)

1. En [Google AI Studio](https://aistudio.google.com/)
2. Ir a "Get API Key"
3. Crear una nueva API key
4. Copiar la nueva key
5. Actualizar en el archivo `.env`:
   ```
   VITE_GEMINI_API_KEY=tu_nueva_api_key_aqui
   ```
6. Reiniciar el servidor de desarrollo

### 4. Verificar Variables de Entorno

Asegúrate de que tu archivo `.env` tenga:

```env
VITE_GEMINI_API_KEY=tu_api_key_aqui
```

O alternativamente:

```env
GEMINI_API_KEY=tu_api_key_aqui
```

## 🛠️ Scripts de Diagnóstico

El proyecto incluye scripts para verificar el estado de la API key:

```bash
# Verificación completa (recomendado)
npm run verify:gemini

# Prueba rápida
npm run test:gemini
```

## ⚠️ Seguridad

**IMPORTANTE**: El diagnóstico detectó que la API key configurada es la misma que está hardcodeada en el código. Esto es un riesgo de seguridad.

### Recomendaciones de Seguridad:

1. **Nunca hardcodear API keys en el código**
   - La API key debe estar solo en archivos `.env`
   - El archivo `.env` debe estar en `.gitignore`

2. **Usar variables de entorno**
   - En producción, usar variables de entorno del sistema
   - En desarrollo, usar archivos `.env.local` (no commitear)

3. **Rotar API keys regularmente**
   - Si una key se expone, revocarla inmediatamente
   - Generar una nueva key y actualizar la configuración

## 📋 Checklist de Verificación

- [ ] API key activa en Google AI Studio
- [ ] API de Gemini habilitada en Google Cloud Console
- [ ] API key configurada en `.env`
- [ ] Formato correcto de la key (empieza con `AIza`)
- [ ] Sin keys hardcodeadas en el código
- [ ] Archivo `.env` en `.gitignore`
- [ ] Script de diagnóstico ejecutado sin errores

## 🆘 Si el Problema Persiste

1. Verificar logs del servidor para más detalles
2. Probar con una nueva API key desde Google AI Studio
3. Verificar límites de cuota en Google Cloud Console
4. Revisar políticas de seguridad de la organización

## 📚 Recursos

- [Google AI Studio](https://aistudio.google.com/)
- [Documentación de Gemini API](https://ai.google.dev/docs)
- [Google Cloud Console](https://console.cloud.google.com/)

