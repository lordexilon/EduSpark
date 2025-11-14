# 📍 Cómo Encontrar el Botón para Agregar Videos

## ✅ Ubicación Exacta

### Paso 1: Navegar al Editor de Unidad

1. Ve a **Mis Cursos** (`/teacher/courses`)
2. Selecciona un curso
3. Haz clic en **"Unidades"** o **"Módulos"**
4. Haz clic en **"Editar unidad"** en la unidad que quieras

### Paso 2: Buscar la Sección de Videos

Una vez en el **Editor de Unidad**, verás:

1. **Sección "Datos de la unidad"** (arriba)
2. **Línea divisoria (hr)**
3. **🎥 Sección destacada en color naranja/rojo** ← **AQUÍ ESTÁ**
   - Título: "🎥 Agregar Video"
   - Descripción: "Agrega videos de YouTube o Vimeo con transcripción automática para el RAG"
   - Botón grande: **"📺 Añadir Video de YouTube"**
   - Botón: **"🎬 Agregar Video Manualmente"**

4. **Sección "Agregar material"** (abajo, formulario general)

---

## 🎯 Dos Formas de Agregar Videos

### Opción 1: Botón Rápido (Recomendado) ⭐

**Ubicación:** Sección destacada en color naranja/rojo

1. Haz clic en **"📺 Añadir Video de YouTube"**
2. Se abrirá un prompt
3. Pega la URL del video
4. ¡Listo! Se extraerá la transcripción automáticamente

### Opción 2: Formulario Manual

**Ubicación:** Sección "Agregar material" (más abajo)

1. Selecciona tipo: **"Video"** en el dropdown
2. Pega la URL en el campo "URL"
3. Haz clic en **"Agregar"**

---

## 📸 Aspecto Visual

La sección destacada se ve así:

```
┌─────────────────────────────────────────────────┐
│ 🎥 Agregar Video                                │
│ Agrega videos de YouTube o Vimeo con           │
│ transcripción automática para el RAG           │
│                                                 │
│ [📺 Añadir Video de YouTube] [🎬 Agregar...]  │
└─────────────────────────────────────────────────┘
```

**Color de fondo:** Gradiente naranja/rojo claro
**Bordes:** Rojos destacados
**Muy visible:** Sí, está diseñado para ser lo primero que veas

---

## 🔍 Si No Lo Ves

### Verificaciones:

1. **¿Estás en la página correcta?**
   - Debe ser: `/teacher/courses/{courseId}/units/{unitId}`
   - O: `/teacher/courses/{courseId}/modules/{moduleId}`

2. **¿Hiciste scroll hacia abajo?**
   - La sección está después de "Datos de la unidad"
   - Está antes de "Agregar material"

3. **¿Recargaste la página?**
   - Presiona F5 o Ctrl+R
   - Asegúrate de tener la versión más reciente del código

4. **¿Tienes permisos de docente?**
   - Solo los docentes pueden agregar materiales
   - Verifica que estés logueado como docente

---

## 🚀 Ruta Completa (Paso a Paso)

```
1. Dashboard → Mis Cursos
2. Selecciona un curso
3. Clic en "Unidades" o "Módulos"
4. Clic en "Editar unidad" (en cualquier unidad)
5. Scroll hacia abajo un poco
6. Verás la sección naranja/roja destacada
7. Clic en "📺 Añadir Video de YouTube"
```

---

## 💡 Consejo

**La sección destacada está diseñada para ser MUY visible:**
- Fondo de color (naranja/rojo)
- Bordes destacados
- Iconos grandes
- Texto descriptivo

Si aún no la ves, puede ser un problema de caché del navegador. Intenta:
- Ctrl+Shift+R (recarga forzada)
- Limpiar caché del navegador
- Abrir en modo incógnito

---

## 📞 Si Sigue Sin Aparecer

1. Abre la consola del navegador (F12)
2. Busca errores en rojo
3. Verifica que el archivo `ModuleEditorPage.tsx` tenga los cambios recientes
4. Verifica la ruta en la barra de direcciones

---

**¡La sección debería ser MUY visible ahora! 🎉**

