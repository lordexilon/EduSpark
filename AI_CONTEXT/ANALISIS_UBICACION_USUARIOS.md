# 📍 Análisis: Agregar Ubicación de Usuarios

## 📊 Estado Actual

### Tablas Existentes
- **`users`**: NO tiene campos de ubicación
- **`user_profiles`**: Existe en schemas antiguos pero NO se usa actualmente (tiene: address, city, country)
- **`analytics_events`**: Tiene `ip_address` que podría usarse para inferir ubicación

### Tipo TypeScript Actual
```typescript
export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  identity_document?: string | null
  identity_document_type?: IdentityDocumentType
  avatar_url?: string | null
  is_active?: boolean | null
  role: { id: number; name: string }
  created_at: string
  updated_at: string
}
// ❌ NO incluye campos de ubicación
```

## 🎯 Opciones para Agregar Ubicación

### Opción 1: Agregar Campos Directamente a `users` ✅ RECOMENDADA (Simple)

**Ventajas:**
- Implementación rápida y simple
- No requiere tabla adicional
- Fácil de consultar (JOINs innecesarios)
- Ideal si la ubicación es información básica del usuario

**Campos a Agregar:**
```sql
ALTER TABLE users ADD COLUMN city VARCHAR(100);
ALTER TABLE users ADD COLUMN state VARCHAR(100);
ALTER TABLE users ADD COLUMN country VARCHAR(100);
ALTER TABLE users ADD COLUMN country_code VARCHAR(2); -- ISO 3166-1 alpha-2 (ej: "US", "MX", "ES")
```

**Uso:**
- Campos opcionales (NULL permitido)
- Se pueden llenar manualmente o mediante formulario de perfil
- Se puede auto-completar basado en IP en registro/login

---

### Opción 2: Usar/Crear Tabla `user_profiles` ✅ RECOMENDADA (Escalable)

**Ventajas:**
- Mejor organización (separar datos básicos de perfil extendido)
- Más escalable para futuras extensiones (bio, phone, etc.)
- No "ensucia" la tabla principal `users`
- Ya existe en schemas antiguos

**SQL:**
```sql
-- Verificar si existe user_profiles
-- Si no existe, crearla:
CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  country_code VARCHAR(2),
  postal_code VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
```

**Uso:**
- JOIN con `users` cuando se necesite ubicación
- Campos opcionales

---

### Opción 3: Geolocalización Automática por IP 🌐 (Complementaria)

**Ventajas:**
- Automático (no requiere entrada manual)
- Siempre actualizado
- Útil para analytics y seguridad

**Limitaciones:**
- Menos preciso (solo ciudad/país, no dirección exacta)
- Requiere servicio externo (pago o gratuito con límites)
- Privacidad: puede ser visto como intrusivo

**Servicios Recomendados:**
- **Gratis (con límites):**
  - ipapi.co (30,000 req/mes gratis)
  - ip-api.com (45 req/min gratis)
  - ipgeolocation.io (1,000 req/mes gratis)
- **De Pago:**
  - MaxMind GeoIP2
  - ipstack
  - ipinfo.io

**Implementación:**
```typescript
// Servicio para obtener ubicación por IP
async function getLocationFromIP(ip: string) {
  // Llamar a API externa
  // Retornar: { city, state, country, country_code, latitude, longitude }
}
```

---

## 💡 Recomendación: Enfoque Híbrido

### Fase 1: Campos Directos en `users` (Inmediato)
Agregar campos básicos a `users`:
- `city`
- `state` (opcional)
- `country`
- `country_code` (para banderas, filtros, etc.)

### Fase 2: Auto-completar en Registro (Opcional)
- Obtener ubicación aproximada por IP al registrarse
- Permitir al usuario corregir/confirmar
- Guardar en campos de `users`

### Fase 3: Tabla `user_profiles` (Futuro)
- Si se necesitan más campos de perfil (address, postal_code, coordinates)
- Migrar a tabla separada

---

## 📝 Campos Sugeridos

### Básicos (Opción 1 - Directo en users)
```sql
city VARCHAR(100)           -- Ciudad
state VARCHAR(100)          -- Estado/Provincia (opcional)
country VARCHAR(100)        -- País (ej: "México", "España")
country_code VARCHAR(2)     -- Código ISO (ej: "MX", "ES", "US")
```

### Extendidos (Opción 2 - user_profiles)
```sql
address TEXT                -- Dirección completa
city VARCHAR(100)
state VARCHAR(100)
country VARCHAR(100)
country_code VARCHAR(2)
postal_code VARCHAR(20)     -- Código postal
latitude DECIMAL(10, 8)     -- Coordenadas (opcional, para mapas)
longitude DECIMAL(11, 8)
timezone VARCHAR(50)        -- Zona horaria (opcional)
```

---

## 🔄 Pasos de Implementación (Opción 1 - Simple)

### 1. Migración SQL
```sql
-- Agregar columnas a users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS state VARCHAR(100),
ADD COLUMN IF NOT EXISTS country VARCHAR(100),
ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);

-- Agregar índices para búsquedas
CREATE INDEX IF NOT EXISTS idx_users_country ON users(country);
CREATE INDEX IF NOT EXISTS idx_users_country_code ON users(country_code);
CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);
```

### 2. Actualizar Tipo TypeScript
```typescript
export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  // ... campos existentes
  city?: string | null
  state?: string | null
  country?: string | null
  country_code?: string | null
}
```

### 3. Actualizar Servicios
- `userService.ts`: Incluir campos en queries
- Formularios de registro/perfil: Agregar campos de ubicación
- Reportes/exportaciones: Incluir ubicación si es relevante

### 4. UI/UX
- Formulario de perfil: Agregar campos de ubicación
- Listados de usuarios: Mostrar ubicación (opcional)
- Filtros: Por país/ciudad (opcional)
- Exportaciones: Incluir ubicación en Excel/PDF

---

## ❓ Preguntas para Decidir

1. **¿Qué nivel de precisión necesitas?**
   - País/ciudad básico → Opción 1 (campos en users)
   - Dirección completa/coordenadas → Opción 2 (user_profiles)

2. **¿Cómo se capturará la ubicación?**
   - Manual (usuario la ingresa) → Opción 1 o 2
   - Automática (por IP) → Opción 3 como complemento

3. **¿Dónde se mostrará la ubicación?**
   - Perfil de usuario
   - Listados/grillas de usuarios
   - Reportes/exportaciones
   - Analytics/dashboards

4. **¿Es información obligatoria u opcional?**
   - Opcional → Campos NULL permitidos
   - Obligatoria → Validar en formularios

---

## ✅ Próximos Pasos Sugeridos

1. **Confirmar nivel de detalle necesario** (país/ciudad vs dirección completa)
2. **Decidir método de captura** (manual vs automático)
3. **Ejecutar migración SQL** (agregar columnas)
4. **Actualizar código TypeScript**
5. **Agregar campos en formularios de perfil/registro**
6. **Incluir en reportes/exportaciones si es necesario**

