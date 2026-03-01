# Notas de Despliegue - Sistema de Hashtags

## Cambios Implementados

### Archivos Modificados
1. `src/pages/Student/CourseViewPage.tsx` - Visualización y filtrado de hashtags para estudiantes
2. `src/pages/Teacher/MaterialsManagementPage.tsx` - Edición de hashtags para docentes/admins
3. `AI_CONTEXT/HASHTAGS_MATERIALES.md` - Documentación completa

### Funcionalidades
- Sistema completo de hashtags para materiales del curso
- Edición inline de hashtags para docentes/admins
- Visualización y filtrado interactivo para estudiantes
- Almacenamiento en `material.metadata.hashtags` como array

## Pasos para Subir a GitHub

```bash
# 1. Verificar estado
git status

# 2. Agregar archivos modificados
git add src/pages/Student/CourseViewPage.tsx
git add src/pages/Teacher/MaterialsManagementPage.tsx
git add AI_CONTEXT/HASHTAGS_MATERIALES.md

# 3. Hacer commit
git commit -m "feat: Implementar sistema de hashtags para materiales del curso

- Agregar funcionalidad de edición de hashtags para docentes/admins
- Agregar visualización y filtrado de hashtags para estudiantes
- Los hashtags se almacenan en material.metadata.hashtags como array
- Documentación completa en AI_CONTEXT/HASHTAGS_MATERIALES.md"

# 4. Subir a GitHub
git push origin main
# o
git push origin master
```

## Pasos para Desplegar a Google Cloud

### Frontend (Cloud Run)

1. **Verificar configuración de Cloud Build:**
   - Revisar `cloudbuild.yaml`
   - Verificar que las variables de entorno estén configuradas

2. **Desplegar:**
   ```bash
   gcloud builds submit --config cloudbuild.yaml
   ```

   O si está configurado con trigger automático:
   ```bash
   git push origin main
   ```

3. **Verificar despliegue:**
   - Revisar logs en Cloud Console
   - Verificar que la aplicación esté funcionando

### Variables de Entorno Necesarias
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GEMINI_API_KEY`
- Otras variables según configuración

## Verificación Post-Despliegue

1. **Para Docentes/Admins:**
   - Ir a `/teacher/materials`
   - Verificar que la columna "Hashtags" esté visible
   - Probar agregar/editar hashtags

2. **Para Estudiantes:**
   - Ir a `/courses/:courseId`
   - Expandir sección "Materiales del Curso"
   - Verificar que los hashtags aparezcan como tags clickeables
   - Probar filtrado por hashtag

## Rollback (si es necesario)

```bash
# Revertir al commit anterior
git revert HEAD
git push origin main

# O desplegar versión anterior desde Cloud Run
gcloud run services update eduspark-frontend --image gcr.io/PROJECT_ID/eduspark-frontend:COMMIT_HASH
```

