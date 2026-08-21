# Arquitectura Dual-Mode: EduSpark LMS + Plataforma General

**Fecha:** 2026-07-10
**Versión:** 1.0
**Administrador:** albertovillalba@gmail.com

---

## Resumen Ejecutivo

Este repositorio opera en **Modo DUAL**: sirve simultáneamente como
plataforma de educación (EduSpark LMS) y como plataforma personal de
desarrollo de proyectos de software. Solo el administrador puede
cambiar el modo activo.

---

## Modos de Plataforma

| Modo | Descripción | Features Activas |
|------|-------------|-----------------|
| `EDUCATION` | LMS puro para estudiantes y docentes | tutor, rag, analytics, compliance, lti |
| `GENERAL` | Plataforma de desarrollo de proyectos | office_docs, filesystem, memory, sequential_thinking, code_assist |
| `DUAL` | Ambas funcionalidades activas (**actual**) | Todas las anteriores |

### ¿Cómo cambiar el modo? (Solo Admin)

**Opción 1 — Variable de entorno** (inmediato, requiere restart Docker):
```bash
# En .env:
PLATFORM_MODE=EDUCATION   # Solo LMS
PLATFORM_MODE=GENERAL     # Solo Desarrollo
PLATFORM_MODE=DUAL        # Ambos (default)
```

**Opción 2 — Tabla Supabase** (sin restart, para producción):
```sql
-- Ejecutar en Supabase SQL Editor (solo con tu sesión de admin):
UPDATE public.platform_config
SET value = 'EDUCATION', updated_by = auth.uid()
WHERE key = 'PLATFORM_MODE';
```

---

## Presets de LibreChat por Modo

### 🎓 Modo EDUCATION
| Preset | Modelo | Propósito |
|--------|--------|-----------|
| Tutor EduSpark | eduspark-tutor-v1 | Tutorías con RAG sobre materiales del curso |
| Analista Educativo | gemma4:26b | KPIs, deserción, rendimiento |
| Auditor ANEAES | gemma4:26b | Compliance y acreditación paraguaya |

### 🛠️ Modo GENERAL
| Preset | Modelo | Propósito |
|--------|--------|-----------|
| Dev Assistant (SCA) | qwen-vision:32k | Desarrollo con framework SCA + MCP tools |
| Analista de Documentos | qwen-vision:32k | OCR, análisis de imágenes y docs |
| Arquitecto de Proyectos | gemma4:26b | Diseño de sistemas y APIs |
| Asistente de Documentación | qwen-vision:32k | Generación de docs Word/Excel/PDF |

---

## Separabilidad Futura de Repositorio

### Mapa de pertenencia de archivos

```
eduspark/  (repo actual — EDUSPARK_LMS)
│
├── EXCLUSIVO EduSpark (NO mover al repo general)
│   ├── src/modules/tutor/           ← Motor de tutorías A2A
│   ├── src/modules/analytics/       ← Analíticas educativas
│   ├── src/modules/compliance/      ← ANEAES / normativas
│   ├── functions/eduspark-gateway/  ← Edge Function Gateway
│   ├── supabase/migrations/         ← Schema LMS (cursos, alumnos)
│   └── sql_scripts/                 ← Scripts LMS específicos
│
├── COMPARTIDO (puede copiarse o git-subtree al repo general)
│   ├── librechat.yaml               ← Se bifurca: uno por repo
│   ├── librechat-compose.yml        ← Se bifurca
│   ├── docker-compose.yml           ← Se bifurca
│   └── .env                         ← Nunca se comparte (secretos)
│
└── CANDIDATO A REPO SEPARADO (extraer con git subtree)
    ├── scripts/office-mcp/          ← MCP Office Tools (genérico)
    ├── scripts/modelfiles/          ← Modelfiles Ollama (genérico)
    ├── .agent/                      ← Skills SCA (genérico)
    └── AI_CONTEXT/                  ← Contexto SCA (bifurcar)
```

### Cómo hacer el split cuando estés listo

**Paso 1 — Extraer carpeta como nueva rama:**
```bash
# Desde la raíz del repo:
git subtree split --prefix=scripts/office-mcp -b feature/office-mcp-standalone
```

**Paso 2 — Crear el nuevo repositorio:**
```bash
mkdir ../devplatform
cd ../devplatform
git init
git pull ../eduspark feature/office-mcp-standalone
```

**Paso 3 — Agregar como submódulo opcional (para mantener sync):**
```bash
# De vuelta en eduspark/:
git submodule add https://github.com/lordexilon/devplatform scripts/office-mcp
```

**Paso 4 — Cambiar REPO_PROFILE en .env del nuevo repo:**
```bash
REPO_PROFILE=GENERAL_DEVPLATFORM
```

---

## Control de Acceso

| Acción | Quién puede | Mecanismo |
|--------|-------------|-----------|
| Cambiar `PLATFORM_MODE` | Solo admin | `.env` en Docker host |
| Ver/editar `platform_config` | Solo admin | RLS Supabase por email |
| Usar presets de Educación | Usuarios con rol `student`/`teacher` | LibreChat login |
| Usar presets de Desarrollo | Solo admin | LibreChat login |
| Agregar nuevos modelos Ollama | Solo admin | Acceso al host Windows |

---

## Estado Actual

- **Modo activo:** `DUAL`
- **Repo profile:** `EDUSPARK_LMS`
- **Split estimado:** Cuando el uso general justifique un CI/CD propio
- **SQL pendiente de ejecutar:** `sql_scripts/6_platform/201_platform_config_admin_only.sql`

> **Nota post-instalación:** Actualizar el email del admin en la tabla:
> ```sql
> UPDATE public.platform_config
> SET value = 'albertovillalba@gmail.com'
> WHERE key = 'ADMIN_USER_EMAIL';
> ```
