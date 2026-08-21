# 📱 Propuesta: Límite de 3 Dispositivos por Usuario

**Fecha:** 2025-01-24  
**Estado:** 📋 PROPUESTA  
**Prioridad:** Media  
**Complejidad:** Media (6/10)

---

## 📋 Resumen Ejecutivo

Implementar un sistema de control de dispositivos que permita a cada usuario iniciar sesión en un **máximo de 3 dispositivos simultáneos**. Cuando se intente iniciar sesión en un 4º dispositivo, se cerrará automáticamente la sesión del dispositivo más antiguo.

---

## 🔍 Estado Actual

### ✅ Lo que YA está implementado:

1. **Sistema de Autenticación Robusto** (`src/hooks/useAuth.tsx`)
   - Autenticación con Supabase Auth
   - Gestión de sesiones con JWT
   - Auto-refresh de tokens
   - Persistencia de sesión en localStorage
   - Sincronización entre pestañas del mismo navegador

2. **Políticas RLS de Seguridad**
   - 80+ políticas RLS activas
   - Control de acceso por roles
   - Validación de permisos en backend

3. **Sistema de Caché de Usuario**
   - Cache local con TTL de 5 minutos
   - Sincronización entre pestañas
   - Invalidación automática

### ❌ Lo que NO está implementado:

1. **Tabla de dispositivos/sesiones activas**
2. **Límite de dispositivos por usuario**
3. **Tracking de dispositivos (fingerprinting)**
4. **UI para gestión de dispositivos**
5. **Cierre automático de sesiones antiguas**

---

## 🎯 Objetivo

Permitir que cada usuario pueda:
- Iniciar sesión en hasta **3 dispositivos diferentes** simultáneamente
- Ver qué dispositivos tienen sesión activa
- Cerrar sesión manualmente en dispositivos específicos
- Recibir notificación cuando se alcance el límite

---

## 🏗️ Arquitectura Propuesta

### 1. **Nueva Tabla: `user_devices`**

```sql
CREATE TABLE IF NOT EXISTS public.user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Identificación del dispositivo
    device_fingerprint VARCHAR(255) NOT NULL, -- Hash único del dispositivo
    device_name VARCHAR(100), -- Ej: "Chrome en Windows", "Safari en iPhone"
    device_type VARCHAR(50), -- 'desktop', 'mobile', 'tablet'
    browser VARCHAR(100), -- Ej: "Chrome 120.0"
    os VARCHAR(100), -- Ej: "Windows 11", "iOS 17.2"
    
    -- Información de sesión
    session_id VARCHAR(255) UNIQUE, -- ID de sesión de Supabase
    ip_address INET, -- Dirección IP
    user_agent TEXT, -- User agent completo
    
    -- Timestamps
    first_login_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- Fecha de expiración de la sesión
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Constraints
    UNIQUE(user_id, device_fingerprint),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para rendimiento
CREATE INDEX idx_user_devices_user ON public.user_devices(user_id);
CREATE INDEX idx_user_devices_active ON public.user_devices(user_id, is_active);
CREATE INDEX idx_user_devices_session ON public.user_devices(session_id);
CREATE INDEX idx_user_devices_last_activity ON public.user_devices(last_activity_at);

-- Trigger para updated_at
CREATE TRIGGER trigger_user_devices_updated_at
    BEFORE UPDATE ON public.user_devices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 2. **Función: Device Fingerprinting**

**Frontend** (`src/utils/deviceFingerprint.ts`):

```typescript
import FingerprintJS from '@fingerprintjs/fingerprintjs';

export interface DeviceInfo {
  fingerprint: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  userAgent: string;
}

export const getDeviceFingerprint = async (): Promise<DeviceInfo> => {
  // Inicializar FingerprintJS
  const fp = await FingerprintJS.load();
  const result = await fp.get();
  
  // Detectar tipo de dispositivo
  const ua = navigator.userAgent;
  const isMobile = /Mobile|Android|iPhone/i.test(ua);
  const isTablet = /iPad|Tablet/i.test(ua);
  
  // Detectar navegador
  let browser = 'Unknown';
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';
  
  // Detectar OS
  let os = 'Unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  
  return {
    fingerprint: result.visitorId,
    deviceName: `${browser} en ${os}`,
    deviceType: isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop',
    browser,
    os,
    userAgent: ua
  };
};
```

### 3. **Función SQL: Gestión de Dispositivos**

```sql
-- Función para registrar/actualizar dispositivo al login
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
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    device_id UUID,
    removed_device_id UUID
) AS $$
DECLARE
    v_device_id UUID;
    v_removed_device_id UUID := NULL;
    v_active_count INT;
    v_oldest_device_id UUID;
