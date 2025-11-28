# EduSpark - Desarrollo Local

## 🚀 Inicio Rápido

### Ejecutar Todo (Frontend + Worker RAG)

```bash
npm run dev:all
```

Esto levanta:
- ✅ **Frontend** (Vite) → `http://localhost:5173`
- ✅ **Worker RAG** (Express) → `http://localhost:3001`

Los logs aparecen con colores:
- 🔵 `[frontend]` - Vite development server
- 🟣 `[worker]` - RAG indexing worker

### Comandos Disponibles

```bash
# Desarrollo completo (recomendado)
npm run dev:all           # Frontend + Worker

# Solo frontend
npm run dev               # Solo Vite

# Solo worker
npm run dev:worker        # Solo worker RAG

# Limpiar caché y reiniciar
npm run dev:clean         # Limpia caché + dev

# Build producción
npm run build             # Build frontend
```

## 📋 Requisitos Previos

1. **Node.js** v18+ instalado
2. **Variables de entorno** configuradas en `.env`:

```env
# Gemini API (para RAG embeddings)
GEMINI_API_KEY=tu_api_key_aqui
VITE_GEMINI_API_KEY=tu_api_key_aqui

# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
VITE_SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# Firebase (opcional, para algunos features)
VITE_FIREBASE_API_KEY=tu_firebase_key
# ... otros configs de Firebase
```

## 🔧 Instalación Inicial

```bash
# 1. Instalar dependencias del proyecto principal
npm install

# 2. Instalar dependencias del worker
cd src/workers/file-processing-worker
npm install
cd ../../..

# 3. Ejecutar todo
npm run dev:all
```

## 📖 Documentación Completa

- **RAG para Sesiones:** [`AI_CONTEXT/04_FEATURES/RAG_INDEXACION_SESIONES.md`](./AI_CONTEXT/04_FEATURES/RAG_INDEXACION_SESIONES.md)
- **Gestión de Materiales:** [`AI_CONTEXT/03_GUIAS/MANUAL_GESTION_MATERIALES_RAG.md`](./AI_CONTEXT/03_GUIAS/MANUAL_GESTION_MATERIALES_RAG.md)
- **Más documentación:** [`AI_CONTEXT/`](./AI_CONTEXT/)

## ✅ Verificar que Todo Funciona

### 1. Frontend
Abre `http://localhost:5173` - Deberías ver la landing page de EduSpark

### 2. Worker API
```bash
curl http://localhost:3001/health
# Respuesta esperada: {"status":"ok"}
```

### 3. Indexación RAG
1. Inicia sesión como profesor
2. Ve a un curso → Editar sesión
3. Guarda la sesión
4. En consola del worker deberías ver:
```
[worker] [TextContent] Texto procesado: XXX caracteres
[worker] [TextContent] Embeddings generados: X
[worker] [TextContent] X chunks guardados en Supabase
```

## 🐛 Solución de Problemas

### El worker no inicia
```bash
# Verificar que las dependencias estén instaladas
cd src/workers/file-processing-worker
npm install
```

### Error de GEMINI_API_KEY
- Verifica que `.env` tenga `GEMINI_API_KEY` o `VITE_GEMINI_API_KEY`
- Reinicia ambos servidores después de cambiar `.env`

### Puerto 3001 o 5173 ocupado
```bash
# Matar procesos en Windows
npx kill-port 3001
npx kill-port 5173

# Luego reiniciar
npm run dev:all
```

## 📁 Estructura del Proyecto

```
eduspark/
├── src/
│   ├── pages/              # Páginas React
│   ├── services/           # Servicios (API, RAG, etc)
│   ├── workers/
│   │   └── file-processing-worker/  # Worker RAG
│   │       ├── index.ts             # Express server
│   │       ├── worker.ts            # Lógica de procesamiento
│   │       └── geminiService.ts     # Embeddings
│   └── ...
├── AI_CONTEXT/            # Documentación técnica
├── scripts/               # Scripts de utilidad
└── package.json
```

## 🌿 Branches Importantes

- `main` - Producción estable
- `feature/rag-session-indexing` - **RAG para sesiones** (este branch)

## 💡 Tips

- Usa `npm run dev:all` para desarrollo normal
- Los logs del worker te muestran si las sesiones se indexan correctamente
- Si cambias código del worker, este se recarga automáticamente
- Si cambias `.env`, necesitas reiniciar ambos procesos

---

**¿Necesitas ayuda?** Revisa la documentación en [`AI_CONTEXT/`](./AI_CONTEXT/)