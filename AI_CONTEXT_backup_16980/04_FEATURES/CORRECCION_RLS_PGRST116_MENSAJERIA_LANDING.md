# Corrección de Errores RLS y PGRST116 - Mensajería y Landing Page

**Fecha:** 27 de noviembre de 2025  
**Tipo:** Bug Fix / RLS Policies  
**Prioridad:** Alta  
**Estado:** ✅ Completado

## 📋 Resumen

Se resolvieron múltiples errores relacionados con Row Level Security (RLS) y el error `PGRST116` en los módulos de mensajería y configuración de landing page institucional.

## 🐛 Problemas Identificados

### 1. Error PGRST116 en Mensajería
- **Síntoma:** `"The result contains 0 rows"` al intentar obtener el último mensaje de una conversación vacía
- **Causa:** Uso de `.single()` en consultas que pueden retornar 0 resultados
- **Impacto:** Impedía la visualización de conversaciones nuevas sin mensajes

### 2. Error 406 (Not Acceptable) en Mensajes
- **Síntoma:** Consultas a la tabla `messages` rechazadas con código 406
- **Causa:** Falta de políticas RLS en la tabla `messages`
- **Impacto:** Los usuarios no podían ver ni enviar mensajes

### 3. Error 406 en Landing Page Config
- **Síntoma:** No se podía cargar la configuración de landing page institucional
- **Causa:** Falta de políticas RLS en `institution_landing_config`
- **Impacto:** Admin-campus no podía gestionar su landing page

### 4. Permisos Incorrectos en Landing Config
- **Síntoma:** Admin-campus podía editar configuraciones de otras instituciones
- **Causa:** Política RLS demasiado permisiva
- **Impacto:** Riesgo de seguridad y modificación no autorizada

## 🔧 Soluciones Implementadas

### 1. Corrección de `messagingService.ts`

**Archivo:** `src/services/messagingService.ts`

**Cambios realizados:**
- Reemplazado `.single()` por `.maybeSingle()` en 6 ubicaciones:
  - `getConversation()` - línea 73
  - `sendMessage()` - línea 286
  - `subscribeToConversations()` - línea 430
  - `create()` - línea 141
  - `update()` - línea 160
  - `updateByInstitutionId()` - línea 179

**Beneficio:** Manejo gracioso de consultas que pueden retornar 0 filas, eliminando el error PGRST116.

### 2. Políticas RLS para `messages`

**Script:** `sql_scripts/fix_messages_rls_policies.sql`

```sql
-- Habilitar RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Política de lectura
CREATE POLICY "Users can view messages in their conversations"
ON messages FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM conversations
    WHERE participant1_id = auth.uid() OR participant2_id = auth.uid()
  )
);

-- Política de inserción
CREATE POLICY "Users can insert messages in their conversations"
ON messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND conversation_id IN (
    SELECT id FROM conversations
    WHERE participant1_id = auth.uid() OR participant2_id = auth.uid()
  )
);

-- Política de actualización
CREATE POLICY "Users can update their own messages"
ON messages FOR UPDATE
USING (
  conversation_id IN (
    SELECT id FROM conversations
    WHERE participant1_id = auth.uid() OR participant2_id = auth.uid()
  )
);
```

### 3. Políticas RLS para `institution_landing_config`

**Script:** `sql_scripts/fix_landing_config_rls.sql`

```sql
-- Habilitar RLS
ALTER TABLE institution_landing_config ENABLE ROW LEVEL SECURITY;

-- Acceso público de lectura (para landing pages públicas)
CREATE POLICY "Public can view landing configs"
ON institution_landing_config FOR SELECT
USING (true);

-- Gestión restringida por rol e institución
CREATE POLICY "Admins can manage landing configs"
ON institution_landing_config FOR ALL
USING (
  -- Admin completo puede gestionar todas las instituciones
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role_id = 3
  )
  OR
  -- Admin-campus solo puede gestionar su institución
  (
    institution_id IN (
      SELECT institution_id 
      FROM user_institutions 
      WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role_id = 5
    )
  )
);
```

### 4. Corrección de `landingConfigService.ts`

**Archivo:** `src/services/landingConfigService.ts`

**Cambios realizados:**
- Reemplazado `.single()` por `.maybeSingle()` en todas las consultas
- Agregado manejo de errores con `try-catch` en `getForCurrentUser()`
- Eliminadas verificaciones redundantes de `PGRST116`

