# Instrucciones: Hard Refresh del Navegador

## Problema

Después de desplegar una nueva versión de la aplicación en Cloud Run, el navegador puede estar cacheando la versión anterior de los archivos JavaScript, lo que causa que persistan errores que ya fueron corregidos (como "Invalid API key").

## Solución: Hard Refresh

Un **hard refresh** fuerza al navegador a descargar todos los archivos nuevamente, ignorando la caché.

### Windows / Linux

**Chrome / Edge:**
```
Ctrl + Shift + R
```

**Firefox:**
```
Ctrl + F5
```

### Mac

**Chrome / Edge / Firefox:**
```
Cmd + Shift + R
```

### Método Alternativo (Más Completo)

1. **Abre DevTools** (F12 o Click derecho → Inspeccionar)
2. **Click derecho** en el botón de refrescar del navegador (al lado de la barra de direcciones)
3. **Selecciona** "Empty Cache and Hard Reload" o "Vaciar caché y recargar de forma forzada"

Este método es el más efectivo porque vacía completamente la caché antes de recargar.

## Verificación

Después del hard refresh:

1. Verifica que el archivo JavaScript tenga un nuevo nombre de hash:
   - **Antes**: `index-qEtP-wZp.js`
   - **Después**: `index-nNH-f6kP.js` (o similar)

2. Intenta iniciar sesión nuevamente

3. Abre la consola del navegador (F12 → Console) y verifica que:
   - **NO** aparezca el error "Invalid API key"
   - El login funcione correctamente

## Alternativa: Modo Incógnito

Si el hard refresh no funciona, puedes probar en **modo incógnito/privado**:

**Chrome / Edge:**
```
Ctrl + Shift + N (Windows/Linux)
Cmd + Shift + N (Mac)
```

**Firefox:**
```
Ctrl + Shift + P (Windows/Linux)
Cmd + Shift + P (Mac)
```

El modo incógnito no usa caché, por lo que siempre descarga los archivos más recientes.

## Notas

- El hard refresh es necesario cada vez que se despliega una nueva versión
- Los usuarios finales también necesitarán hacer hard refresh después de cada actualización
- Para evitar este problema en producción, considera implementar:
  - Cache-busting con hashes en los nombres de archivos (Vite ya hace esto)
  - Headers de caché apropiados en Nginx
  - Service Workers para gestionar actualizaciones