BEGIN
    -- Verificar si el dispositivo ya existe
    SELECT id INTO v_device_id
    FROM public.user_devices
    WHERE user_id = p_user_id 
      AND device_fingerprint = p_device_fingerprint;
    
    IF v_device_id IS NOT NULL THEN
        -- Dispositivo existente: actualizar
        UPDATE public.user_devices
        SET 
            session_id = p_session_id,
            last_activity_at = NOW(),
            is_active = TRUE,
            ip_address = p_ip_address,
            device_name = p_device_name,
            browser = p_browser,
            os = p_os
        WHERE id = v_device_id;
        
        RETURN QUERY SELECT TRUE, 'Dispositivo actualizado'::TEXT, v_device_id, NULL::UUID;
        RETURN;
    END IF;
    
    -- Contar dispositivos activos
    SELECT COUNT(*) INTO v_active_count
    FROM public.user_devices
    WHERE user_id = p_user_id AND is_active = TRUE;
    
    -- Si ya hay 3 dispositivos, desactivar el más antiguo
    IF v_active_count >= 3 THEN
        SELECT id INTO v_oldest_device_id
        FROM public.user_devices
        WHERE user_id = p_user_id AND is_active = TRUE
        ORDER BY last_activity_at ASC
        LIMIT 1;
        
        UPDATE public.user_devices
        SET is_active = FALSE
        WHERE id = v_oldest_device_id;
        
        v_removed_device_id := v_oldest_device_id;
    END IF;
    
    -- Insertar nuevo dispositivo
    INSERT INTO public.user_devices (
        user_id,
        device_fingerprint,
        device_name,
        device_type,
        browser,
        os,
        session_id,
        ip_address,
        user_agent,
        is_active
    ) VALUES (
        p_user_id,
        p_device_fingerprint,
        p_device_name,
        p_device_type,
        p_browser,
        p_os,
        p_session_id,
        p_ip_address,
        p_user_agent,
        TRUE
    )
    RETURNING id INTO v_device_id;
    
    IF v_removed_device_id IS NOT NULL THEN
        RETURN QUERY SELECT TRUE, 'Dispositivo registrado. Sesión más antigua cerrada.'::TEXT, v_device_id, v_removed_device_id;
    ELSE
        RETURN QUERY SELECT TRUE, 'Dispositivo registrado'::TEXT, v_device_id, NULL::UUID;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener dispositivos del usuario
