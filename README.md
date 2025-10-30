# EduSpark - Sistema Educativo Inteligente

## 🎯 Descripción

EduSpark es una plataforma educativa moderna que combina inteligencia artificial con pedagogía avanzada para crear experiencias de aprendizaje únicas. El sistema incluye un tutor virtual IA, gestión de cursos, y un sistema de roles completo.

## 🚀 Características Principales

### ✅ **Sistema de Autenticación Completo**
- Login y registro de usuarios
- Sistema de roles (Administrador, Docente, Estudiante)
- Gestión de sesiones automática
- Confirmación de email

### ✅ **Interfaz Moderna**
- Diseño responsive con Tailwind CSS
- Componentes reutilizables
- Animaciones suaves
- Experiencia de usuario optimizada

### ✅ **Base de Datos Optimizada**
- PostgreSQL con Supabase
- Row Level Security (RLS)
- Triggers automáticos
- Políticas de seguridad

### ✅ **Arquitectura Simplificada**
- Frontend unificado en React + TypeScript
- Conexión directa con Supabase
- Sin backend intermedio
- Desarrollo ágil y mantenible

## 🏗️ Arquitectura del Sistema

### **Frontend (Puerto 5173)**
```
eduspark/
├── components/          # Componentes React reutilizables
├── pages/              # Páginas de la aplicación
├── hooks/              # Hooks personalizados
├── services/           # Servicios de API
├── lib/                # Configuraciones
├── AI_CONTEXT/         # Documentación del proyecto
├── TEST_MATERIA/       # Material de prueba
└── sql_scripts/        # Scripts SQL de configuración
```

### **Backend (Supabase)**
- **PostgreSQL** - Base de datos principal
- **Supabase Auth** - Autenticación y autorización
- **Row Level Security** - Seguridad a nivel de fila
- **Triggers** - Automatización de procesos

## 🛠️ Tecnologías Utilizadas

### **Frontend**
- **React 18** - Biblioteca de interfaz de usuario
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Framework de estilos
- **Vite** - Herramienta de construcción
- **Lucide React** - Iconos

### **Backend**
- **Supabase** - Backend as a Service
- **PostgreSQL** - Base de datos
- **Row Level Security** - Seguridad de datos
- **JWT** - Tokens de autenticación

## 🚀 Instalación y Configuración

### **Prerrequisitos**
- Node.js 20.19+ 
- npm o yarn
- Cuenta de Supabase

### **Pasos de Instalación**

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd eduspark
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp sql_scripts/env.example .env.local
```

Editar `.env.local` con tus credenciales de Supabase:
```env
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

4. **Configurar la base de datos**
```bash
# Ejecutar en el SQL Editor de Supabase
cat sql_scripts/complete-reset.sql
```

5. **Iniciar el servidor de desarrollo (Vite)**
```bash
npm run dev
```

6. **Acceder a la aplicación**
```
http://localhost:5173
```

## 📊 Sistema de Roles

### **Administrador**
- Acceso completo al sistema
- Gestión de usuarios y cursos
- Configuración del sistema
- Analytics y reportes

### **Docente**
- Creación y gestión de cursos
- Seguimiento de estudiantes
- Configuración del tutor IA
- Reportes de progreso

### **Estudiante**
- Acceso a cursos asignados
- Interacción con tutor virtual
- Seguimiento de progreso
- Participación en foros

## 🔒 Seguridad

### **Autenticación**
- JWT tokens seguros
- Sesiones persistentes
- Confirmación de email
- Recuperación de contraseña

### **Autorización**
- Row Level Security (RLS)
- Políticas granulares
- Control de acceso por rol
- Auditoría de operaciones

## 📁 Estructura del Proyecto

```
eduspark/
├── components/                # Componentes React
│   ├── LoginForm.tsx         # Formulario de login
│   ├── RegisterForm.tsx      # Formulario de registro
│   └── Layout.tsx            # Layout principal
├── pages/                    # Páginas de la aplicación
│   ├── LoginPage.tsx         # Página de login
│   └── ProfilePage.tsx       # Página de perfil
├── hooks/                    # Hooks personalizados
│   └── useAuth.tsx           # Hook de autenticación
├── services/                 # Servicios de API
│   └── api.ts                # Cliente de Supabase
├── lib/                      # Configuraciones
│   └── supabase.ts           # Cliente de Supabase
├── AI_CONTEXT/               # Documentación del proyecto
├── TEST_MATERIA/             # Material de prueba
├── sql_scripts/              # Scripts SQL
├── backup_admin_system/      # Backup de archivos
├── package.json              # Dependencias
├── vite.config.ts            # Configuración de Vite
└── tsconfig.json             # Configuración de TypeScript
```

