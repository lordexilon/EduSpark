-- 97_enable_realtime_messaging.sql
-- Habilitar Realtime para las tablas de mensajería

-- Habilitar Realtime para la tabla de conversaciones
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- Habilitar Realtime para la tabla de mensajes
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Verificar que las tablas estén en la publicación
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename IN ('conversations', 'messages');

-- Nota: Si las tablas ya están en la publicación, el comando ALTER PUBLICATION
-- puede dar un error, pero eso está bien. Solo necesitas ejecutar esto una vez.

