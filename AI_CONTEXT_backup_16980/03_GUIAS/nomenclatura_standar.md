# Nomenclatura Estándar - EduSpark

## 📝 Convenciones de Naming

### **Archivos y Carpetas**

#### **Frontend (React/TypeScript)**
```
components/
├── LoginForm.tsx          # Formulario de login
├── RegisterForm.tsx       # Formulario de registro
├── Layout.tsx            # Layout principal
└── Header.tsx            # Header de la aplicación

pages/
├── LoginPage.tsx         # Página de login
├── DashboardPage.tsx     # Página de dashboard
└── ProfilePage.tsx       # Página de perfil

hooks/
├── useAuth.tsx           # Hook de autenticación
└── useApi.tsx            # Hook de API

services/
├── api.ts                # Cliente de API
└── supabase.ts           # Cliente de Supabase

lib/
├── supabase.ts           # Configuración de Supabase
└── utils.ts              # Utilidades generales
```

#### **Backend (Supabase)**
```
database/
├── schema.sql            # Esquema de base de datos
├── policies.sql          # Políticas de RLS
└── triggers.sql          # Triggers y funciones
```

### **Nomenclatura de Componentes**

#### **Componentes React**
- **PascalCase** para nombres de componentes
- **Descriptivo** y específico del propósito
- **Sufijo** según el tipo:
  - `Form.tsx` - Formularios
  - `Page.tsx` - Páginas
  - `Modal.tsx` - Modales
  - `Card.tsx` - Tarjetas

**Ejemplos:**
```typescript
// ✅ Correcto
LoginForm.tsx
RegisterForm.tsx
UserProfilePage.tsx
CourseCard.tsx

// ❌ Incorrecto
loginform.tsx
userProfile.tsx
course.tsx
```

#### **Hooks Personalizados**
- **Prefijo** `use` obligatorio
- **camelCase** para el resto
- **Descriptivo** del propósito

**Ejemplos:**
```typescript
// ✅ Correcto
useAuth.tsx
useApi.tsx
useLocalStorage.tsx
useDebounce.tsx

// ❌ Incorrecto
Auth.tsx
api.tsx
localStorage.tsx
```

### **Nomenclatura de Base de Datos**

#### **Tablas**
- **snake_case** en minúsculas
- **Singular** para nombres de tabla
- **Descriptivo** del contenido

**Ejemplos:**
```sql
-- ✅ Correcto
users
roles
courses
user_profiles

-- ❌ Incorrecto
Users
user
course_table
```

#### **Columnas**
- **snake_case** en minúsculas
- **Descriptivo** del contenido
- **Consistente** con el tipo de dato

**Ejemplos:**
```sql
-- ✅ Correcto
first_name
last_name
email
created_at
updated_at
role_id

-- ❌ Incorrecto
firstName
lastName
Email
createdAt
```

#### **Políticas de RLS**
- **PascalCase** con espacios
- **Descriptivo** de la acción y alcance

**Ejemplos:**
```sql
-- ✅ Correcto
"Allow user registration"
"Users can view own profile"
"Admins can manage all users"

-- ❌ Incorrecto
"allow_user_registration"
"user_profile_view"
"admin_manage"
```

### **Nomenclatura de Variables y Funciones**

#### **JavaScript/TypeScript**
- **camelCase** para variables y funciones
- **PascalCase** para clases y interfaces
- **Descriptivo** y específico

**Ejemplos:**
```typescript
// ✅ Correcto
const userEmail = 'user@example.com';
const isAuthenticated = true;
const handleSubmit = () => {};

interface User {
  id: string;
  email: string;
}

// ❌ Incorrecto
const user_email = 'user@example.com';
const isauth = true;
const submit = () => {};
```

#### **SQL**
- **snake_case** para funciones
- **PascalCase** para nombres de funciones
- **Descriptivo** del propósito

**Ejemplos:**
```sql
-- ✅ Correcto
CREATE OR REPLACE FUNCTION handle_new_user()
CREATE OR REPLACE FUNCTION update_updated_at_column()

-- ❌ Incorrecto
CREATE OR REPLACE FUNCTION handleNewUser()
CREATE OR REPLACE FUNCTION updateUpdatedAt()
```

### **Nomenclatura de Archivos de Configuración**

#### **Archivos de Configuración**
- **kebab-case** para nombres de archivo
- **Descriptivo** del propósito
- **Extensión** apropiada

**Ejemplos:**
```
// ✅ Correcto
supabase-setup.sql
fix-policies.sql
complete-reset.sql
env.example

// ❌ Incorrecto
supabaseSetup.sql
fixPolicies.sql
completeReset.sql
env_example
```

