# 📊 Propuesta: Reporte de Auditoría de Dispositivos

**Fecha:** 2025-01-24  
**Tipo:** Feature - Seguridad y Auditoría  
**Prioridad:** Alta  

---

## 🎯 Objetivo

Crear un **panel de auditoría de dispositivos** para administradores que permita:
- Monitorear cuántos dispositivos tiene cada usuario
- Ver desde dónde se conectan (ubicación aproximada por IP)
- Detectar patrones sospechosos
- Generar reportes de cumplimiento

---

## 👥 Niveles de Acceso

### **Admin Global** 🔴
- ✅ Ve **todos los usuarios** de todas las instituciones
- ✅ Ve **IPs completas** sin ofuscación
- ✅ Puede **cerrar sesiones** de cualquier usuario
- ✅ Acceso a **logs de auditoría completos**
- ✅ Exportar reportes en CSV/Excel

### **Admin-Campus** 🟡
- ✅ Ve solo **usuarios de su institución**
- ⚠️ Ve **IPs parcialmente ofuscadas** (ej: `181.94.xxx.xxx`)
- ✅ Puede **cerrar sesiones** con justificación obligatoria
- ✅ Acceso a **logs de su institución**
- ✅ Exportar reportes de su institución

---

## 📊 Métricas y Reportes

### **1. Dashboard Principal**

```
┌─────────────────────────────────────────────────┐
│  📊 Resumen de Dispositivos                     │
├─────────────────────────────────────────────────┤
│  👥 Total Usuarios:           1,234             │
│  📱 Total Dispositivos:       2,856             │
│  ⚠️  Usuarios con 3+ disp:    45 (3.6%)         │
│  🔴 Sesiones cerradas hoy:    12                │
└─────────────────────────────────────────────────┘
```

### **2. Tabla de Usuarios**

| Usuario | Email | Institución | Dispositivos | Último Acceso | Ubicación | Acciones |
|---------|-------|-------------|--------------|---------------|-----------|----------|
| Miguel C. | miguec@... | UTEC | 3/3 🔴 | Hace 5 min | Uruguay 🇺🇾 | [Ver] [Cerrar] |
| Ana G. | ana@... | UTEC | 2/3 🟢 | Hace 1 hora | Uruguay 🇺🇾 | [Ver] |
| Pedro L. | pedro@... | ORT | 1/3 🟢 | Hace 2 días | Argentina 🇦🇷 | [Ver] |

### **3. Vista Detallada por Usuario**

```
┌─────────────────────────────────────────────────┐
│  👤 Miguel Cervantes (miguec@gmail.com)         │
├─────────────────────────────────────────────────┤
│  📱 Dispositivos Activos: 3/3                   │
│                                                  │
│  1. Edge 142.0 (Computadora)                    │
│     📍 IP: 181.94.250.65 → Montevideo, Uruguay  │
│     🕐 Último acceso: Hace 5 minutos            │
│     🔑 Sesión: 9d73caf4-0523...                 │
│     [Cerrar Sesión]                             │
│                                                  │
│  2. Chrome 120.0 (Móvil)                        │
│     📍 IP: 181.94.250.65 → Montevideo, Uruguay  │
│     🕐 Último acceso: Hace 2 horas              │
│     [Cerrar Sesión]                             │
│                                                  │
│  3. Firefox 121.0 (Computadora)                 │
│     📍 IP: 200.45.123.89 → Buenos Aires, ARG    │
│     🕐 Último acceso: Hace 1 día                │
│     ⚠️ Ubicación diferente                      │
│     [Cerrar Sesión]                             │
└─────────────────────────────────────────────────┘
```

### **4. Alertas de Seguridad**

```
⚠️ ALERTAS RECIENTES

🔴 ALTA - Usuario con 3 dispositivos en 3 países diferentes
   👤 Juan Pérez | 📅 Hoy 14:30
   📍 Uruguay, Argentina, España

🟡 MEDIA - Múltiples intentos de login desde IP nueva
   👤 María López | 📅 Hoy 12:15
   📍 IP: 45.123.45.67 (Brasil)

🟢 INFO - Usuario alcanzó límite de dispositivos
   👤 Carlos Gómez | 📅 Ayer 18:45
   📱 Dispositivo más antiguo cerrado automáticamente
```

### **5. Logs de Auditoría**

