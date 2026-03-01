# Control de Dispositivos - Sesión Única

**Fecha:** 2025-12-14  
**Objetivo:** Implementar control estricto de dispositivos con sesión única activa

---

## 📋 Requisitos Implementados

### 1. Límite de Dispositivos
- ✅ **Máximo 3 dispositivos** registrados por usuario
- ✅ Al llegar al límite, se elimina automáticamente el **dispositivo más antiguo**

### 2. Sesión Única Activa
- ✅ **Solo 1 sesión activa** a la vez
- ✅ Al iniciar sesión en un dispositivo, se **cierran automáticamente** todas las demás sesiones
- ✅ Monitoreo en tiempo real de sesión activa
- ✅ Cierre automático local si otro dispositivo inicia sesión

---

## 🔧 Archivos Creados/Modificados

### 1. Función Supabase RPC
**Archivo:** `supabase/functions/register_user_device_single_session.sql`

**Qué hace:**
```sql
-- IMPORTANTE: Elimina la función anterior si existe
DROP FUNCTION IF EXISTS register_user_device(...);

-- 1. Cierra TODAS las sesiones activas en otros dispositivos
UPDATE user_devices SET is_active = FALSE WHERE user_id = p_user_id AND is_active = TRUE;

-- 2. Verifica si el dispositivo ya existe (por fingerprint)
-- 3. Si hay 3 dispositivos, elimina el más antiguo
-- 4. Registra el nuevo dispositivo como ÚNICO activo
```

**Ejecutar en Supabase SQL Editor:**
```bash
# 1. Abrir Supabase Dashboard
# 2. Ir a SQL Editor
# 3. Copiar TODO el contenido del archivo:
#    supabase/functions/register_user_device_single_session.sql
# 4. Pegar en el editor
# 5. Ejecutar (botón RUN)
```

**NOTA:** El script incluye `DROP FUNCTION IF EXISTS` para eliminar la versión anterior automáticamente.

---

### 2. Hook de Monitoreo de Sesión
**Archivo:** `src/hooks/useSessionMonitor.tsx`

**Funcionalidad:**
- ⏰ **Verifica cada 30 segundos** si la sesión sigue activa
- 📊 **Actualiza actividad cada 1 minuto** para mantener sesión viva
- 🔔 **Listener en tiempo real** usando Supabase Realtime
- 🚪 **Cierra sesión automáticamente** si detecta que otro dispositivo se conectó

**Flujo:**
```
Usuario A inicia sesión en PC
   ↓
Usuario A inicia sesión en Móvil
   ↓
[Backend] Cierra sesión en PC automáticamente
   ↓
[Monitor en PC] Detecta sesión inactiva
   ↓
[PC] Muestra alerta y cierra sesión local
   ↓
[PC] Redirige a /cec
```

---

### 3. Integración en App.tsx
**Archivo:** `src/App.tsx`

**Cambio:**
```tsx
import { useSessionMonitor } from './hooks/useSessionMonitor.tsx';

const AppRoutes: React.FC = () => {
  // ... código existente
  
  // Activar monitor de sesión única
  useSessionMonitor();
  
  // ... resto del código
}
```

---

## 🧪 Pruebas Recomendadas

### Test Case 1: Inicio de Sesión en Segundo Dispositivo

**Pasos:**
1. Login en **Dispositivo A** (Chrome en PC)
2. Verificar que funciona correctamente
3. Login en **Dispositivo B** (Firefox en PC o móvil) con mismo usuario
4. **Resultado Esperado:**
   - ✅ Dispositivo B inicia sesión correctamente
   - ✅ Dispositivo A muestra alerta: "Tu sesión ha sido cerrada porque iniciaste sesión en otro dispositivo"
   - ✅ Dispositivo A cierra sesión y redirige a `/cec`
   - ✅ Solo Dispositivo B tiene sesión activa

### Test Case 2: Límite de 3 Dispositivos

**Pasos:**
1. Registrar **Dispositivo 1** (Chrome)
2. Registrar **Dispositivo 2** (Firefox)
3. Registrar **Dispositivo 3** (Edge)
4. Ir a `/devices` y verificar que hay 3 dispositivos
5. Registrar **Dispositivo 4** (Safari)
6. **Resultado Esperado:**
   - ✅ Dispositivo 4 se registra correctamente
   - ✅ Dispositivo 1 (el más antiguo) se elimina automáticamente
   - ✅ Solo quedan dispositivos 2, 3 y 4 en la lista

### Test Case 3: Monitoreo en Tiempo Real

**Pasos:**
1. Login en **Dispositivo A**
2. Dejar abierta la aplicación
3. Login en **Dispositivo B** (mismo usuario)
4. Esperar máximo 30 segundos en Dispositivo A
5. **Resultado Esperado:**
   - ✅ Dispositivo A detecta automáticamente que sesión fue cerrada
   - ✅ Se muestra alerta
   - ✅ Cierra sesión y redirige a `/cec`

### Test Case 4: Vista de Dispositivos
1. Login como usuario
2. Navegar a `/devices`
3. **Resultado Esperado:**
   - ✅ Se muestran hasta 3 dispositivos
   - ✅ Solo 1 dispositivo tiene estado "Activo"
   - ✅ Los demás muestran "Inactivo"

---

## ⚙️ Configuración

