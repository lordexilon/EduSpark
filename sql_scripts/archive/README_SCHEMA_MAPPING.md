# 📋 Scripts para Mapear el Esquema de la Base de Datos

Este directorio contiene scripts SQL para extraer y documentar completamente el esquema de la base de datos.

## 🎯 Objetivo

Generar documentación actualizada del esquema de la base de datos para actualizar `AI_CONTEXT/schema_actual.md`.

## 📝 Scripts Disponibles

### 1. `74_map_schema_complete.sql` ⭐ **RECOMENDADO**

**Descripción:** Script principal que genera un mapeo completo en formato tabular.

**Uso:**
1. Abre Supabase Dashboard → SQL Editor
2. Copia y pega el contenido del script
3. Ejecuta el script
4. Copia los resultados y procesa para actualizar `schema_actual.md`

**Salida:** Resultados tabulares con columnas:
- `type`: Tipo de objeto (TABLE, COLUMN, FOREIGN_KEY, INDEX, RLS_POLICY, etc.)
- `name`: Nombre de la tabla/objeto
- `details`: Detalles del objeto
- `extra`: Información adicional

### 2. `72_generate_schema_documentation.sql`

**Descripción:** Genera documentación en formato legible usando `RAISE NOTICE`.

**Uso:** 
- Ejecutar en Supabase SQL Editor
- Los resultados aparecen en la consola de logs
- Útil para ver el formato directamente

### 3. `70_map_complete_database_schema.sql`

**Descripción:** Mapeo detallado con múltiples queries separadas.

**Uso:** Ejecutar cada sección por separado para obtener información específica.

## 🚀 Proceso Recomendado

### Paso 1: Ejecutar el Script SQL

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **SQL Editor**
4. Abre el archivo `sql_scripts/74_map_schema_complete.sql`
5. Copia todo el contenido
6. Pégalo en el SQL Editor
7. Ejecuta el script (Cmd/Ctrl + Enter)

### Paso 2: Exportar Resultados

Los resultados aparecerán en formato tabular. Puedes:

**Opción A: Exportar desde Supabase**
- Copia los resultados manualmente
- O usa la función de exportación si está disponible

**Opción B: Usar el script de procesamiento** (ver siguiente sección)

### Paso 3: Actualizar schema_actual.md

Una vez que tengas los resultados:
1. Abre `AI_CONTEXT/schema_actual.md`
2. Reemplaza la sección correspondiente con los nuevos datos
3. Mantén el formato Markdown existente

## 📊 Formato de Salida

El script `74_map_schema_complete.sql` genera resultados en este formato:

```
type        | name              | details                    | extra
------------|-------------------|---------------------------|------------------
TABLE       | users             |                           |
COLUMN      | users             | id UUID PRIMARY KEY       | Ordinal: 1
COLUMN      | users             | email VARCHAR(255) NOT NULL| Ordinal: 2
FOREIGN_KEY | users             | role_id REFERENCES roles(id)| Constraint: ...
INDEX       | users             | idx_users_email            | CREATE INDEX...
RLS_POLICY  | users             | Allow user registration - INSERT| USING: ...
```

## 🔍 Qué Información se Extrae

✅ **Tablas** - Todas las tablas en el esquema `public`  
✅ **Columnas** - Con tipos de datos, restricciones, defaults  
✅ **Primary Keys** - Identificadores únicos  
✅ **Foreign Keys** - Relaciones entre tablas  
✅ **Unique Constraints** - Restricciones de unicidad  
✅ **Check Constraints** - Validaciones de datos  
✅ **Índices** - Índices personalizados (excluye PK/FK automáticos)  
✅ **Políticas RLS** - Row Level Security policies  
✅ **Funciones** - Funciones almacenadas  
✅ **Triggers** - Triggers automáticos  
✅ **Resumen Estadístico** - Conteo de objetos

## 💡 Tips

- Los resultados están ordenados por tabla para facilitar el procesamiento
- Usa filtros en Supabase SQL Editor para ver solo un tipo específico (ej: solo FOREIGN_KEY)
- Puedes ejecutar queries individuales del script para obtener información específica
- Los tipos de datos están normalizados a formato SQL estándar

## 🔄 Actualización Automática (Futuro)

Se puede crear un script Node.js que:
1. Conecte a Supabase
2. Ejecute el script SQL
3. Procese los resultados
4. Genere el markdown actualizado automáticamente

**Script pendiente:** `scripts/generate-schema-docs.js` (requiere configuración adicional)

## 📚 Referencias

- [Supabase SQL Editor](https://supabase.com/docs/guides/database/overview)
- [PostgreSQL Information Schema](https://www.postgresql.org/docs/current/information-schema.html)
- [PostgreSQL System Catalogs](https://www.postgresql.org/docs/current/catalogs.html)