CREATE OR REPLACE FUNCTION get_user_devices(p_user_id UUID)
RETURNS TABLE(
    id UUID,
    device_name VARCHAR,
    device_type VARCHAR,
    browser VARCHAR,
    os VARCHAR,
    ip_address INET,
    first_login_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    is_active BOOLEAN,
    is_current BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ud.id,
        ud.device_name,
        ud.device_type,
        ud.browser,
        ud.os,
        ud.ip_address,
        ud.first_login_at,
        ud.last_activity_at,
        ud.is_active,
        (ud.session_id = current_setting('request.jwt.claim.session_id', TRUE)) as is_current
    FROM public.user_devices ud
    WHERE ud.user_id = p_user_id
    ORDER BY ud.last_activity_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para cerrar sesión en un dispositivo específico
CREATE OR REPLACE FUNCTION revoke_device_session(
    p_user_id UUID,
    p_device_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_session_id VARCHAR;
BEGIN
    -- Obtener session_id del dispositivo
    SELECT session_id INTO v_session_id
    FROM public.user_devices
    WHERE id = p_device_id AND user_id = p_user_id;
    
    IF v_session_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Desactivar dispositivo
    UPDATE public.user_devices
    SET is_active = FALSE
    WHERE id = p_device_id;
    
    -- TODO: Invalidar sesión en Supabase Auth
    -- Esto requiere acceso a auth.sessions (solo disponible con service_role)
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4. **Políticas RLS**

```sql
-- Usuarios solo pueden ver sus propios dispositivos
CREATE POLICY "users_view_own_devices"
ON public.user_devices FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Usuarios solo pueden actualizar sus propios dispositivos
CREATE POLICY "users_update_own_devices"
ON public.user_devices FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Solo el sistema puede insertar dispositivos (vía función RPC)
CREATE POLICY "system_insert_devices"
ON public.user_devices FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins pueden ver todos los dispositivos
CREATE POLICY "admins_view_all_devices"
ON public.user_devices FOR SELECT
TO authenticated
USING (is_admin());

-- Habilitar RLS
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
```

---

## 💻 Implementación Frontend

### 1. **Servicio de Dispositivos** (`src/services/deviceService.ts`)

```typescript
import { supabase } from '../lib/supabase';
import { getDeviceFingerprint, type DeviceInfo } from '../utils/deviceFingerprint';

export interface UserDevice {
  id: string;
  device_name: string;
  device_type: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ip_address: string;
  first_login_at: string;
  last_activity_at: string;
  is_active: boolean;
  is_current: boolean;
}

export const deviceService = {
  /**
   * Registrar dispositivo al hacer login
   */
  async registerDevice(userId: string, sessionId: string): Promise<{ success: boolean; message: string; removedDevice?: string }> {
    try {
      const deviceInfo = await getDeviceFingerprint();
      
      // Obtener IP del usuario (aproximada desde el cliente)
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const { ip } = await ipResponse.json();
      
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
      
      if (error) throw error;
      
      const result = data[0];
      return {
        success: result.success,
        message: result.message,
        removedDevice: result.removed_device_id
      };
    } catch (error: any) {
      console.error('Error registrando dispositivo:', error);
      throw error;
    }
  },

  /**
   * Obtener dispositivos del usuario
   */
  async getUserDevices(userId: string): Promise<UserDevice[]> {
    try {
      const { data, error } = await supabase.rpc('get_user_devices', {
        p_user_id: userId
      });
      
      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error obteniendo dispositivos:', error);
      throw error;
    }
  },

  /**
   * Cerrar sesión en un dispositivo específico
   */
  async revokeDevice(userId: string, deviceId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('revoke_device_session', {
        p_user_id: userId,
        p_device_id: deviceId
      });
      
      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error revocando dispositivo:', error);
      throw error;
    }
  }
};
```

### 2. **Integración en useAuth.tsx**

```typescript
// En la función login, después de autenticación exitosa:
const login = async (email: string, password: string) => {
  try {
    setLoading(true);
    invalidateCache();
    const result = await authAPI.login(email, password);
    
    if (result.success && result.user) {
      setUser(result.user);
      cacheUser(result.user);
      
      // NUEVO: Registrar dispositivo
      const session = await supabase.auth.getSession();
      if (session.data.session) {
        try {
          const deviceResult = await deviceService.registerDevice(
            result.user.id,
            session.data.session.access_token
          );
          
          // Si se cerró sesión en otro dispositivo, notificar al usuario
          if (deviceResult.removedDevice) {
            // Mostrar notificación toast
            console.warn('⚠️ Se cerró sesión en el dispositivo más antiguo (límite de 3 dispositivos alcanzado)');
          }
        } catch (deviceError) {
          console.error('Error registrando dispositivo:', deviceError);
          // No bloquear el login si falla el registro de dispositivo
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error en login:', error);
    return { success: false, error: 'Error al iniciar sesión' };
  } finally {
    setLoading(false);
  }
};
```

### 3. **Página de Gestión de Dispositivos** (`src/pages/UserDevicesPage.tsx`)

```typescript
import React, { useState, useEffect } from 'react';
import { deviceService, type UserDevice } from '../services/deviceService';
import { useAuth } from '../hooks/useAuth';
import { IconDevices, IconTrash, IconRefresh } from '@tabler/icons-react';

export const UserDevicesPage: React.FC = () => {
  const { user } = useAuth();
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDevices = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await deviceService.getUserDevices(user.id);
      setDevices(data);
    } catch (error) {
      console.error('Error cargando dispositivos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, [user]);

  const handleRevokeDevice = async (deviceId: string) => {
    if (!user) return;
    
    const confirmed = window.confirm('¿Cerrar sesión en este dispositivo?');
    if (!confirmed) return;
    
    try {
      await deviceService.revokeDevice(user.id, deviceId);
      await loadDevices(); // Recargar lista
    } catch (error) {
      console.error('Error cerrando sesión:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <IconDevices className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold">Mis Dispositivos</h1>
        </div>
        <button
          onClick={loadDevices}
          className="btn btn-secondary"
        >
          <IconRefresh className="w-5 h-5" />
          Actualizar
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          Puedes iniciar sesión en hasta <strong>3 dispositivos</strong> simultáneamente. 
          Si inicias sesión en un 4º dispositivo, se cerrará automáticamente la sesión del dispositivo más antiguo.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="spinner" />
          <p className="text-gray-500 mt-4">Cargando dispositivos...</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {devices.map((device) => (
            <div
              key={device.id}
              className={`bg-white rounded-lg shadow-md p-6 ${
                device.is_current ? 'border-2 border-primary' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{device.device_name}</h3>
                    {device.is_current && (
                      <span className="px-2 py-1 bg-primary text-white text-xs rounded-full">
                        Este dispositivo
                      </span>
                    )}
                    {!device.is_active && (
                      <span className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded-full">
                        Inactivo
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <p><strong>Tipo:</strong> {device.device_type}</p>
                      <p><strong>Navegador:</strong> {device.browser}</p>
                    </div>
                    <div>
                      <p><strong>Sistema:</strong> {device.os}</p>
                      <p><strong>IP:</strong> {device.ip_address}</p>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-xs text-gray-500">
                    <p>Primer acceso: {new Date(device.first_login_at).toLocaleString()}</p>
                    <p>Última actividad: {new Date(device.last_activity_at).toLocaleString()}</p>
                  </div>
                </div>

                {!device.is_current && device.is_active && (
                  <button
                    onClick={() => handleRevokeDevice(device.id)}
                    className="btn btn-danger btn-sm ml-4"
                  >
                    <IconTrash className="w-4 h-4" />
                    Cerrar sesión
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

---

## 📊 Estimación de Desarrollo

### **Tiempo Total: 16-20 horas**

| Tarea | Horas | Prioridad |
|-------|-------|-----------|
| 1. Script SQL (tabla + funciones + RLS) | 3h | Alta |
| 2. Librería FingerprintJS + utils | 2h | Alta |
| 3. Servicio deviceService.ts | 2h | Alta |
| 4. Integración en useAuth.tsx | 2h | Alta |
| 5. Página UserDevicesPage.tsx | 4h | Media |
| 6. Testing y ajustes | 3h | Alta |
| 7. Documentación | 2h | Media |

---

## 💰 Valor Agregado

**Valor estimado:** $1,200 - $1,500 USD

**Justificación:**
- Funcionalidad de seguridad avanzada
- Mejora la experiencia de usuario
- Previene uso indebido de cuentas
- Cumple con estándares de plataformas educativas modernas

---

## ✅ Ventajas

1. **Seguridad Mejorada**
   - Previene compartir cuentas entre múltiples usuarios
   - Control de acceso más estricto

2. **Mejor UX**
   - Usuario puede gestionar sus propios dispositivos
   - Notificaciones claras cuando se alcanza el límite

3. **Cumplimiento**
   - Alineado con políticas de uso de plataformas educativas
   - Facilita auditorías de acceso

4. **Escalabilidad**
   - Fácil ajustar el límite (3 → 5 dispositivos, etc.)
   - Base para funcionalidades futuras (2FA, alertas de seguridad)

---

## ⚠️ Consideraciones

### **Técnicas:**

1. **Fingerprinting no es 100% confiable**
   - Puede cambiar si el usuario limpia cookies/cache
   - Navegación privada genera fingerprints diferentes
   - **Solución:** Combinar con IP + User Agent

2. **Invalidación de sesiones en Supabase**
   - Requiere acceso a `auth.sessions` (solo con service_role)
   - **Alternativa:** Marcar dispositivo como inactivo y validar en cada request

3. **Sincronización entre dispositivos**
   - Usar Supabase Realtime para notificar cierre de sesión
   - **Implementar:** Listener en useAuth para detectar revocación

### **UX:**

1. **Usuario puede perder acceso sin querer**
   - Si cambia de navegador/dispositivo frecuentemente
   - **Solución:** Permitir reactivar dispositivos desde email

2. **Notificación de cierre de sesión**
   - Debe ser clara y no intrusiva
   - **Implementar:** Toast notification + email opcional

---

## 🚀 Próximos Pasos

### **Fase 1: MVP (8-10 horas)**
1. ✅ Crear tabla `user_devices`
2. ✅ Implementar función `register_user_device`
3. ✅ Integrar en login (useAuth.tsx)
4. ✅ Testing básico

### **Fase 2: UI Completa (6-8 horas)**
1. ✅ Página de gestión de dispositivos
2. ✅ Función de revocación
3. ✅ Notificaciones toast
4. ✅ Testing completo

### **Fase 3: Mejoras (4-6 horas)**
1. ⏳ Realtime notifications
2. ⏳ Email de alerta de nuevo dispositivo
3. ⏳ Logs de auditoría
4. ⏳ Dashboard para admins

---

## 📚 Dependencias

### **NPM Packages:**
```json
{
  "@fingerprintjs/fingerprintjs": "^4.0.0"
}
```

### **Instalación:**
```bash
npm install @fingerprintjs/fingerprintjs
```

---

## 📝 Conclusión

Esta funcionalidad es **factible y valiosa** para EduSpark. Con **16-20 horas de desarrollo**, se puede implementar un sistema robusto de control de dispositivos que:

✅ Mejora la seguridad  
✅ Previene uso indebido  
✅ Ofrece control al usuario  
✅ Es escalable y mantenible  

**Recomendación:** Implementar en **Fase 1 (MVP)** primero para validar funcionamiento, luego expandir con UI completa.

---

**Documentación generada por:** Antigravity AI  
**Fecha:** 2025-01-24  
**Versión:** 1.0  
**Estado:** PROPUESTA 📋