**Código mejorado:**
```typescript
async getForCurrentUser(): Promise<LandingConfig | null> {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      console.warn('User not authenticated or error getting user:', userError);
      return null;
    }

    const { data: userInstitution, error: instError } = await supabase
      .from('user_institutions')
      .select('institution_id')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (instError || !userInstitution) {
      console.warn('No institution found for user or error:', instError);
      return null;
    }

    return this.getByInstitutionId(userInstitution.institution_id);
  } catch (error) {
    console.error('Error in getForCurrentUser:', error);
    return null;
  }
}
```

### 5. Datos Iniciales para CEC

**Script:** `sql_scripts/insert_cec_landing_config.sql`

Inserta configuración inicial para "Centro de Estudio Cavavelos" (institution_id = 2):
- Título hero: "Educación a Distancia de Calidad"
- Filosofía educativa completa
- Logo institucional
- Colores corporativos (#2563eb, #1e40af)
- Información de contacto

**Características:**
- Usa `ON CONFLICT` para actualizar si ya existe
- Datos basados en el contenido hardcodeado previo de `InstitutionLandingPage.tsx`

## 📁 Archivos Modificados

### Código TypeScript
1. `src/services/messagingService.ts` - Corrección de `.single()` a `.maybeSingle()`
2. `src/services/landingConfigService.ts` - Manejo robusto de errores y `.maybeSingle()`

### Scripts SQL
1. `sql_scripts/fix_messages_rls_policies.sql` - Políticas RLS para mensajes
2. `sql_scripts/fix_landing_config_rls.sql` - Políticas RLS para landing config
3. `sql_scripts/insert_cec_landing_config.sql` - Datos iniciales CEC

## 🔐 Seguridad

### Políticas Implementadas

**Mensajes:**
- ✅ Los usuarios solo pueden ver mensajes de sus propias conversaciones
- ✅ Solo pueden enviar mensajes en conversaciones donde participan
- ✅ Solo pueden actualizar mensajes de sus conversaciones

**Landing Page Config:**
- ✅ Acceso público de lectura (necesario para landing pages)
- ✅ Admin completo (role_id = 3) puede gestionar todas las instituciones
- ✅ Admin-campus (role_id = 5) solo puede gestionar su propia institución
- ✅ Verificación mediante `user_institutions` para admin-campus

## 📊 Impacto

### Antes
- ❌ Error PGRST116 en conversaciones vacías
- ❌ Error 406 al intentar acceder a mensajes
- ❌ Error 406 al cargar configuración de landing page
- ❌ Admin-campus podía editar otras instituciones
- ❌ Errores de red no manejados correctamente

### Después
- ✅ Conversaciones vacías se manejan correctamente
- ✅ Mensajes accesibles según permisos de usuario
- ✅ Landing page config carga sin errores
- ✅ Admin-campus restringido a su institución
- ✅ Errores de red manejados con `try-catch`
- ✅ Logs informativos para debugging

## 📦 Configuración de Storage (Bucket de Imágenes)

### Bucket: `landing-page-images`

**Script:** `sql_scripts/setup_landing_images_bucket.sql`

**Propósito:** Almacenar imágenes de landing pages (logos, hero images, galería)

### Estructura de Carpetas

```
landing-page-images/
├── institution-2/          # Centro de Estudio Cavavelos
│   ├── logo.webp
│   ├── hero.jpg
│   └── gallery/
│       ├── image1.jpg
│       └── image2.jpg
├── institution-6/          # EduSpark University
│   └── logo.png
└── ...
```

### Políticas RLS del Bucket

1. **Lectura Pública:**
   - Cualquier usuario (incluso no autenticado) puede ver las imágenes
   - Necesario para que las landing pages públicas funcionen

2. **Subida de Imágenes:**
   - Solo usuarios autenticados pueden subir
   - Validación adicional en el frontend

3. **Actualización:**
   - Admin completo: Puede actualizar cualquier imagen
   - Admin-campus: Solo imágenes de su institución (`institution-{id}/`)

4. **Eliminación:**
   - Admin completo: Puede eliminar cualquier imagen
   - Admin-campus: Solo imágenes de su institución

### Configuración Manual en Supabase

1. Ir a **Storage** en Supabase Dashboard
2. Click en **Create new bucket**
3. Nombre: `landing-page-images`
4. **Public bucket:** ✅ YES
5. Click **Create bucket**
6. Ejecutar `setup_landing_images_bucket.sql` para aplicar políticas RLS

### Uso en la Interfaz

La página de configuración (`/admin/settings/landing-page`) **ya soporta URLs opcionales**:

- **Logo:** Campo de texto para ingresar URL (opcional)
- **Hero Image:** Campo de texto para URL de imagen de fondo
- **Gallery Images:** Cada imagen tiene un campo para URL
- **Featured Students:** Campo para URL de foto de estudiante

**Opciones para el usuario:**
1. **URL Externa:** Pegar directamente una URL de imagen externa (ej: Unsplash, CDN propio)
2. **Supabase Storage:** 
   - Subir imagen al bucket `landing-page-images`
   - Copiar la URL pública generada
   - Pegarla en el campo correspondiente

**Ejemplo de URL de Supabase Storage:**
```
https://mckfscukxcqwntpjagar.supabase.co/storage/v1/object/public/landing-page-images/institution-2/logo.webp
```

## 🚀 Instrucciones de Despliegue


### 1. Ejecutar Scripts SQL en Supabase Dashboard

En el orden indicado:

```bash
# 1. Políticas de mensajes
sql_scripts/fix_messages_rls_policies.sql

# 2. Políticas de landing config
sql_scripts/fix_landing_config_rls.sql

# 3. Datos iniciales CEC
sql_scripts/insert_cec_landing_config.sql
```

### 2. Verificar Funcionamiento

1. **Mensajería:**
   - Login como estudiante
   - Navegar a `/messages`
   - Crear nueva conversación
   - Verificar que no hay error PGRST116

2. **Landing Page Config:**
   - Login como admin-campus
   - Navegar a `/admin/settings/landing-page`
   - Verificar que carga la configuración
   - Intentar editar y guardar cambios

3. **Seguridad:**
   - Verificar que admin-campus solo ve su institución
   - Verificar que estudiantes solo ven sus mensajes

## 🔄 Relación con Otros Módulos

### Dependencias
- `fix_enrollment_recursion_v2.sql` - Debe ejecutarse primero para evitar errores de recursión
- `fix_rls_recursion.sql` - Políticas de usuarios (teachers/students)
- `fix_classmates_permissions.sql` - Permisos de compañeros de clase

### Módulos Afectados
- Sistema de mensajería (`MessagingPage.tsx`)
- Landing page institucional (`InstitutionLandingPage.tsx`)
- Configuración de landing page (`LandingPageConfigPage.tsx`)
- Autenticación (`useAuth.tsx`)

## 📝 Notas Técnicas

### `.single()` vs `.maybeSingle()`

**`.single()`:**
- Espera exactamente 1 resultado
- Lanza error PGRST116 si hay 0 resultados
- Lanza error si hay más de 1 resultado

**`.maybeSingle()`:**
- Retorna `null` si hay 0 resultados
- Retorna el objeto si hay 1 resultado
- Lanza error si hay más de 1 resultado

**Cuándo usar cada uno:**
- Usar `.single()` cuando el resultado DEBE existir (ej: obtener usuario por ID conocido)
- Usar `.maybeSingle()` cuando el resultado PUEDE no existir (ej: último mensaje, configuración opcional)

### Manejo de Errores de Red

Implementado `try-catch` en `getForCurrentUser()` para manejar:
- `ERR_NAME_NOT_RESOLVED` - Problemas de DNS/conectividad
- Errores de autenticación de Supabase
- Timeouts de red

## ✅ Testing

### Casos de Prueba

1. **Conversación Nueva (Sin Mensajes):**
   - ✅ No genera error PGRST116
   - ✅ Muestra interfaz vacía correctamente

2. **Mensajes con RLS:**
   - ✅ Usuario ve solo sus conversaciones
   - ✅ No puede acceder a mensajes de otros

3. **Landing Config:**
   - ✅ Admin-campus ve solo su institución
   - ✅ Admin completo ve todas las instituciones
   - ✅ Público puede ver landing pages

4. **Errores de Red:**
   - ✅ No rompe la aplicación
   - ✅ Muestra logs informativos
   - ✅ Retorna `null` graciosamente

## 🎯 Próximos Pasos

1. ✅ Ejecutar scripts SQL en producción
2. ⏳ Monitorear logs de errores
3. ⏳ Agregar tests unitarios para `.maybeSingle()`
4. ⏳ Implementar UI para gestión de landing page
5. ⏳ Agregar validación de formularios en landing config

## 📚 Referencias

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgREST Error Codes](https://postgrest.org/en/stable/errors.html)
- Conversación anterior: "Dynamic Landing Page Setup"
- Conversación anterior: "Debugging Missing Teacher in Messaging"