### Intervalos de Verificación
Puede ajustarse en `src/hooks/useSessionMonitor.tsx`:

```tsx
const CHECK_INTERVAL = 30000; // 30 seg - Verificar sesión activa
const ACTIVITY_UPDATE_INTERVAL = 60000; // 1 min - Actualizar actividad
```

**Recomendaciones:**
- ⚡ **CHECK_INTERVAL:** 15-60 segundos (más bajo = más rápido detecta, más requests)
- 📊 **ACTIVITY_UPDATE_INTERVAL:** 30-120 segundos

---

## 🔒 Seguridad

### Medidas Implementadas

1. **Fingerprinting de Dispositivo:**
   - Se usa un fingerprint único por dispositivo
   - Basado en: User Agent, Canvas, WebGL, Fuentes, Plugins

2. **Validación de Sesión:**
   - Cada request verifica que el dispositivo esté activo
   - Si no está activo, se cierra sesión local

3. **Logs de Auditoría:**
   - Tabla `device_access_logs` registra todas las acciones administrativas
   - Fecha, hora, IP, usuario admin, usuario objetivo, acción

4. **RLS (Row Level Security):**
   - Los usuarios solo ven sus propios dispositivos
   - Admins pueden ver todos los dispositivos

---

## 📊 Tablas de Base de Datos

### user_devices
```sql
- id (UUID, PK)
- user_id (UUID, FK → users)
- device_fingerprint (TEXT, UNIQUE por usuario)
- device_name (TEXT)
- device_type ('desktop'|'mobile'|'tablet')
- browser (TEXT)
- os (TEXT)
- session_id (TEXT, referencia a auth.sessions)
- ip_address (TEXT)
- user_agent (TEXT)
- first_login_at (TIMESTAMP)
- last_activity_at (TIMESTAMP)
- is_active (BOOLEAN)  ← Solo 1 puede ser TRUE a la vez
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

###device_access_logs
```sql
- id (UUID, PK)
- admin_user_id (UUID, FK → users)
- target_user_id (UUID, FK → users)
- action (TEXT) -- 'revoke_device', 'view_devices', etc
- device_id (UUID, FK → user_devices)
- justification (TEXT)
- ip_address (TEXT)
- created_at (TIMESTAMP)
```

---

## 🔄 Flujo de Autenticación

```
┌─────────────────────────────────────────────┐
│ Usuario inicia sesión                       │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ useAuth.tsx: login()                        │
│ - Autentica con Supabase Auth              │
│ - Obtiene session.id                        │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ deviceService.registerDevice()              │
│ - Llama a RPC register_user_device()       │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ Función SQL: register_user_device()         │
│ 1. Cierra TODAS las sesiones activas       │
│ 2. Verifica si dispositivo existe          │
│ 3. Si hay 3, elimina el más antiguo        │
│ 4. Registra nuevo dispositivo (activo)     │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│ App.tsx: useSessionMonitor()                │
│ - Inicia monitoreo automático              │
│ - Verifica cada 30 seg si sesión activa    │
│ - Actualiza actividad cada 1 min           │
└─────────────────────────────────────────────┘
```

---

## 🚨 Troubleshooting

### Problema: Usuarios se quejan de que los desloguean
**Causa Posible:** Múltiples pestañas/ventanas abiertas
**Solución:** 
- Explicar que solo 1 sesión puede estar activa
- Sugerir usar solo 1 pestaña
- Considerar aumentar CHECK_INTERVAL si es molesto

### Problema: La sesión no se cierra en el otro dispositivo
**Verificar:**
1. ¿La función SQL fue ejecutada correctamente?
2. ¿El monitor está activo? (ver console logs)
3. ¿Hay errores en la consola del navegador?
4. ¿Supabase Realtime está habilitado en el proyecto?

### Problema: Se elimina el dispositivo incorrecto
**Causa:** Lógica de "más antiguo" usa `first_login_at`
**Verificar:** Que la columna `first_login_at` tenga valores correctos

---

## 📝 Notas Importantes

1. **Supabase Realtime:**
   - Requiere que esté habilitado en el proyecto
   - Configurar en: Supabase Dashboard > Database > Replication
   - Habilitar tabla `user_devices`

2. **Fingerprinting:**
   - Puede cambiar si el usuario limpia cookies/cache
   - Se considera un "nuevo dispositivo"
   - Normal y esperado

3. **Navegación Privada:**
   - Cada ventana privada es un dispositivo diferente
   - Al cerrar, el dispositivo se elimina automáticamente

4. **Persistencia:**
   - Los dispositivos se mantienen aunque el usuario cierre sesión
   - Solo se eliminan al llegar al límite de 3
   - O si admin-campus los revoca

---

## 🎯 Próximos Pasos

1. ✅ Ejecutar función SQL en Supabase
2. ✅ Verificar que los archivos están en su lugar
3. ✅ Hacer pruebas con 2 dispositivos diferentes
4. ⏳ Monitorear logs en producción
5. ⏳ Ajustar intervalos según necesidad

---

## 👥 Créditos

**Desarrollador:** Antigravity AI Agent  
**Revisado por:** Usuario (lordexilon)  
**Fecha:** 2025-12-14

---

**¿Dudas o Problemas?**
Revisar los logs de consola en el navegador y en Supabase Dashboard > Logs
