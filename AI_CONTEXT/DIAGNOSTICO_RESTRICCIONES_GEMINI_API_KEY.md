# 🔍 Diagnóstico: Restricciones y Problemas con Gemini API Key

**Fecha:** Enero 2025  
**Estado:** ⚠️ Error 403 Forbidden detectado

## 📊 Resultado del Diagnóstico

El script de verificación detectó:

```
✅ API Key encontrada en: Archivo .env
✅ Formato correcto (empieza con AIza)
❌ Error 403: La API key no tiene permisos o está deshabilitada
```

## 🔴 Problema Principal: Error 403 Forbidden

**Causa:** La API key de Gemini no tiene permisos o está deshabilitada en Google AI Studio / Google Cloud Console.

## 📋 Restricciones y Limitaciones Identificadas

### 1. **Restricciones de Permisos (Error 403)**

**Causas comunes:**
- ❌ API key deshabilitada en Google AI Studio
- ❌ API de Gemini no habilitada en el proyecto de Google Cloud
- ❌ Restricciones de API aplicadas a la key (solo ciertas APIs permitidas)
- ❌ La key no tiene acceso a "Generative Language API"

**Solución:**
1. Ir a [Google AI Studio](https://aistudio.google.com/)
2. Verificar que la API key esté **activa** (no deshabilitada)
3. Ir a [Google Cloud Console](https://console.cloud.google.com/)
4. Habilitar "Generative Language API" en el proyecto
5. Verificar permisos de la API key en "APIs & Services" > "Credentials"

### 2. **Restricciones de Cuota (Error 429)**

**Causas:**
- Límite de requests por minuto excedido
- Límite de tokens diarios/mensuales alcanzado
- Plan gratuito con límites reducidos

**Solución:**
- Verificar cuotas en Google Cloud Console > "APIs & Services" > "Quotas"
- Considerar actualizar el plan si es necesario
- Implementar rate limiting en el código (ya implementado con reintentos)

### 3. **Problemas de Configuración en Producción**

**Causas:**
- Variables de entorno no se pasan correctamente en Cloud Run
- `vite.config.ts` prioriza `loadEnv` sobre `process.env`
- Variables no disponibles durante el build

**Solución implementada:**
- Ver `AI_CONTEXT/SOLUCION_FINAL_INVALID_API_KEY_CLOUD_RUN.md`
- Priorizar `process.env` sobre `env` de `loadEnv` en `vite.config.ts`
- Pasar variables como `ENV` en el Dockerfile

### 4. **API Key Hardcodeada (Riesgo de Seguridad)**

**Problema detectado:**
- La API key está hardcodeada en `audio-tutor/utils/env.ts`
- La key configurada coincide con la hardcodeada

**Riesgo:**
- ⚠️ La key puede estar expuesta en el repositorio
- ⚠️ No se puede rotar fácilmente
- ⚠️ Violación de mejores prácticas de seguridad

**Solución recomendada:**
1. Eliminar la key hardcodeada de `env.ts`
2. Usar solo variables de entorno
3. Asegurar que `.env` esté en `.gitignore`
4. Rotar la key actual y generar una nueva

## 🔧 Pasos para Resolver el Error 403

### Paso 1: Verificar en Google AI Studio

1. Ir a: https://aistudio.google.com/
2. Iniciar sesión con tu cuenta de Google
3. Ir a "Get API Key" o "API Keys"
4. Buscar la key que termina en: `...BCu_Wan0uC7xvBb7OJJXGRc`
5. Verificar:
   - ✅ Estado: **Activa** (no deshabilitada)
   - ✅ Válida (no expirada)
   - ✅ Con permisos para Gemini API

### Paso 2: Habilitar API en Google Cloud Console

1. Ir a: https://console.cloud.google.com/
2. Seleccionar el proyecto correcto
3. Ir a **"APIs & Services"** > **"Library"**
4. Buscar: **"Generative Language API"** o **"Gemini API"**
5. Si no está habilitada, hacer clic en **"Enable"**
6. Esperar 1-2 minutos para que se habilite

### Paso 3: Verificar Permisos de la API Key

1. En Google Cloud Console, ir a **"APIs & Services"** > **"Credentials"**
2. Buscar tu API key
3. Abrir la key para editar
4. Verificar **"API restrictions"**:
   - Si está restringida, agregar "Generative Language API"
   - O cambiar temporalmente a "Don't restrict key" para probar

### Paso 4: Generar Nueva API Key (Si es Necesario)

Si la key actual no funciona:

1. En Google AI Studio:
   - Ir a "Get API Key"
   - Hacer clic en **"Create API Key"**
   - Elegir el proyecto correcto
   - Copiar la nueva key

2. Actualizar en el proyecto:
   ```bash
   # Editar archivo .env
   VITE_GEMINI_API_KEY=tu_nueva_api_key_aqui
   GEMINI_API_KEY=tu_nueva_api_key_aqui
   ```

3. Reiniciar el servidor:
   ```bash
   npm run dev
   ```

4. Verificar:
   ```bash
   npm run verify:gemini
   ```

## 📚 Documentación Relacionada

- **Solución Error 403:** `docs/SOLUCION_ERROR_403_GEMINI.md`
- **Troubleshooting API Key:** `docs/GEMINI_API_KEY_TROUBLESHOOTING.md`
- **Solución Invalid API Key Cloud Run:** `AI_CONTEXT/SOLUCION_FINAL_INVALID_API_KEY_CLOUD_RUN.md`
- **Corrección Rate Limiting:** `AI_CONTEXT/CORRECCION_ERRORES_EMBEDDINGS_RAG_WORKER.md`

## 🛠️ Scripts de Diagnóstico Disponibles

```bash
# Verificación completa (recomendado)
npm run verify:gemini

# Prueba rápida
npm run test:gemini
```

## ⚠️ Checklist de Verificación

- [ ] API key activa en Google AI Studio
- [ ] Generative Language API habilitada en Google Cloud Console
- [ ] API key tiene permisos correctos
- [ ] API key configurada en `.env` (no hardcodeada)
- [ ] Servidor reiniciado después de cambios
- [ ] Script de verificación pasa sin errores
- [ ] Key hardcodeada eliminada del código (seguridad)

## 🔒 Recomendaciones de Seguridad

1. **Nunca hardcodear API keys en el código**
   - La key debe estar solo en archivos `.env`
   - El archivo `.env` debe estar en `.gitignore`

2. **Usar variables de entorno**
   - En producción: variables de entorno del sistema
   - En desarrollo: archivos `.env.local` (no commitear)

3. **Rotar API keys regularmente**
   - Si una key se expone, revocarla inmediatamente
   - Generar nueva key y actualizar configuración

4. **Restringir API keys**
   - Aplicar restricciones de API (solo Generative Language API)
   - Aplicar restricciones de IP si es posible
   - Usar diferentes keys para desarrollo y producción

## 🆘 Si el Problema Persiste

### Verificar Cuotas

1. En Google Cloud Console, ir a **"APIs & Services"** > **"Quotas"**
2. Buscar "Generative Language API"
3. Verificar que no se hayan excedido los límites

### Verificar Políticas de la Organización

Si tu cuenta está en una organización:
- Verificar que las políticas permitan usar Gemini API
- Verificar que tu cuenta tenga los permisos necesarios
- Contactar al administrador de la organización si es necesario

### Verificar Logs

```bash
# Ver logs del servicio (si está en Cloud Run)
gcloud run services logs read eduspark-frontend --region us-central1 --limit 50
```

## 📖 Recursos Útiles

- [Google AI Studio](https://aistudio.google.com/)
- [Documentación Gemini API](https://ai.google.dev/docs)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Troubleshooting Guide](https://ai.google.dev/gemini-api/docs/troubleshooting)

## ✨ Resumen Rápido

1. **Error 403 detectado** → La API key no tiene permisos
2. **Verificar en Google AI Studio** → Key debe estar activa
3. **Habilitar API en Cloud Console** → Generative Language API
4. **Verificar permisos** → Key debe tener acceso
5. **Generar nueva key si es necesario** → Y actualizar en `.env`
6. **Eliminar key hardcodeada** → Por seguridad
7. **Reiniciar servidor** → Para aplicar cambios
8. **Verificar con script** → `npm run verify:gemini`

## 🎯 Estado Actual

- ✅ API Key encontrada en `.env`
- ✅ Formato correcto (empieza con AIza)
- ❌ **Error 403: Sin permisos o deshabilitada**
- ⚠️ Key hardcodeada en código (riesgo de seguridad)

**Próximos pasos:** Seguir los pasos 1-4 de la sección "Pasos para Resolver el Error 403"