### **Nomenclatura de Rutas**

#### **Rutas de la Aplicación**
- **kebab-case** para URLs
- **Descriptivo** del contenido
- **Consistente** con la estructura

**Ejemplos:**
```
// ✅ Correcto
/login
/register
/dashboard
/user-profile
/course-management

// ❌ Incorrecto
/Login
/Register
/Dashboard
/userProfile
/courseManagement
```

### **Nomenclatura de Estados**

#### **Estados de la Aplicación**
- **camelCase** para variables de estado
- **Descriptivo** del estado
- **Consistente** con el tipo de dato

**Ejemplos:**
```typescript
// ✅ Correcto
const [isLoading, setIsLoading] = useState(false);
const [user, setUser] = useState<User | null>(null);
const [error, setError] = useState<string>('');

// ❌ Incorrecto
const [loading, setLoading] = useState(false);
const [userData, setUserData] = useState<User | null>(null);
const [err, setErr] = useState<string>('');
```

### **Nomenclatura de Eventos**

#### **Manejadores de Eventos**
- **Prefijo** `handle` para funciones de evento
- **camelCase** para el resto
- **Descriptivo** de la acción

**Ejemplos:**
```typescript
// ✅ Correcto
const handleSubmit = (e: FormEvent) => {};
const handleChange = (e: ChangeEvent) => {};
const handleClick = () => {};

// ❌ Incorrecto
const submit = (e: FormEvent) => {};
const change = (e: ChangeEvent) => {};
const click = () => {};
```

### **Nomenclatura de Constantes**

#### **Constantes**
- **UPPER_SNAKE_CASE** para constantes globales
- **camelCase** para constantes locales
- **Descriptivo** del valor

**Ejemplos:**
```typescript
// ✅ Correcto
const API_BASE_URL = 'https://api.example.com';
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_ROLE_ID = 3;

// ❌ Incorrecto
const apiBaseUrl = 'https://api.example.com';
const maxRetryAttempts = 3;
const defaultRoleId = 3;
```

### **Nomenclatura de Tipos e Interfaces**

#### **TypeScript Types**
- **PascalCase** para tipos e interfaces
- **Descriptivo** del contenido
- **Sufijo** según el tipo

**Ejemplos:**
```typescript
// ✅ Correcto
interface User {
  id: string;
  email: string;
}

type UserRole = 'admin' | 'teacher' | 'student';

interface LoginFormData {
  email: string;
  password: string;
}

// ❌ Incorrecto
interface user {
  id: string;
  email: string;
}

type userRole = 'admin' | 'teacher' | 'student';
```

### **Nomenclatura de CSS/Tailwind**

#### **Clases CSS**
- **kebab-case** para clases personalizadas
- **Tailwind** para utilidades
- **Descriptivo** del propósito

**Ejemplos:**
```css
/* ✅ Correcto */
.login-form {
  /* estilos */
}

.user-profile-card {
  /* estilos */
}

/* Tailwind classes */
<div className="bg-blue-600 text-white p-4 rounded-lg">
```

### **Nomenclatura de Comentarios**

#### **Comentarios**
- **Español** para comentarios de usuario
- **Inglés** para comentarios técnicos
- **Descriptivo** y útil

**Ejemplos:**
```typescript
// ✅ Correcto
// Cargar roles disponibles para el formulario de registro
const loadRoles = async () => {
  // TODO: Implementar cache para roles
  const result = await rolesAPI.getRoles();
};

/**
 * Hook personalizado para manejar la autenticación
 * @returns Objeto con funciones de auth y estado del usuario
 */
export const useAuth = () => {
  // Implementation
};
```

## 📋 Resumen de Convenciones

| Tipo | Convención | Ejemplo |
|------|------------|---------|
| **Componentes** | PascalCase | `LoginForm.tsx` |
| **Hooks** | camelCase con `use` | `useAuth.tsx` |
| **Variables** | camelCase | `userEmail` |
| **Funciones** | camelCase | `handleSubmit` |
| **Constantes** | UPPER_SNAKE_CASE | `API_BASE_URL` |
| **Tipos** | PascalCase | `User` |
| **Tablas** | snake_case | `users` |
| **Columnas** | snake_case | `first_name` |
| **Archivos** | kebab-case | `user-profile.tsx` |
| **Rutas** | kebab-case | `/user-profile` |

## 🎯 Beneficios de la Nomenclatura Estándar

1. **Consistencia** - Código uniforme y predecible
2. **Legibilidad** - Fácil de entender y mantener
3. **Colaboración** - Estándar común para el equipo
4. **Mantenimiento** - Fácil de modificar y extender
5. **Debugging** - Fácil de localizar problemas