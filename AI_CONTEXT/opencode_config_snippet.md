# ⚡ OpenCode — Configuración "Piloto Automático"

> Generado: 2026-07-13 | Basado en `ollama list` local

## Modelo Recomendado: `qwen3.5:4b`

**¿Por qué este modelo?**
- **3.4 GB** — el más liviano con buena calidad de código del stack local.
- Comparte el mismo hash que `qwen-pro:latest` y `deepseek-v4-flash:latest` → ya lo tienes cargado en VRAM.
- **~40–60 tokens/seg** esperados en RTX con cuantización Q4.

**Alternativa:** `qwen3:1.7b` (1.4 GB) si necesitas velocidad máxima y la tarea es trivial (completar imports, renombrar variables).

---

## Configuración en VS Code (`settings.json`)

Abre la paleta de comandos con `Ctrl+Shift+P` → "Open User Settings (JSON)" y agrega:

```json
{
  "opencode.model": "qwen3.5:4b",
  "opencode.baseUrl": "http://localhost:11434/v1",
  "opencode.apiKey": "ollama",
  "opencode.stream": true,
  "opencode.maxTokens": 2048
}
```

> **Nota:** Si los ajustes de OpenCode aparecen en la UI gráfica (`Ctrl+,` → buscar "OpenCode"),
> localiza los campos equivalentes y pega los valores uno a uno.

---

## División de Trabajo (Arquitectura Dual-Mode)

| Herramienta | Modelo | Tarea |
|---|---|---|
| **LibreChat → ⚙️ Antigravity Architect** | `exilon-qwopus:latest` (4.3 GB) | Arquitectura, auditoría, debugging profundo, diseño de APIs |
| **OpenCode en VS Code** | `qwen3.5:4b` (3.4 GB) | Autocompletado, generación de boilerplate, refactoring rápido |

---

## Modelos disponibles para cambiar en cualquier momento

| Nombre en Ollama | Tamaño | Velocidad | Uso ideal |
|---|---|---|---|
| `qwen3:1.7b` | 1.4 GB | 🚀🚀🚀 Máxima | Boilerplate, completar líneas |
| `qwen3.5:4b` | 3.4 GB | 🚀🚀 Alta | **Piloto Automático (recomendado)** |
| `deepseek-v4-flash:latest` | 3.4 GB | 🚀🚀 Alta | Código especializado |
| `exilon-qwopus:latest` | 4.3 GB | 🚀 Media | Razonamiento + código (Antigravity) |
| `gemma4:latest` | 9.6 GB | ⚙️ Moderada | Tareas complejas con contexto largo |
