# 📋 Próxima Sesión: Mejorar UI de Materials

**Fecha de documentación:** 2025-11-30  
**Estado actual:** RAG Worker operativo, UI funcional pero con demasiados botones

---

## 🎯 **OBJETIVO PRINCIPAL**

Simplificar la interfaz de `/teacher/materials` consolidando 8-10 botones por fila en un diseño limpio con menú dropdown.

---

## 📊 **ESTADO ACTUAL**

### ✅ **Lo que FUNCIONA:**
1. ✅ Cloud Function RAG Worker desplegada y operativa
   - URL: `https://rag-worker-mcc5aevj6a-uc.a.run.app`
   - Procesamiento on-demand (sin polling)
   - Ahorro: ~$120/año vs scheduler
   
2. ✅ Botón "Cancelar" para jobs atascados
   - Aparece cuando `rag_status = 'processing'`
   - Función `cancelProcessingJob()` en `teacherCourses.ts`
   
3. ✅ Procesamiento RAG funcionando
   - Archivos pequeños procesados exitosamente
   - Genera chunks y embeddings correctamente

### ❌ **Lo que FALTA:**

**PROBLEMA:** Demasiados botones en la columna "Acciones"
- Ver (2-3 botones)
- Asignar (2 botones)
- Tutor (1 botón)
- Curso (1 botón)
- Migrar (1 botón - condicional)
- Procesar RAG (1 botón - condicional)
- Compartir (1 botón - condicional)
- Eliminar (1 botón)

**Total:** 8-10 botones por fila = Clutter visual

---

## 🎨 **DISEÑO PROPUESTO**

### **ANTES:**
```
[Ver] [Asignar] [U.Curso] [Tutor] [Curso] [Migrar] [Procesar RAG] [Compartir] [Eliminar]
```

### **DESPUÉS:**
```
[Ver] [Asignar] [⋮ Menú]
```

**Menú dropdown contendrá:**
- 🧠 Abrir Tutor IA
- 📖 Ver en Curso
- 🤖 Procesar para RAG (si no está procesado)
- ⬆️ Migrar a Bucket (si es Drive y no migrado)
- 📤 Compartir con Estudiantes (si es Drive)
- ─────────────
- 🗑️ Eliminar Material

---

## 💻 **IMPLEMENTACIÓN TÉCNICA**

### **1. Agregar imports necesarios:**

```typescript
// En MaterialsManagementPage.tsx, línea ~10
import { 
  // ... existing imports
  MoreVertical  // <-- AÑADIR ESTO
} from 'lucide-react';
```

### **2. Agregar estado para controlar menú:**

```typescript
// Cerca de línea 100, con los otros useState
const [openMenuId, setOpenMenuId] = useState<string | null>(null);
```

### **3. Agregar listener para cerrar menú al hacer click fuera:**

```typescript
// Después de los otros useEffect
useEffect(() => {
  const handleClickOutside = () => setOpenMenuId(null);
  document.addEventListener('click', handleClickOutside);
  return () => document.removeEventListener('click', handleClickOutside);
}, []);
```

### **4. Reemplazar la columna de Acciones (líneas ~1497-1636):**

**Ubicación exacta:** Buscar `<td className="py-3 px-4">` que contiene todos los botones de acciones.

