# 🔧 Solución Rápida: Error 403 en Gemini API

## ⚠️ Problema Detectado

**Error 403 (Forbidden)** - La API key de Gemini no tiene permisos o está deshabilitada.

## ✅ Solución Paso a Paso

### Paso 1: Verificar en Google AI Studio

1. **Ir a Google AI Studio:**
   - Abre: https://aistudio.google.com/
   - Inicia sesión con tu cuenta de Google

2. **Verificar tu API Key:**
   - Ve a "Get API Key" o "API Keys" en el menú
   - Busca la key que termina en: `...BCu_Wan0uC7xvBb7OJJXGRc`
   - Verifica su estado:
     - ✅ **Activa** (no debe estar deshabilitada)
     - ✅ **Válida** (no debe estar expirada)
     - ✅ **Con permisos** (debe tener acceso a Gemini API)

### Paso 2: Habilitar la API en Google Cloud Console

1. **Ir a Google Cloud Console:**
   - Abre: https://console.cloud.google.com/
   - Selecciona el proyecto correcto

2. **Habilitar Generative Language API:**
   - Ve a **"APIs & Services"** > **"Library"**
   - Busca: **"Generative Language API"** o **"Gemini API"**
   - Si no está habilitada, haz clic en **"Enable"**
   - Espera a que se habilite (puede tardar 1-2 minutos)

### Paso 3: Verificar Permisos de la API Key

1. En Google Cloud Console, ve a **"APIs & Services"** > **"Credentials"**
2. Busca tu API key
3. Verifica que tenga permisos para:
   - ✅ Generative Language API
   - ✅ Gemini API (si aparece como servicio separado)

### Paso 4: Generar Nueva API Key (Si es Necesario)

Si la key actual no funciona:

1. **En Google AI Studio:**
   - Ve a "Get API Key"
   - Haz clic en **"Create API Key"**
   - Elige el proyecto correcto
   - Copia la nueva key

2. **Actualizar en tu proyecto:**
   ```bash
   # Editar archivo .env
   VITE_GEMINI_API_KEY=tu_nueva_api_key_aqui
   ```

3. **Reiniciar el servidor:**
   ```bash
   # Detener el servidor (Ctrl+C)
   # Volver a iniciarlo
   npm run dev
   ```

4. **Verificar que funcione:**
   ```bash
   npm run verify:gemini
   ```

## 🔒 Problema de Seguridad Detectado

**⚠️ IMPORTANTE:** La API key está hardcodeada en el código fuente. Esto es un riesgo de seguridad.

### Solución de Seguridad

1. **Eliminar la key hardcodeada:**
   - Abrir: `audio-tutor/utils/env.ts`
   - Comentar o eliminar la línea:
     ```typescript
     const HARDCODED_KEY = 'AIzaSyCE-K_2cpz-BCu_Wan0uC7xvBb7OJJXGRc';
     ```
   - Modificar la función `pickFirstValid` para que NO use fallback hardcodeado

2. **Usar solo variables de entorno:**
   - Mantener la key solo en `.env`
   - Asegurarse de que `.env` esté en `.gitignore`
   - Nunca commitear la key al repositorio

## 🧪 Verificar la Solución

Después de hacer los cambios, ejecuta:

```bash
npm run verify:gemini
```

Deberías ver:
```
✅ No se encontraron problemas
✓ API Key encontrada: Archivo .env
✓ API Key válida y funcionando
```

## 📋 Checklist de Verificación

- [ ] API key activa en Google AI Studio
- [ ] Generative Language API habilitada en Google Cloud Console
- [ ] API key tiene permisos correctos
- [ ] API key configurada en `.env`
- [ ] Servidor reiniciado después de cambios
- [ ] Script de verificación pasa sin errores
- [ ] Key hardcodeada eliminada del código (seguridad)

## 🆘 Si el Problema Persiste

### Verificar Cuotas

1. En Google Cloud Console, ve a **"APIs & Services"** > **"Quotas"**
2. Busca "Generative Language API"
3. Verifica que no hayas excedido los límites

### Verificar Restricciones de la API Key

1. En Google Cloud Console, ve a **"APIs & Services"** > **"Credentials"**
2. Abre tu API key
3. Verifica las **"API restrictions"**:
   - Si está restringida, agrega "Generative Language API"
   - O cambia a "Don't restrict key" temporalmente para probar

### Verificar Políticas de la Organización

Si tu cuenta está en una organización, verifica:
- Que las políticas de la organización permitan usar Gemini API
- Que tu cuenta tenga los permisos necesarios

## 📚 Recursos Útiles

- [Google AI Studio](https://aistudio.google.com/)
- [Documentación Gemini API](https://ai.google.dev/docs)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Troubleshooting Guide](https://ai.google.dev/gemini-api/docs/troubleshooting)

## ✨ Resumen Rápido

1. **Verificar key en Google AI Studio** → Debe estar activa
2. **Habilitar API en Cloud Console** → Generative Language API
3. **Verificar permisos** → Key debe tener acceso
4. **Generar nueva key si es necesario** → Y actualizar en `.env`
5. **Eliminar key hardcodeada** → Por seguridad
6. **Reiniciar servidor** → Para aplicar cambios
7. **Verificar con script** → `npm run verify:gemini`

