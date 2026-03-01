# Perfil del Proyecto

> **Auto-generado / Mantenido manualmente**
> Describe el stack técnico y la arquitectura.

## Stack Tecnológico
- **Frontend:** React 18, Vite, TypeScript, TailwindCSS
- **Backend:** Supabase (PostgreSQL) + Firebase (Firestore/Auth)
- **Functions:** Google Cloud Functions / Edge Functions
- **Herramientas:** Lucide React, Tiptap, jsPDF
- **Infraestructural:** Google Cloud Run (Containerized)

## Mapa de Arquitectura
- `src/` - Código fuente de la aplicación.
  - `pages/Admin` - Gestión de Usuarios, Reportes, Configuración.
  - `pages/Student` - Cursos, Exámenes, Flashcards, Tutor Virtual.
  - `pages/Teacher` - Gestión de Cursos, Calificaciones, Materiales.
  - `components/` - Componentes reutilizables.
- `supabase/` - Configuraciones y Migraciones de Supabase.
- `AI_CONTEXT/` - Reglas y Contexto del Agente SCA-Compliant.
- `package.json` - Dependencias del proyecto.
