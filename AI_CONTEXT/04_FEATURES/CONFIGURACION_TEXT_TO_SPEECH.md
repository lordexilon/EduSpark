# Configuración de Google Cloud Text-to-Speech API

## Problema

El sistema está intentando usar Google Cloud Text-to-Speech API pero recibe un error 403 (Forbidden), lo que indica que:
- La API no está habilitada en el proyecto de Google Cloud
- La API key no tiene permisos para Text-to-Speech
- La API key es solo para Gemini, no para Google Cloud Text-to-Speech

## Solución

### Opción 1: Habilitar Text-to-Speech API en el mismo proyecto

1. **Ir a Google Cloud Console:**
   - Ve a: https://console.cloud.google.com/
   - Selecciona tu proyecto (el mismo donde tienes Gemini API)

2. **Habilitar la API:**
   - Ve a "APIs & Services" > "Library"
   - Busca "Cloud Text-to-Speech API"
   - Haz clic en "Enable" (Habilitar)

3. **Verificar permisos de la API key:**
   - Ve a "APIs & Services" > "Credentials"
   - Encuentra tu API key (la misma que usas para Gemini)
   - Verifica que "Cloud Text-to-Speech API" esté en la lista de APIs permitidas
   - Si no está, edita la API key y agrega "Cloud Text-to-Speech API" a las restricciones

4. **Configurar variable de entorno:**
   ```env
   VITE_GOOGLE_CLOUD_API_KEY=tu_api_key_aqui
   ```
   O usa la misma que Gemini:
   ```env
   VITE_GEMINI_API_KEY=tu_api_key_aqui
   ```

### Opción 2: Crear una API key específica para Text-to-Speech

1. **Crear nueva API key:**
   - Ve a "APIs & Services" > "Credentials"
   - Haz clic en "Create Credentials" > "API Key"
   - Restringe la API key solo a "Cloud Text-to-Speech API"

2. **Configurar variable de entorno:**
   ```env
   VITE_GOOGLE_CLOUD_API_KEY=tu_nueva_api_key_para_tts
   ```

## Verificación

Una vez configurado, el sistema debería:
- Detectar automáticamente el idioma del texto (español/inglés)
- Usar voces premium Neural2 según el idioma detectado
- Sintetizar audio con alta calidad

## Notas Importantes

- **Costos:** Google Cloud Text-to-Speech tiene costos asociados (ver: https://cloud.google.com/text-to-speech/pricing)
- **Límites:** Hay límites de uso según el plan (ver documentación de Google Cloud)
- **Voces Premium:** Estamos usando voces Neural2 que son premium pero de mejor calidad
- **Fallback:** Si la API no está disponible, el sistema continuará funcionando sin audio (solo texto)

## Estado Actual

El sistema está configurado para:
- ✅ Detectar automáticamente español/inglés
- ✅ Usar voces premium Neural2
- ✅ Manejar errores gracefully (no falla si la API no está disponible)
- ⚠️ Requiere configuración de API key con permisos de Text-to-Speech

## Próximos Pasos

1. Habilitar Cloud Text-to-Speech API en Google Cloud Console
2. Verificar/actualizar permisos de la API key
3. Probar la síntesis de voz con un texto en español
4. Probar la síntesis de voz con un texto en inglés

