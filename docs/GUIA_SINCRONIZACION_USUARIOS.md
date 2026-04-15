# 📘 Guía de Sincronización de Usuarios (LMS EduSpark)

> **Importante:** Esta guía es para Administradores de Sistema y Administradores de Campus. Explica cómo asegurar que todos los usuarios tengan acceso real a la plataforma (Auth) y no solo un registro de perfil (Public).

---

## 🏗️ 1. Entendiendo el Sistema de Usuarios

En EduSpark, un usuario tiene "dos mitades":
1.  **Perfil Público (`public.users`):** Contiene los datos académicos, institución, carrera y cursos. Es lo que ves en las listas de la plataforma.
2.  **Cuenta de Acceso (`auth.users`):** Es la llave que permite al usuario iniciar sesión con su email y contraseña.

**El Problema Común:** A veces creamos el "Perfil" pero olvidamos crear la "Llave". Esto genera **Usuarios Huérfanos**.

---

## 🚀 2. Creación Masiva (Excel / CSV)

Para crear usuarios correctamente (Perfil + Llave al mismo tiempo):

1.  Ve a **Administración > Importación Masiva**.
2.  Prepara tu archivo Excel siguiendo la plantilla (puedes descargarla en la misma página).
3.  **Roles autorizados:** Admin, Admin-Campus y Coordinador.
4.  Al procesar la lista, el sistema llamará a una **Edge Function** que:
    *   Crea la cuenta en Supabase Auth automáticamente.
    *   Crea el perfil en la base de datos de la escuela.
    *   Asigna la Institución y Carrera de forma inmediata.

---

## 🛠️ 3. Reparación de Usuarios Huérfanos

Si ya tienes usuarios que aparecen en las listas pero NO pueden entrar, sigue estos pasos:

1.  Inicia sesión como **Administrador** o **Admin-Campus**.
2.  Accede a la herramienta **"Migración de Usuarios Huérfanos"** (ruta: `/admin/migrate-orphan-users`).
3.  La herramienta buscará automáticamente a todos los usuarios que no tienen cuenta de acceso.
4.  Haz clic en **"Sincronizar"**.
    *   El sistema usará el **Documento de Identidad** (DNI/Cédula) del usuario como su contraseña inicial por defecto.
    *   Se creará la cuenta en Auth y el usuario ya podrá loguearse.

---

## ⚠️ 4. Solución de Problemas (Troubleshooting)

### "Error 403: No tienes permisos"
*   **Causa:** Intentaste importar usuarios pero tu rol no está autorizado o la función de seguridad está bloqueada.
*   **Solución:** Contacta al administrador central para asegurar que la Edge Function `createBulkUsers` permita el rol `admin-campus` (Esto ya fue actualizado en la última versión del código).

### "Usuario ya existe en Auth"
*   **Causa:** El email ya está registrado en Supabase, posiblemente de otra institución o una prueba previa.
*   **Solución:** El sistema intentará **Vincular** la cuenta existente con el nuevo perfil académico en lugar de crear una nueva.

---

## 📝 5. Resumen para el Administrador de Campus
| Acción | Herramienta | Resultado |
| :--- | :--- | :--- |
| **Nuevo Semestre/Año** | Importación Masiva | Todos los alumnos creados con acceso. |
| **Error de Login masivo** | Migración de Huérfanos | Repara accesos que fallaron en la importación. |
| **Cambio de Contraseña** | Gestión de Usuarios | Resetea la "Llave" del alumno. |

---
*EduSpark SCA-Compliant v1.2 - 2026*
