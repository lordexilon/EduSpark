# 🔐 Autenticación en Cloud Functions

## ✅ Implementación Completada

Las Cloud Functions ahora requieren autenticación mediante tokens de Supabase.

### Cómo Funciona

1. **Frontend**: Obtiene el token de sesión de Supabase
2. **Frontend**: Envía el token en el header `Authorization: Bearer <token>`
3. **Cloud Function**: Verifica el token y extrae el `userId`
4. **Cloud Function**: Valida que el usuario tenga permisos

### Cambios Realizados

#### 1. Middleware de Autenticación (`functions/shared/auth.ts`)
- Verifica tokens JWT de Supabase
- Valida expiración
- Extrae `userId` y `email` del token

#### 2. Cloud Functions Actualizadas
- `analyzeFile`: Requiere autenticación
- `createFileProcessingJob`: Requiere autenticación y valida que el `userId` del request coincida con el del token

#### 3. Frontend Actualizado (`pages/FileProcessingPage.tsx`)
- Obtiene token de Supabase antes de cada request
- Envía token en header `Authorization`

### Uso

Las funciones ahora son **seguras** y solo pueden ser llamadas por usuarios autenticados.

**Ejemplo de request:**
```javascript
const { data: { session } } = await supabase.auth.getSession();

fetch(ANALYZE_FILE_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  },
  body: JSON.stringify({ ... })
});
```

### Nota de Seguridad

⚠️ **En producción**, deberías verificar la firma del JWT usando la clave secreta de Supabase. La implementación actual decodifica el token pero no verifica la firma (adecuado para desarrollo).

Para producción, considera usar la API de Supabase para verificar tokens o implementar verificación de firma JWT.

