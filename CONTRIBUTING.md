# Guía de Contribución a EduSpark 🤝

¡Gracias por tu interés en contribuir a EduSpark! Este proyecto busca revolucionar la educación mediante el uso de Inteligencia Artificial.

## 🛠️ Entorno de Desarrollo

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/lordexilon/EduSpark.git
   cd EduSpark
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   cd src/workers/file-processing-worker
   npm install
   cd ../../..
   ```

3. **Configurar el entorno:**
   Copia el archivo `.env.local` y asegúrate de tener las claves de Supabase y Gemini.

4. **Ejecutar en modo purista:**
   ```bash
   npm run dev:all
   ```

## 🌿 Flujo de Trabajo de Git

1. Crea una rama para tu feature: `git checkout -b feature/nombre-de-tu-mejora`.
2. Realiza tus cambios y asegúrate de seguir las reglas de SCA (Superficie de Contacto de Agentes).
3. Documenta tus cambios en `AI_CONTEXT/active_context.md`.
4. Envía un Pull Request a la rama `main`.

## 📐 Estándares de Código

- Usamos **TypeScript** para mayor seguridad.
- El estilo de CSS es **Vanilla CSS** con variables personalizadas (ver `src/index.css`).
- Los componentes deben ser funcionales y usar Hooks.
- **Importante:** Mantener la compatibilidad con el sistema multi-agente.

## 🚀 Despliegue

El despliegue es automático mediante **Google Cloud Build** cuando se hace un merge a `main`. Consulta la [Guía de Despliegue](./AI_CONTEXT/05_DEPLOYMENT/GCP_DEPLOYMENT_GUIDE.md) para más detalles.

---

¡Esperamos tus contribuciones!
