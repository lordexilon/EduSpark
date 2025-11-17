# Verificación de Configuración .env para A2A

## ✅ Configuración Requerida

Tu archivo `.env` debe tener las siguientes variables configuradas:

### Variables Obligatorias:

```env
# Configuración de Supabase
VITE_SUPABASE_URL=https://mckfscukxcqwntpjagar.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ⚠️ IMPORTANTE: El sistema A2A es LOCAL, NO requiere API externa
# El sistema multi-agente funciona completamente en el frontend
# NO necesitas configurar VITE_A2A_COORDINATOR_URL
```

### Variables Opcionales:

```env
# Configuración de Google Gemini (opcional)
GEMINI_API_KEY=tu_api_key_de_gemini_aqui

# Configuración de Google OAuth (opcional)
VITE_GOOGLE_CLIENT_ID=tu_google_client_id_aqui
VITE_GOOGLE_CLIENT_SECRET=tu_google_client_secret_aqui

# Backend de administración (opcional)
VITE_ADMIN_API_URL=http://localhost:3001/api
```

## ⚠️ Variables DEPRECADAS (Eliminar o Comentar):

```env
# ❌ DEPRECADO - Ya no se usa n8n
# VITE_N8N_WEBHOOK_URL=https://applicandola.auto.hostybee.com/webhook/tutor-chat

# ❌ NO NECESARIO - El sistema A2A es local, no requiere API externa
# VITE_A2A_COORDINATOR_URL=...
```

## 🔍 Pasos para Verificar tu .env

1. **Abre tu archivo `.env`**
2. **Verifica que tengas `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` configurados**
3. **Verifica que tengas `VITE_GEMINI_API_KEY` configurado** (para el tutor IA)
4. **Elimina o comenta `VITE_N8N_WEBHOOK_URL` si existe** (ya no se usa)
5. **NO necesitas `VITE_A2A_COORDINATOR_URL`** - El sistema es local
6. **Guarda el archivo**
7. **Reinicia el servidor de desarrollo** (`npm run dev`)

## 📝 Ejemplo de .env Completo

```env
# ============================================
# CONFIGURACIÓN DE SUPABASE
# ============================================
VITE_SUPABASE_URL=https://mckfscukxcqwntpjagar.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ja2ZzY3VreGNxd250cGphZ2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NDU0MzQsImV4cCI6MjA3NjMyMTQzNH0.4j8Pf2_xZRitw-MkrNKC0MqrzTHRYtnQmrSquTO5zu8

# ============================================
# COORDINADOR A2A (NO REQUERIDO - Sistema Local)
# ============================================
# El sistema A2A funciona completamente en el frontend
# NO necesitas configurar VITE_A2A_COORDINATOR_URL

# ============================================
# CONFIGURACIÓN DE GOOGLE GEMINI (OPCIONAL)
# ============================================
GEMINI_API_KEY=tu_api_key_de_gemini_aqui

# ============================================
# CONFIGURACIÓN DE GOOGLE OAUTH (OPCIONAL)
# ============================================
VITE_GOOGLE_CLIENT_ID=tu_google_client_id_aqui
VITE_GOOGLE_CLIENT_SECRET=tu_google_client_secret_aqui

# ============================================
# BACKEND DE ADMINISTRACIÓN (OPCIONAL)
# ============================================
VITE_ADMIN_API_URL=http://localhost:3001/api
```

## ✅ Sistema A2A Local

El sistema A2A funciona completamente en el frontend usando:
- **AgentCoordinator** (local) - Coordina los agentes
- **ContextAgent** - Obtiene contexto desde Supabase (pgvector)
- **RAGAgent** - Construye prompts y llama a Gemini API
- **VoiceAgent** - Maneja audio y voz (opcional)

**NO se requiere configuración adicional** - El sistema funciona automáticamente con:
- `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (para RAG)
- `VITE_GEMINI_API_KEY` (para generar respuestas)

## 📞 ¿Necesitas Ayuda?

Si necesitas ayuda para configurar el coordinador A2A o tienes dudas sobre la URL correcta, consulta la documentación del coordinador A2A o contacta al equipo de desarrollo.

