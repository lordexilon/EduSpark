# Schema Actual de la Base de Datos - EduSpark

## 📊 Resumen del Sistema

**Estado:** ✅ **COMPLETAMENTE FUNCIONAL**
**Fecha de actualización:** 20 de octubre de 2025
**Versión:** 2.0 - Sistema Unificado

## 🗄️ Estructura de Base de Datos

### Tabla: `roles`
```sql
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Datos iniciales:**
- `1` - `admin` - Administrador del sistema
- `2` - `teacher` - Docente
- `3` - `student` - Estudiante

### Tabla: `users`
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role_id INTEGER REFERENCES roles(id),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🔐 Políticas de Seguridad (RLS)

### Políticas para `roles`:
- **"Allow public read access to roles"** - Permite lectura pública de roles (necesario para registro)

### Políticas para `users`:
- **"Allow user registration"** - Permite inserción de nuevos usuarios
- **"Allow authenticated read users"** - Permite lectura a usuarios autenticados
- **"Users can update own profile"** - Permite actualización de perfil propio

## 🔄 Triggers y Funciones

### Función: `handle_new_user()`
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name, role_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    COALESCE((new.raw_user_meta_data->>'role_id')::integer, 3)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Trigger: `on_auth_user_created`
```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

## 🚀 Estado de Funcionalidades

### ✅ Completamente Funcional:
- **Autenticación** - Login y registro
- **Sistema de roles** - Asignación automática
- **Interfaz de usuario** - Diseño moderno y responsive
- **Base de datos** - Estructura completa y optimizada

### 🔧 Configuración Actual:
- **Supabase Auth** - Habilitado con confirmación de email
- **Row Level Security** - Configurado y funcionando
- **Triggers automáticos** - Sincronización de usuarios
- **Políticas de seguridad** - Implementadas correctamente

## 📝 Notas Importantes

1. **Confirmación de email:** Actualmente habilitada en Supabase
2. **Sincronización:** Los usuarios se sincronizan automáticamente entre `auth.users` y `public.users`
3. **Roles por defecto:** Los nuevos usuarios se asignan como "student" (ID: 3)
4. **Seguridad:** RLS habilitado con políticas específicas para cada operación

## 🔄 Próximos Pasos

1. **Deshabilitar confirmación de email** en Supabase para simplificar el registro
2. **Implementar dashboard** específico por rol
3. **Agregar funcionalidades** de gestión de cursos
4. **Integrar sistema RAG** con el tutor virtual