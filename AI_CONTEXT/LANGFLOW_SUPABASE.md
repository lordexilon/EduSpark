# LangFlow sobre Supabase local

LangFlow es parte del **AISpark Core**. Su interfaz y sus flujos se ejecutan en el contenedor `langflow`, pero su metadata se persiste en una base lógica separada llamada `langflow` dentro del mismo PostgreSQL local de Supabase.

## Arranque inicial

1. Iniciar Supabase local:

```powershell
supabase start
```

2. Crear la base lógica de LangFlow una sola vez:

```powershell
.\scripts\init_langflow_db.ps1
```

3. Levantar LangFlow:

```powershell
```

LangFlow queda disponible en `http://localhost:7860`.

## Conexión

Desde Docker se usa:

```text
postgresql://postgres:postgres@supabase_db_eduspark-lms-local:5432/langflow
```

El puerto `54332` solo se usa desde el host. Entre contenedores se usa el puerto interno `5432` y la red `supabase_network_eduspark-lms-local`.

## Arquitectura

- `langflow`: motor visual y runtime del AISpark Core.
- `langflow` database: usuarios, proyectos, flujos y configuración de LangFlow.
- `postgres` database: datos propios de EduSpark y servicios que ya la utilizan.
- BusinessSpark y futuras especializaciones deben consumir el Core por API o componentes compartidos; no deben crear otra base de datos por especialización.

Si se ejecuta `supabase stop --no-backup` o se eliminan los volúmenes, hay que volver a ejecutar `init_langflow_db.ps1` antes de arrancar LangFlow.