**Reemplazar con:**
```tsx
<td className="py-3 px-4">
  <div className="flex items-center gap-2">
    {/* Botón Ver (siempre visible) */}
    <button
      onClick={() => handleViewMaterial(material)}
      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      title="Ver detalles"
    >
      <Eye className="w-4 h-4 mr-1.5" />
      Ver
    </button>

    {/* Botón Asignar (si tiene curso) */}
    {material.course_id && (
      <button
        onClick={() => handleOpenAssignmentModal(material, 'course')}
        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        title="Asignar"
      >
        <PlusCircle className="w-4 h-4 mr-1.5" />
        Asignar
      </button>
    )}

    {/* Menú Dropdown */}
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpenMenuId(openMenuId === material.id ? null : material.id);
        }}
        className="inline-flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        title="Más acciones"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {openMenuId === material.id && (
        <div className="absolute right-0 z-10 mt-2 w-56 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
          <div className="py-1">
            {/* Tutor IA */}
            {material.course_id && (
              <button
                onClick={() => {
                  const tutorUrl = `/teacher/tutor?courseId=${material.course_id}${material.unit_id ? `&moduleId=${material.unit_id}` : ''}${material.session_id ? `&highlightId=${material.session_id}&highlightType=session` : ''}${material.id ? `&highlightMaterialId=${material.id}` : ''}`;
                  window.open(tutorUrl, '_blank');
                  setOpenMenuId(null);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Brain className="w-4 h-4 mr-3 text-green-600" />
                Abrir Tutor IA
              </button>
            )}

            {/* Ver en Curso */}
            {material.course_id && (
              <a
                href={`/teacher/tutor?courseId=${material.course_id}${material.unit_id ? `&moduleId=${material.unit_id}` : ''}${material.session_id ? `&highlightId=${material.session_id}&highlightType=session` : ''}${material.id ? `&highlightMaterialId=${material.id}` : ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setOpenMenuId(null)}
              >
                <BookOpen className="w-4 h-4 mr-3 text-purple-600" />
                Ver en Curso
              </a>
            )}

            {(() => {
              const sourceInfo = getMaterialSource(material);
              const isGoogleDrive = sourceInfo.source === 'google_drive';
              const isBucket = sourceInfo.source === 'bucket';
              const isProcessed = material.metadata?.processed === true;

              return (
                <>
                  {/* Procesar RAG */}
                  {!isProcessed && material.course_id && (isGoogleDrive || isBucket) && (
                    <button
                      onClick={() => {
                        handleProcessForRAG(material);
                        setOpenMenuId(null);
                      }}
                      disabled={processingMaterial === material.id}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                    >
                      {processingMaterial === material.id ? (
                        <RefreshCw className="w-4 h-4 mr-3 text-indigo-600 animate-spin" />
                      ) : (
                        <Brain className="w-4 h-4 mr-3 text-indigo-600" />
                      )}
                      Procesar para RAG
                    </button>
                  )}

                  {/* Migrar a Bucket */}
                  {isGoogleDrive && material.metadata?.sourceFileId && material.course_id && !isBucket && (
                    <button
                      onClick={() => {
                        handleMigrateDriveToBucket(material);
                        setOpenMenuId(null);
                      }}
                      disabled={migratingMaterial === material.id}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                    >
                      {migratingMaterial === material.id ? (
                        <RefreshCw className="w-4 h-4 mr-3 text-purple-600 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-3 text-purple-600" />
                      )}
                      Migrar a Bucket
                    </button>
                  )}

                  {/* Compartir con Estudiantes */}
                  {isGoogleDrive && material.metadata?.sourceFileId && material.course_id && (
                    <button
                      onClick={() => {
                        handleShareWithStudents(material);
                        setOpenMenuId(null);
                      }}
                      disabled={sharingMaterial === material.id}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                    >
                      {sharingMaterial === material.id ? (
                        <RefreshCw className="w-4 h-4 mr-3 text-green-600 animate-spin" />
                      ) : (
                        <Share2 className="w-4 h-4 mr-3 text-green-600" />
                      )}
                      Compartir con Estudiantes
                    </button>
                  )}
                </>
              );
            })()}

            {/* Divider */}
            <div className="border-t border-gray-100 my-1"></div>

            {/* Eliminar */}
            <button
              onClick={() => {
                handleDeleteMaterial(material.id);
                setOpenMenuId(null);
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-3" />
              Eliminar Material
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
</td>
```

---

## ✅ **CHECKLIST DE IMPLEMENTACIÓN**

- [ ] Añadir import `MoreVertical`
- [ ] Añadir estado `openMenuId`
- [ ] Añadir useEffect para click outside
- [ ] Reemplazar columna de Acciones
- [ ] Probar funcionamiento
- [ ] Verificar que todos los botones sigan funcionando
- [ ] Probar en diferentes estados de material (Drive, Bucket, Processing, etc.)

---

## 🎯 **RESULTADO ESPERADO**

### **Mejoras:**
1. ✅ UI más limpia (3 elementos vs 10)
2. ✅ Menos scroll horizontal
3. ✅ Acceso a todas las funciones mantenido
4. ✅ Mejor UX en móvil/tablet
5. ✅ Menos confusión visual

### **Sin perder:**
- ❌ Ninguna funcionalidad
- ❌ Ningún botón importante
- ❌ Accesibilidad

---

## 📝 **NOTAS ADICIONALES**

1. **FileProcessingPage obsoleta:** Usa Firestore (viejo). Usar `/teacher/materials` para gestión actual.
2. **Token expirado:** Si aparece error 401 en Drive, ir a `/profile` → Desconectar → Reconectar Google Drive.
3. **Jobs atascados:** Usar botón "Cancelar" en columna Estado RAG cuando `status = 'processing'`.

---

## 🚀 **ESTADO DEL RAG WORKER**

- **URL:** https://rag-worker-mcc5aevj6a-uc.a.run.app
- **Estado:** ✅ Operativo
- **Última actualización:** 2025-11-30 01:00 ART
- **Archivos procesados exitosamente:** 6 PDFs pequeños
- **Documentación:** `docs/RAG_WORKER_ON_DEMAND.md`
