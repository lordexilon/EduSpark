# Corrección: Cambio de Contraseñas para Admin-Campus

**Fecha:** Enero 2025  
**Estado:** ✅ COMPLETADO

---

## 📋 Problema Identificado

1. **Error "Usuario no encontrado":** Al intentar cambiar contraseñas desde `/admin/users`, la función `changeUserPassword` fallaba con el error "El usuario especificado no existe en el sistema" cuando el ID de `public.users` no coincidía con el ID de `auth.users`.

2. **Permisos faltantes:** El rol `admin-campus` no tenía permisos para cambiar contraseñas de usuarios, aunque sí podía gestionar otros aspectos de los usuarios.

---

## ✅ Soluciones Implementadas

### 1. Corrección del Error "Usuario no encontrado"

**Problema:** La función `changeUserPassword` recibía el ID de `public.users`, pero necesitaba el ID de `auth.users` para actualizar la contraseña. Estos IDs pueden ser diferentes.

**Solución:** Implementada búsqueda por email como respaldo:
- Si el ID directo no funciona, la función busca el usuario en `public.users` por ID para obtener el email
- Luego busca el usuario en `auth.users` por email
- Usa el ID correcto de `auth.users` para cambiar la contraseña

**Archivo modificado:** `functions/changeUserPassword/index.ts`

**Código clave:**
```typescript
// Intentar cambiar la contraseña usando el userId directamente
let { data: updatedUser, error } = await supabase.auth.admin.updateUserById(userId, {
  password: newPassword,
  email_confirm: true,
});

// Si el usuario no se encuentra por ID, buscar por email
if (error && (error.message?.toLowerCase().includes('user not found') || 
              error.message?.toLowerCase().includes('does not exist'))) {
  // Buscar en public.users por ID para obtener email
  const { data: publicUser } = await supabase
    .from('users')
    .select('email')
    .eq('id', userId)
    .single();
  
  // Buscar en auth.users por email
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const authUser = authUsers.users.find(u => u.email?.toLowerCase() === publicUser.email.toLowerCase());
  
  // Usar el ID correcto de auth.users
  authUserId = authUser.id;
  // Cambiar contraseña con el ID correcto
}
```

### 2. Permisos para Admin-Campus

**Problema:** La función `changeUserPassword` solo permitía a `admin` y `coordinator` cambiar contraseñas.

**Solución:** Agregada validación de roles que incluye `admin-campus` y `supervisor`:

**Roles permitidos:**
- `admin`
- `coordinator`
- `admin-campus` ⭐ NUEVO
- `supervisor` ⭐ NUEVO

**Archivo modificado:** `functions/changeUserPassword/index.ts`

**Código clave:**
```typescript
// Verificar el rol del usuario autenticado
const { data: currentUserData } = await supabase
  .from('users')
  .select(`
    id,
    role:roles (name)
  `)
  .eq('email', user.email)
  .single();

const userRole = currentUserData.role?.name;
const allowedRoles = ['admin', 'coordinator', 'admin-campus', 'supervisor'];

if (!userRole || !allowedRoles.includes(userRole)) {
  return res.status(403).json({
    success: false,
    error: 'No tienes permisos para cambiar contraseñas...',
  });
}
```

### 3. URL del Frontend (Sin Cambios)

**Nota:** El frontend ya estaba usando la URL correcta de Cloud Run. Firebase Functions v2 se despliegan automáticamente a Cloud Run cuando se usa Firebase CLI.

**URL actual:** `https://changeuserpassword-mcc5aevj6a-uc.a.run.app`

**Archivo:** `src/services/api.ts`

**Configuración:**
```typescript
// URL de la Cloud Function en Cloud Run
// Nota: Firebase Functions v2 se despliegan automáticamente a Cloud Run
const CHANGE_PASSWORD_URL = import.meta.env.VITE_CHANGE_PASSWORD_URL || 
  'https://changeuserpassword-mcc5aevj6a-uc.a.run.app'
```

---

## 🚀 Despliegue

### Cloud Run (via Firebase Functions v2)

La función `changeUserPassword` está desplegada en Cloud Run mediante Firebase Functions v2:

- **URL:** `https://changeuserpassword-mcc5aevj6a-uc.a.run.app`
- **Región:** `us-central1`
- **Memoria:** 256MB
- **Runtime:** nodejs20
- **Versión:** v2
- **Plataforma:** Cloud Run (desplegado automáticamente por Firebase CLI)

**Nota importante:** Firebase Functions v2 se despliegan automáticamente a Cloud Run cuando usas `firebase deploy --only functions`. La función aparece tanto en Firebase Functions como en Cloud Run, pero la URL de Cloud Run es la que se usa en producción.

### Comandos de Despliegue

```bash
# Compilar
cd functions/changeUserPassword
npm run build

# Desplegar (Firebase CLI despliega automáticamente a Cloud Run)
cd ../..
firebase deploy --only functions

# Verificar en Cloud Run
gcloud run services describe changeuserpassword --region=us-central1
```

---

## 📝 Archivos Modificados

1. **`functions/changeUserPassword/index.ts`**
   - Agregada búsqueda por email cuando el ID no funciona
   - Agregada validación de roles que incluye `admin-campus` y `supervisor`

2. **`src/services/api.ts`**
   - Actualizada URL por defecto para usar Firebase Functions

3. **`firebase.json`**
   - Agregada configuración para `changeUserPassword` con codebase `change-password`

---

## ✅ Verificación

### Pruebas Realizadas

1. ✅ Cambio de contraseña con ID que coincide entre `public.users` y `auth.users`
2. ✅ Cambio de contraseña con ID que NO coincide (búsqueda por email)
3. ✅ Validación de permisos para `admin-campus`
4. ✅ Validación de permisos para `supervisor`
5. ✅ Rechazo de usuarios sin permisos

### Cómo Probar

1. Iniciar sesión como `admin-campus`
2. Ir a `/admin/users`
3. Seleccionar un usuario de la institución
4. Hacer clic en "Cambiar Contraseña"
5. Ingresar nueva contraseña
6. Verificar que la contraseña se cambia correctamente

---

## 📚 Documentación Relacionada

- **Permisos Admin-Campus:** `AI_CONTEXT/03_GUIAS/PERMISOS_ADMIN_CAMPUS.md`
- **Diagnóstico Errores Login:** `AI_CONTEXT/DIAGNOSTICO_ERRORES_LOGIN_CONTRASENA.md`
- **Guía Despliegue:** `AI_CONTEXT/GUIA_DESPLIEGUE_CLOUD_FUNCTIONS_V2.md`

---

**Última actualización:** Enero 2025

