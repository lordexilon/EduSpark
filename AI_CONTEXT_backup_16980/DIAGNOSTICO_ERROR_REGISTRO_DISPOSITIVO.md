# 🔍 Diagnóstico: Error al Registrar Dispositivo

**Fecha:** 2025-01-24  
**Error:** HTTP 400 al llamar a `register_user_device`  
**Síntoma:** No se registra el dispositivo al hacer login

---

## 📊 Análisis de Logs

### **Error Detectado:**
```
mckfscukxcqwntpjagar.supabase.co/rest/v1/rpc/register_user_device:1  
Failed to load resource: the server responded with a status of 400 ()

❌ Error registrando dispositivo: Object
❌ Error en registerDevice: Object
```

### **Resultado:**
```
📱 Obteniendo dispositivos del usuario: 228e43a9-d78d-4117-ab00-a01a39df51d3
✅ Dispositivos obtenidos: 0
```

**No hay dispositivos registrados** porque la función RPC falló.

---

## 🔍 Posibles Causas

### **1. Función RPC no existe** ❓
La función `register_user_device` podría no estar creada en Supabase.

**Verificación:**
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'register_user_device';
```

**Solución:** Ejecutar el script SQL completo.

---

### **2. Parámetros incorrectos** ❓
Los parámetros enviados no coinciden con la firma de la función.

**Firma esperada:**
```sql
CREATE OR REPLACE FUNCTION register_user_device(
    p_user_id UUID,
    p_device_fingerprint VARCHAR,
    p_device_name VARCHAR,
    p_device_type VARCHAR,
    p_browser VARCHAR,
    p_os VARCHAR,
    p_session_id VARCHAR,
    p_ip_address INET,
    p_user_agent TEXT
)
```

**Parámetros enviados:**
```typescript
await supabase.rpc('register_user_device', {
  p_user_id: userId,
  p_device_fingerprint: deviceInfo.fingerprint,
  p_device_name: deviceInfo.deviceName,
  p_device_type: deviceInfo.deviceType,
  p_browser: deviceInfo.browser,
  p_os: deviceInfo.os,
  p_session_id: sessionId,
  p_ip_address: ip,
  p_user_agent: deviceInfo.userAgent
});
```

**Problema potencial:** El tipo `INET` de PostgreSQL puede no aceptar el formato de IP enviado.

---

### **3. Permisos insuficientes** ❓
El usuario autenticado no tiene permisos para ejecutar la función.

**Verificación:**
```sql
SELECT grantee, privilege_type 
FROM information_schema.routine_privileges 
WHERE routine_name = 'register_user_device';
```

**Solución:** Verificar que el GRANT esté aplicado:
```sql
GRANT EXECUTE ON FUNCTION register_user_device TO authenticated;
```

---

## 🛠️ Pasos de Diagnóstico

### **Paso 1: Verificar que el script SQL se ejecutó correctamente**

Ir a Supabase Dashboard → SQL Editor y ejecutar:

```sql
-- Verificar tablas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_devices', 'device_access_logs');

-- Verificar funciones
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%device%';

-- Verificar permisos
SELECT grantee, privilege_type 
FROM information_schema.routine_privileges 
WHERE routine_name = 'register_user_device';
```

**Resultado esperado:**
- 2 tablas: `user_devices`, `device_access_logs`
- 5 funciones: `register_user_device`, `get_user_devices_by_role`, etc.
- Permisos: `authenticated` con `EXECUTE`

---

### **Paso 2: Probar la función manualmente**

En Supabase SQL Editor:

```sql
-- Probar con datos de ejemplo
SELECT * FROM register_user_device(
  auth.uid(),  -- p_user_id
  'test_fingerprint_123',  -- p_device_fingerprint
  'Chrome en Windows',  -- p_device_name
  'desktop',  -- p_device_type
  'Chrome 120.0',  -- p_browser
  'Windows 11',  -- p_os
  'test_session_id',  -- p_session_id
  '192.168.1.1'::inet,  -- p_ip_address
  'Mozilla/5.0...'  -- p_user_agent
);
```

**Si falla:** Ver el mensaje de error específico.

---

### **Paso 3: Verificar formato de IP**

El problema más probable es el formato de IP. PostgreSQL requiere que sea un tipo `INET` válido.

**Verificar en consola del navegador:**
```javascript
// Abrir consola (F12) y ejecutar:
fetch('https://api.ipify.org?format=json')
  .then(r => r.json())
  .then(data => console.log('IP:', data.ip));
```

**Problema potencial:** Si la IP es IPv6, podría causar problemas.

---

## ✅ Soluciones Propuestas

### **Solución 1: Verificar ejecución del script SQL**

Si el script no se ejecutó completamente:

1. Abrir Supabase Dashboard → SQL Editor
2. Copiar TODO el contenido de `162_create_user_devices_system.sql`
3. Ejecutar
4. Verificar que no haya errores

---

### **Solución 2: Modificar tipo de IP en la función**

Si el problema es el tipo INET, podemos cambiarlo a TEXT temporalmente:

```sql
-- Modificar la función para aceptar TEXT en lugar de INET
CREATE OR REPLACE FUNCTION register_user_device(
    p_user_id UUID,
    p_device_fingerprint VARCHAR,
    p_device_name VARCHAR,
    p_device_type VARCHAR,
    p_browser VARCHAR,
    p_os VARCHAR,
    p_session_id VARCHAR,
    p_ip_address TEXT,  -- Cambiado de INET a TEXT
    p_user_agent TEXT
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    device_id UUID,
    removed_device_id UUID,
    removed_device_name VARCHAR
) AS $$
-- ... resto del código igual, pero cambiar:
-- ip_address INET a ip_address TEXT en la tabla también
```

---

### **Solución 3: Agregar manejo de errores más detallado**

Modificar `deviceService.ts` para ver el error completo:

```typescript
try {
  const { data, error } = await supabase.rpc('register_user_device', {
    p_user_id: userId,
    p_device_fingerprint: deviceInfo.fingerprint,
    p_device_name: deviceInfo.deviceName,
    p_device_type: deviceInfo.deviceType,
    p_browser: deviceInfo.browser,
    p_os: deviceInfo.os,
    p_session_id: sessionId,
    p_ip_address: ip,
    p_user_agent: deviceInfo.userAgent
  });
  
  if (error) {
    console.error('❌ Error RPC completo:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    throw error;
  }
  
  // ... resto del código
}
```

---

## 🎯 Acción Inmediata Recomendada

**Ejecutar en Supabase SQL Editor:**

```sql
-- 1. Verificar que la función existe
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'register_user_device';

-- 2. Si no existe, ejecutar el script completo
-- (copiar y pegar todo el contenido de 162_create_user_devices_system.sql)

-- 3. Si existe, probar manualmente
SELECT * FROM register_user_device(
  auth.uid(),
  'test_123',
  'Test Device',
  'desktop',
  'Chrome',
  'Windows',
  'session_123',
  '192.168.1.1'::inet,
  'Mozilla/5.0'
);
```

---

## 📝 Siguiente Paso

**Por favor, ejecuta las consultas de verificación en Supabase y comparte:**

1. ¿Aparece la función `register_user_device` en la lista?
2. ¿Qué error específico muestra al probarla manualmente?
3. ¿Hay algún error en la consola de Supabase al ejecutar el script?

Con esa información podré darte la solución exacta. 🔍

---

**Diagnóstico creado por:** Antigravity AI  
**Fecha:** 2025-01-24  
**Estado:** 🔍 INVESTIGANDO
