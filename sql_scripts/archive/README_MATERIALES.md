# Notas sobre la creación de materiales

## Problema actual
La creación de materiales desde el frontend se cuelga, pero funciona perfectamente desde SQL.

## Solución temporal
Para agregar materiales mientras se resuelve el problema del frontend, usa el SQL Editor de Supabase:

```sql
INSERT INTO public.course_materials (course_id, module_id, title, type, content, file_url)
VALUES (9, 5, 'Tu Título', 'text', 'Tu contenido', 'URL opcional');
```

## Estado
- ✅ Guardado de título y descripción del módulo: FUNCIONANDO
- ❌ Creación de materiales desde frontend: COLGADO (usar SQL temporalmente)