| Fecha/Hora | Admin | Acción | Usuario Afectado | Dispositivo | Justificación | IP Admin |
|------------|-------|--------|------------------|-------------|---------------|----------|
| 2025-01-24 14:30 | admin@utec | Cerró sesión | miguel@... | Chrome (Móvil) | Solicitud del usuario | 181.94.x.x |
| 2025-01-24 12:15 | campus@ort | Cerró sesión | ana@... | Edge (PC) | Actividad sospechosa | 200.45.x.x |

---

## 🛠️ Funcionalidades Técnicas

### **A. Geolocalización de IP**

**Opción 1: API Gratuita (Recomendada para MVP)**
```typescript
// Usar ipapi.co (1,000 requests/día gratis)
const getIPLocation = async (ip: string) => {
  const response = await fetch(`https://ipapi.co/${ip}/json/`);
  const data = await response.json();
  return {
    city: data.city,
    country: data.country_name,
    countryCode: data.country_code,
    flag: `🇺🇾` // Emoji de bandera
  };
};
```

**Opción 2: API Premium (Para producción)**
- MaxMind GeoIP2 ($50/mes)
- IPinfo.io ($99/mes)

### **B. Detección de Anomalías**

```typescript
// Detectar patrones sospechosos
const detectAnomalies = (devices: UserDevice[]) => {
  const alerts = [];
  
  // 1. Múltiples países en poco tiempo
  const countries = new Set(devices.map(d => d.country));
  if (countries.size >= 3) {
    alerts.push({
      level: 'high',
      message: 'Dispositivos en 3+ países diferentes'
    });
  }
  
  // 2. Cambio de IP frecuente
  const ips = devices.map(d => d.ip_address);
  const uniqueIPs = new Set(ips);
  if (uniqueIPs.size >= 5) {
    alerts.push({
      level: 'medium',
      message: 'Múltiples IPs en corto período'
    });
  }
  
  // 3. Dispositivo en país diferente al usuario
  if (user.country !== device.country) {
    alerts.push({
      level: 'medium',
      message: 'Acceso desde país diferente'
    });
  }
  
  return alerts;
};
```

### **C. Exportación de Reportes**

```typescript
// Exportar a CSV
const exportDeviceReport = (devices: UserDevice[]) => {
  const csv = [
    ['Usuario', 'Email', 'Dispositivo', 'IP', 'País', 'Último Acceso'],
    ...devices.map(d => [
      d.user_name,
      d.user_email,
      d.device_name,
      d.ip_address,
      d.country,
      d.last_activity_at
    ])
  ];
  
  downloadCSV(csv, 'reporte-dispositivos.csv');
};
```

---

## 📋 Funciones SQL Necesarias

### **1. Función para Admin Global**

```sql
CREATE OR REPLACE FUNCTION get_devices_report_admin()
RETURNS TABLE(
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    institution_name TEXT,
    active_devices_count INTEGER,
    total_devices_count INTEGER,
    last_access TIMESTAMPTZ,
    devices JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.first_name || ' ' || u.last_name,
        u.email,
        i.name,
        COUNT(CASE WHEN ud.is_active THEN 1 END)::INTEGER,
        COUNT(*)::INTEGER,
        MAX(ud.last_activity_at),
        jsonb_agg(
            jsonb_build_object(
                'id', ud.id,
                'device_name', ud.device_name,
                'device_type', ud.device_type,
                'ip_address', ud.ip_address,
                'is_active', ud.is_active,
                'last_activity_at', ud.last_activity_at
            )
        )
    FROM users u
    LEFT JOIN user_devices ud ON u.id = ud.user_id
    LEFT JOIN user_institutions ui ON u.id = ui.user_id AND ui.is_primary = TRUE
    LEFT JOIN institutions i ON ui.institution_id = i.id
    WHERE is_admin_global_safe()
    GROUP BY u.id, u.first_name, u.last_name, u.email, i.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **2. Función para Admin-Campus**

```sql
CREATE OR REPLACE FUNCTION get_devices_report_campus()
RETURNS TABLE(
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    active_devices_count INTEGER,
    total_devices_count INTEGER,
    last_access TIMESTAMPTZ,
    devices JSONB
) AS $$
DECLARE
    v_institution_id INTEGER;
BEGIN
    -- Obtener institución del admin
    v_institution_id := get_user_institution_id();
    
    RETURN QUERY
    SELECT 
        u.id,
        u.first_name || ' ' || u.last_name,
        u.email,
        COUNT(CASE WHEN ud.is_active THEN 1 END)::INTEGER,
        COUNT(*)::INTEGER,
        MAX(ud.last_activity_at),
        jsonb_agg(
            jsonb_build_object(
                'id', ud.id,
                'device_name', ud.device_name,
                'device_type', ud.device_type,
                -- IP ofuscada para admin-campus
                'ip_address', CASE 
                    WHEN ud.ip_address IS NOT NULL THEN
                        split_part(ud.ip_address::TEXT, '.', 1) || '.' ||
                        split_part(ud.ip_address::TEXT, '.', 2) || '.xxx.xxx'
                    ELSE NULL
                END,
                'is_active', ud.is_active,
                'last_activity_at', ud.last_activity_at
            )
        )
    FROM users u
    LEFT JOIN user_devices ud ON u.id = ud.user_id
    INNER JOIN user_institutions ui ON u.id = ui.user_id 
        AND ui.institution_id = v_institution_id
        AND ui.is_primary = TRUE
    WHERE is_admin_campus_safe()
    GROUP BY u.id, u.first_name, u.last_name, u.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🎨 UI Propuesta

### **Página: `/admin/devices-report`**

**Componentes:**
1. **Header con métricas** - Cards con totales
2. **Filtros** - Por institución, fecha, estado
3. **Tabla de usuarios** - Ordenable y filtrable
4. **Modal de detalles** - Al hacer click en un usuario
5. **Panel de alertas** - Sidebar con alertas de seguridad
6. **Botón de exportar** - CSV/Excel

---

## 📊 Valor Agregado

### **Para la Institución:**
- ✅ **Seguridad mejorada** - Detectar accesos no autorizados
- ✅ **Cumplimiento** - Auditoría completa para regulaciones
- ✅ **Transparencia** - Logs de todas las acciones administrativas
- ✅ **Prevención** - Alertas tempranas de actividad sospechosa

### **Para el Usuario:**
- ✅ **Control** - Sabe qué dispositivos están activos
- ✅ **Privacidad** - Solo admins ven la información
- ✅ **Seguridad** - Puede reportar dispositivos no reconocidos

---

## 🚀 Plan de Implementación

### **Fase 1: Backend (2-3 horas)**
- ✅ Crear funciones SQL de reportes
- ✅ Agregar campo `country` a `user_devices`
- ✅ Crear función de geolocalización

### **Fase 2: Frontend (4-5 horas)**
- ✅ Crear página `AdminDevicesReportPage.tsx`
- ✅ Componente de tabla con filtros
- ✅ Modal de detalles por usuario
- ✅ Panel de alertas
- ✅ Exportación a CSV

### **Fase 3: Geolocalización (1-2 horas)**
- ✅ Integrar API de geolocalización
- ✅ Cachear resultados para no exceder límites
- ✅ Mostrar banderas de países

### **Fase 4: Alertas (2-3 horas)**
- ✅ Lógica de detección de anomalías
- ✅ Sistema de notificaciones
- ✅ Dashboard de alertas

**Total estimado:** 9-13 horas de desarrollo

---

## 💰 Valor Comercial

**Precio sugerido para esta feature:**
- **Desarrollo:** $800 - $1,200 USD
- **Valor para cliente:** $2,000 - $3,000 USD
- **ROI:** Prevención de fraude, cumplimiento regulatorio

---

## ❓ Preguntas para Definir

1. **¿Qué nivel de detalle quieres en los reportes?**
   - Básico (solo conteo)
   - Medio (con ubicaciones)
   - Avanzado (con alertas y anomalías)

2. **¿Necesitas exportación de reportes?**
   - CSV
   - Excel
   - PDF

3. **¿Quieres notificaciones automáticas?**
   - Email al admin cuando hay alertas
   - Notificaciones en la app

4. **¿Presupuesto para API de geolocalización?**
   - Gratis (1,000 requests/día)
   - Premium ($50-100/mes)

---

## 🎯 Mi Recomendación

**Para MVP (Mínimo Viable):**
1. ✅ Dashboard básico con métricas
2. ✅ Tabla de usuarios con dispositivos
3. ✅ Vista detallada por usuario
4. ✅ Geolocalización gratuita (ipapi.co)
5. ✅ Exportar a CSV
6. ⏳ Alertas (Fase 2)
7. ⏳ Notificaciones (Fase 3)

**¿Te parece bien este enfoque?** 🚀

¿Quieres que empiece a implementar la Fase 1 (Backend) ahora?