## 🧪 Testing

### **Material de Prueba**
El directorio `TEST_MATERIA/` contiene:
- Contenido de cursos de ejemplo
- Casos de prueba
- Scripts de ingesta
- Servidor de prueba

### **Ejecutar Pruebas**
```bash
cd TEST_MATERIA
npm install
npm start
```

## 📚 Documentación

### **AI_CONTEXT**
- `schema_actual.md` - Schema actual de la base de datos
- `project_status.md` - Estado del proyecto
- `flujos_criticos.md` - Flujos críticos del sistema
- `nomenclatura_standar.md` - Estándares de nomenclatura
- `migration_plan.md` - Plan de migración completado

## 👨‍🏫 Módulo Docente (estado y cómo probar)

### Estado actual
- Webhook del Tutor conectado al frontend (chat operativo)
- Contenidos de ejemplo y scripts de ingesta listos en `TEST_MATERIA/`
- Pendiente: CRUD de curso/unidades/sesiones/tareas sobre Supabase (sin backend Express)

### Estructura de prueba (`TEST_MATERIA/`)
- `contenido_curso/` – Markdown y PDF base
- `scripts_ingesta/` – `procesar_contenido.js` y `generar_embeddings.js`
- `datos_prueba/` – preguntas y respuestas esperadas
- `server/` – servidor Express de ejemplo para el tutor (opcional)

### Cómo cargar contenido de ejemplo (ingesta local → Supabase)
1. Procesar el contenido en chunks
   ```bash
   node TEST_MATERIA/scripts_ingesta/procesar_contenido.js
   ```
2. Generar embeddings con Gemini
   ```bash
   GEMINI_API_KEY=... node TEST_MATERIA/scripts_ingesta/generar_embeddings.js
   ```
3. Importar en Supabase
   - Usar el archivo generado en `TEST_MATERIA/scripts_ingesta/datos_supabase.json`
   - Insertar en la tabla `course_content_chunks` (o equivalente en tu esquema)

### Próximos pasos del Módulo Docente (plan)
- Tablas en Supabase: `courses`, `course_units`, `sessions`, `materials`, `assignments`, `assignment_submissions`
- RLS por rol: docente CRUD de sus cursos; estudiantes lectura/entrega; admin total
- Frontend Docente:
  - Mis cursos (listar/crear/editar)
  - Editor de curso (unidades, sesiones, materiales)
  - Tareas (creación, fechas, puntajes) y revisión de entregas

Si necesitas, puedo crear los SQL en `sql_scripts/` y las páginas/servicios base para empezar a operar.

### **Scripts SQL**
- `complete-reset.sql` - Reset completo de la base de datos
- `supabase-setup-simple.sql` - Configuración básica
- `fix-policies.sql` - Corrección de políticas RLS
- `create-user-trigger.sql` - Trigger de sincronización

## 🚀 Despliegue

### **Producción**
1. Configurar variables de entorno de producción
2. Ejecutar scripts SQL en Supabase
3. Construir la aplicación: `npm run build`
4. Desplegar en Vercel, Netlify o similar

### **Variables de Entorno de Producción**
```env
VITE_SUPABASE_URL=tu_supabase_url_produccion
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key_produccion
```

## 🤝 Contribución

### **Estándares de Código**
- Seguir la nomenclatura estándar definida en `AI_CONTEXT/nomenclatura_standar.md`
- Usar TypeScript para tipado estático
- Seguir las convenciones de React y Tailwind CSS

### **Proceso de Contribución**
1. Fork del repositorio
2. Crear rama de feature
3. Implementar cambios
4. Ejecutar pruebas
5. Crear Pull Request

## 📞 Soporte

### **Documentación**
- Revisar `AI_CONTEXT/` para documentación técnica
- Consultar `TEST_MATERIA/` para ejemplos
- Verificar `sql_scripts/` para configuración

### **Issues**
- Reportar bugs en GitHub Issues
- Incluir logs y pasos para reproducir
- Especificar versión y entorno

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🎉 Estado del Proyecto

**Versión:** 3.0 - Sistema Unificado Simplificado  
**Estado:** ✅ **FUNCIONAL Y OPERATIVO**  
**Última actualización:** 20 de octubre de 2025

---

**EduSpark** - Revolucionando la educación con inteligencia artificial 🚀