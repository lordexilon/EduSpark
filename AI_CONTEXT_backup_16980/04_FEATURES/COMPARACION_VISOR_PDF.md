# Comparación: Visor PDF Estándar vs. Visor Seguro

**Fecha:** 2025-12-06

---

## 🎨 Diseño Visual

### Referencia de Diseño

El visor seguro de PDF implementado se basa en el siguiente diseño de referencia:

**Características visuales del diseño:**
- ✅ Header con título del documento y botón de cerrar
- ✅ Barra de información amarilla indicando restricciones
- ✅ Mensaje claro: "Documento de solo lectura. La descarga e impresión están completamente deshabilitadas"
- ✅ Área de visualización del PDF en iframe
- ✅ Fondo con overlay oscuro semitransparente
- ✅ Contenedor modal centrado con sombras

---

## 📋 Diferencias Clave

### Visor PDF Estándar (Navegador)

**Permite:**
- ✅ Descargar el PDF (botón de descarga)
- ✅ Imprimir el PDF (botón de impresión o Ctrl+P)
- ✅ Guardar como... (clic derecho)
- ✅ Abrir en nueva pestaña
- ✅ Copiar URL y compartir

**Problemas:**
- ❌ No hay control sobre el archivo una vez descargado
- ❌ Puede ser redistribuido sin autorización
- ❌ No hay registro de quién accedió al contenido

### Visor Seguro Implementado

**Restricciones:**
- 🔒 **NO permite descargar** (Ctrl+S bloqueado)
- 🔒 **NO permite imprimir** (Ctrl+P y beforeprint bloqueados)
- 🔒 **NO permite clic derecho** (menú contextual deshabilitado)
- 🔒 **URL temporal** (signed URL que expira en 1 hora)
- 🔒 **Blob URL local** (no se puede compartir el link)

**Beneficios:**
- ✅ Control de acceso temporal
- ✅ Protección de propiedad intelectual
- ✅ (Opcional) Registro de accesos para auditoría
- ✅ Experiencia de usuario clara sobre las restricciones

---

## 🔍 Comparación Visual

```
┌─────────────────────────────────────────────────────────────────────┐
│                    VISOR PDF ESTÁNDAR                               │
├─────────────────────────────────────────────────────────────────────┤
│  [⬇️ Descargar]  [🖨️ Imprimir]  [🔗 Abrir]  [✕ Cerrar]            │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                                                             │    │
│  │                    [Contenido del PDF]                      │    │
│  │                                                             │    │
│  │  • El usuario PUEDE descargar                              │    │
│  │  • El usuario PUEDE imprimir                               │    │
│  │  • El usuario PUEDE compartir la URL                       │    │
│  │                                                             │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘

                                VS

┌─────────────────────────────────────────────────────────────────────┐
│                    VISOR SEGURO IMPLEMENTADO                        │
├─────────────────────────────────────────────────────────────────────┤
│  [📄] Nombre del Documento                              [✕ Cerrar] │
├─────────────────────────────────────────────────────────────────────┤
│  [👁️] Documento de solo lectura. La descarga e impresión están    │
│       completamente deshabilitadas.                                 │
├─────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                                                             │    │
│  │                    [Contenido del PDF]                      │    │
│  │                                                             │    │
│  │  • Ctrl+P / Cmd+P → BLOQUEADO ❌                           │    │
│  │  • Ctrl+S / Cmd+S → BLOQUEADO ❌                           │    │
│  │  • Clic derecho → BLOQUEADO ❌                             │    │
│  │  • URL temporal → Expira en 1 hora ⏱️                       │    │
│  │  • Acceso registrado → Audit log 📊                        │    │
│  │                                                             │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Matriz de Características

| Característica | Visor Estándar | Visor Seguro | Notas |
|----------------|----------------|--------------|-------|
| **Visualización** | ✅ | ✅ | Ambos permiten leer el contenido |
| **Descargar (botón)** | ✅ | ❌ | Visor seguro no tiene botón de descarga |
| **Descargar (Ctrl+S)** | ✅ | ❌ | Bloqueado con event listener |
| **Imprimir (botón)** | ✅ | ❌ | Visor seguro no tiene botón de impresión |
| **Imprimir (Ctrl+P)** | ✅ | ❌ | Bloqueado con event listener |
| **Clic derecho** | ✅ | ❌ | Menú contextual deshabilitado |
| **Compartir URL** | ✅ | ⚠️ | URL expira en 1 hora |
| **Abrir en nueva pestaña** | ✅ | ❌ | No disponible |
| **Zoom / Navegación** | ✅ | ✅ | Controles nativos del navegador |
| **Búsqueda de texto** | ✅ | ✅ | Funcionalidad nativa del PDF |
| **Copiar texto** | ✅ | ⚠️ | Difícil pero posible con DevTools |
| **Capturas de pantalla** | ✅ | ⚠️ | No se puede bloquear completamente |
| **Registro de acceso** | ❌ | ✅ | Opcional, con audit log |
| **Responsive** | ⚠️ | ✅ | Optimizado para móviles |
| **Indicador de estado** | ❌ | ✅ | Barra de carga y mensajes de error |

**Leyenda:**
- ✅ = Funcionalidad completa
- ❌ = Bloqueado / No disponible
- ⚠️ = Parcialmente disponible / Con limitaciones

---

## 🎯 Casos de Uso Recomendados

### Usar Visor Seguro Para:

1. **Materiales educativos propietarios**
   - Apuntes de clase
   - Presentaciones de profesores
   - Guías de estudio

2. **Libros digitales con licencia limitada**
   - Libros de texto adquiridos por la institución
   - Contenido con derechos de autor

3. **Documentos institucionales sensibles**
   - Manuales internos
   - Políticas y procedimientos
   - Reglamentos

4. **Evaluaciones y exámenes**
   - Bancos de preguntas
   - Ejemplos de exámenes anteriores
   - Rúbricas de evaluación

### Usar Visor Estándar Para:

1. **Materiales de dominio público**
2. **Recursos compartibles**
3. **Documentos que los estudiantes necesitan entregar impresos**
4. **Formularios que requieren descarga**

---

## 🔒 Niveles de Seguridad

### Nivel 1: Sin Restricciones
```typescript
// Link directo de descarga
<a href={pdfUrl} download>
  Descargar PDF
