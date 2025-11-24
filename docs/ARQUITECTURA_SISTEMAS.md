# Arquitectura de Sistemas - EduSpark

## Separación de Responsabilidades

### Sistema A2A (Tutor Virtual) - LOCAL
**Ubicación**: Frontend (navegador)
**Tecnología**: React + TypeScript
**Base de Datos**: Supabase (PostgreSQL con pgvector)
**No usa Firebase**

**Componentes**:
- `AgentCoordinator` - Coordina agentes localmente
- `RAGAgent` - Genera respuestas con Gemini
- `ContextAgent` - Obtiene contexto desde Supabase
- `VoiceAgent` - Maneja audio (opcional)

**Flujo**:
1. Usuario pregunta → Frontend
2. AgentCoordinator coordina → Agentes locales
3. ContextAgent busca → Supabase (course_content_chunks)
4. RAGAgent genera → Gemini API
5. Respuesta → Frontend

**No requiere Firebase** ✅

---

### Sistema de Procesamiento de Archivos - FIREBASE
**Ubicación**: Cloud Functions + Cloud Run
**Tecnología**: Firebase/Firestore + Google Cloud
**Base de Datos**: 
- Firestore (cola de trabajos)
- Supabase (embeddings finales)

**Componentes**:
- Cloud Functions (`analyzeFile`, `createFileProcessingJob`)
- Cloud Run Worker (procesa archivos)
- Firestore (cola de trabajos: `file_processing_jobs`)

**Flujo**:
1. Admin analiza archivo → Cloud Function
2. Admin crea trabajo → Cloud Function → Firestore
3. Worker procesa → Firestore → Supabase
4. Frontend muestra progreso → Firestore (listeners)

**Usa Firebase/Firestore** ✅

---

## Variables de Entorno

### Para A2A (Tutor Virtual)
```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_GEMINI_API_KEY=...
```
**No necesita Firebase** ✅

### Para Procesamiento de Archivos
```env
# Firebase (solo para cola de trabajos)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...
# ... otras variables de Firebase

# Cloud Functions URLs
VITE_ANALYZE_FILE_URL=...
VITE_CREATE_JOB_URL=...
```

---

## Conclusión

- **A2A funciona sin Firebase** - Es completamente local
- **Firebase solo se usa para la cola de trabajos** - Procesamiento de archivos
- **No hay conflicto** - Son sistemas independientes
- **Puedes usar A2A sin configurar Firebase** - Solo necesitas Supabase y Gemini

Si quieres usar Firebase para otras funcionalidades del A2A (ej: persistir conversaciones), es opcional y se puede agregar después.

