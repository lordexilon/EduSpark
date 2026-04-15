-- Verificar cómo está definida la función de búsqueda vectorial

SELECT 
    proname as nombre_funcion,
    pg_get_function_arguments(oid) as argumentos,
    pg_get_functiondef(oid) as definicion
FROM pg_proc
WHERE proname = 'search_course_content_chunks'
LIMIT 1;