</a>
```
**Cuándo usar:** Archivos públicos, sin valor protegido

### Nivel 2: Visualización Estándar
```typescript
// Iframe simple
<iframe src={pdfUrl} />
```
**Cuándo usar:** Materiales compartibles pero organizados en la plataforma

### Nivel 3: Visor Seguro (Implementado)
```typescript
<SecurePDFViewer
  pdfUrl={pdfUrl}
  title={title}
  isOpen={isOpen}
  onClose={onClose}
/>
```
**Cuándo usar:** Contenido propietario, materiales con derechos de autor

### Nivel 4: Visor Seguro + Audit Log
```typescript
// Antes de abrir el visor
await logPDFAccess(materialId, filePath);

<SecurePDFViewer ... />
```
**Cuándo usar:** Documentos sensibles que requieren trazabilidad

### Nivel 5: Marca de Agua + Visor Seguro (Futuro)
```typescript
<SecurePDFViewer 
  watermark={{
    text: `${user.name} - ${new Date().toLocaleString()}`,
    opacity: 0.3
  }}
  ...
/>
```
**Cuándo usar:** Máxima protección, disuadir capturas de pantalla

---

## 💡 Recomendaciones de Implementación

### Para Estudiantes (role: 'student')
```typescript
const { user } = useAuth();

if (user.role === 'student' && material.allow_download === false) {
  // Usar visor seguro
  return <SecurePDFViewer ... />;
}
```

### Para Profesores (role: 'teacher')
```typescript
if (user.role === 'teacher' || user.role === 'admin') {
  // Permitir descarga
  return <a href={material.url} download>Descargar</a>;
}
```

### Para Materiales Premium
```typescript
if (material.metadata?.premium === true || material.metadata?.protected === true) {
  // Usar visor seguro
  return <SecurePDFViewer ... />;
}
```

---

## 🚨 Limitaciones a Considerar

### Limitación 1: Capturas de Pantalla
**Problema:** Los usuarios pueden tomar screenshots del contenido visible.

**Mitigación:**
- Implementar marca de agua con nombre del usuario
- Agregar disclaimer en la barra de información
- Registrar accesos para auditoría

### Limitación 2: DevTools del Navegador
**Problema:** Usuarios técnicos pueden acceder al PDF desde la pestaña Network.

**Mitigación:**
- Usar URLs firmadas con expiración corta (1 hora)
- Convertir a Blob URL (dificulta el acceso)
- No es posible bloquear completamente

### Limitación 3: Copiar Texto
**Problema:** Aunque difícil, es posible copiar texto seleccionándolo.

**Mitigación:**
- CSS `user-select: none` (parcialmente efectivo)
- Convertir páginas a imágenes (alto costo de rendimiento)
- Aceptar la limitación para documentos de texto

### Limitación 4: Compatibilidad de Navegadores
**Problema:** Safari puede tener comportamiento diferente en el bloqueo de impresión.

**Mitigación:**
- Probar en múltiples navegadores
- Agregar mensajes específicos para Safari
- Documentar limitaciones conocidas

---

## ✅ Checklist de Decisión

**¿Debería usar el visor seguro para este material?**

- [ ] El contenido tiene derechos de autor
- [ ] Quiero evitar redistribución no autorizada
- [ ] Necesito registro de quién accede al contenido
- [ ] El documento contiene información sensible o propietaria
- [ ] Los estudiantes solo necesitan leer, no imprimir
- [ ] La institución/profesor solicita protección del contenido

**Si marcaste 3 o más:** ✅ Usar visor seguro  
**Si marcaste 0-2:** ⚠️ Evaluar caso por caso

---

## 📝 Conclusión

El **visor seguro de PDF** proporciona un **balance entre accesibilidad y protección** de contenido:

### ✅ Ventajas
- Protección básica contra descarga e impresión
- Experiencia de usuario clara y profesional
- Fácil integración en la plataforma
- Control de acceso temporal con URLs firmadas

### ⚠️ Limitaciones
- No es una solución DRM completa
- Usuarios avanzados pueden encontrar workarounds
- Capturas de pantalla no se pueden bloquear

### 🎯 Recomendación Final
Usar el visor seguro para **contenido educativo de valor moderado a alto**, combinado con:
- Políticas claras de uso aceptable
- Educación a usuarios sobre derechos de autor
- Audit logs para trazabilidad (opcional)
- Marcas de agua para disuadir screenshot (futuro)

**Para contenido de máxima sensibilidad**, considerar soluciones DRM profesionales adicionales.
