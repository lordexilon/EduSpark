# Corrección: Nombres de Roles en Importación Masiva

## 📋 Resumen

Se ha confirmado y corregido la documentación sobre los nombres correctos de roles para la importación masiva de usuarios.

## ✅ Nombres Correctos Confirmados

Los nombres de roles en la base de datos son (en minúsculas, con guión donde corresponde):

1. **`admin`** - Administrador global del sistema
2. **`admin-campus`** - Administrador de institución/campus
3. **`coordinator`** - Coordinador
4. **`teacher`** - Docente
5. **`student`** - Estudiante

## 🔄 Normalización Automática Implementada

El sistema ahora normaliza automáticamente nombres comunes a los nombres correctos:

| Nombre Común | Nombre Normalizado |
|--------------|-------------------|
| `administrador` | `admin` |
| `admin-campos` | `admin-campus` |
| `admincampus` | `admin-campus` |
| `coordinador` | `coordinator` |
| `docente` | `teacher` |
| `profesor` | `teacher` |
| `estudiante` | `student` |
| `alumno` | `student` |

## 📝 Cambios Realizados

### 1. Código (`src/services/bulkUserImportService.ts`)

- ✅ Agregada función `normalizeRoleName()` que mapea nombres comunes a nombres correctos
- ✅ Aplicada normalización en:
  - Creación individual de usuarios
  - Importación masiva (Edge Function y RPC)
  - Parseo de CSV y Excel
  - Validación de datos
- ✅ Actualizada validación para incluir `admin` como rol válido
- ✅ Actualizada interfaz TypeScript para incluir `admin` en los tipos

### 2. Interfaz (`src/pages/Admin/BulkUserImportPage.tsx`)

- ✅ Agregado `admin` como opción en el selector de roles
- ✅ Actualizada documentación de la plantilla Excel para indicar nombres alternativos aceptados

### 3. Documentación (`AI_CONTEXT/04_FEATURES/SISTEMA_IMPORTACION_MASIVA_USUARIOS.md`)

- ✅ Actualizado para incluir `admin` como rol válido
- ✅ Agregada nota sobre normalización automática de nombres

## 🎯 Resultado

Ahora los usuarios pueden importar usuarios usando:

- ✅ `"administrador"` o `"admin"` → se normaliza a `"admin"`
- ✅ `"admin-campos"` o `"admin-campus"` → se normaliza a `"admin-campus"`
- ✅ Otros nombres comunes también se normalizan automáticamente

El sistema normaliza automáticamente estos nombres antes de enviarlos a la base de datos, evitando el error "Rol no encontrado".

## 📚 Referencias

- **Código:** `src/services/bulkUserImportService.ts` - Función `normalizeRoleName()`
- **Interfaz:** `src/pages/Admin/BulkUserImportPage.tsx` - Selector de roles actualizado
- **Documentación:** `AI_CONTEXT/04_FEATURES/SISTEMA_IMPORTACION_MASIVA_USUARIOS.md` - Actualizada
- **Scripts SQL:** Todos los scripts SQL usan `'admin'` y `'admin-campus'` (confirmado)

## ⚠️ Importante

- Los nombres en la base de datos son **case-sensitive** en cuanto a la estructura (guiones, etc.)
- El sistema normaliza automáticamente, pero se recomienda usar los nombres correctos directamente
- Si se usa un nombre no reconocido, se intentará usar tal cual (puede causar error si no existe)

## 🔍 Verificación

Para verificar los roles disponibles en la base de datos:

```sql
SELECT id, name, description 
FROM public.roles 
ORDER BY name;
```

Los nombres esperados son exactamente:
- `admin`
- `admin-campus`
- `coordinator`
- `teacher`
- `student`

