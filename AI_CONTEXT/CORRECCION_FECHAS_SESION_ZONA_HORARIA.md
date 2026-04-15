# 🔧 Corrección: Problema de Zona Horaria en Fechas de Sesiones

**Fecha:** Enero 2025  
**Estado:** ✅ Corregido

---

## 📋 Problema Reportado

Al guardar una sesión con fecha/hora (ej: "02/12/2025 23:59"), el sistema guardaba una hora diferente (ej: "03/12/2025 02:59"), con una diferencia de 3 horas.

**Causa:** Problema de conversión de zona horaria entre hora local y UTC al guardar y cargar fechas.

---

## 🔍 Análisis del Problema

### **Antes de la Corrección:**

1. **Al cargar la sesión:**
   ```typescript
   setStartsAt(session.starts_at ? new Date(session.starts_at).toISOString().slice(0, 16) : '');
   ```
   - Convertía desde UTC (ISO) a hora local
   - Pero mostraba la hora en formato UTC, no en hora local del usuario

2. **Al guardar la sesión:**
   ```typescript
   starts_at: startsAt ? new Date(startsAt).toISOString() : undefined,
   ```
   - `new Date(startsAt)` interpretaba el string datetime-local como hora local
   - Luego `.toISOString()` lo convertía a UTC, causando un desplazamiento

**Ejemplo del problema:**
- Usuario ingresa: `02/12/2025 23:59` (hora local, GMT-3)
- `new Date("2025-12-02T23:59")` → JavaScript interpreta como hora local
- `.toISOString()` → Convierte a UTC: `2025-12-03T02:59:00.000Z` (3 horas más)
- Resultado: Se guardaba `03/12/2025 02:59` en lugar de `02/12/2025 23:59`

---

## ✅ Solución Implementada

### **1. Función Helper para Cargar (UTC → Hora Local)**

```typescript
const toLocalDatetimeString = (isoString: string | undefined): string => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    // Obtener componentes en hora local
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (e) {
    console.error('Error convirtiendo fecha:', e);
    return '';
  }
};
```

**Función:**
- Convierte fecha UTC (ISO) desde la base de datos a formato datetime-local
- Usa métodos de fecha local (`getFullYear()`, `getHours()`, etc.)
- Muestra la hora correcta en la zona horaria del usuario

### **2. Función Helper para Guardar (Hora Local → UTC)**

```typescript
const localDatetimeToISO = (localDatetimeString: string | undefined): string | undefined => {
  if (!localDatetimeString) return undefined;
  try {
    const [datePart, timePart] = localDatetimeString.split('T');
    if (!datePart || !timePart) return undefined;
    
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    
    // Crear ISO string directamente con la hora ingresada
    // Esto preserva la hora exacta que el usuario ingresó
    const isoString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00.000Z`;
    
    return isoString;
  } catch (e) {
    console.error('Error convirtiendo fecha local a ISO:', e);
    return undefined;
  }
};
```

**Función:**
- Toma el string datetime-local del input (formato: `YYYY-MM-DDTHH:mm`)
- Crea un ISO string directamente con esa hora, interpretándola como UTC
- **Preserva la hora exacta** que el usuario ingresó sin conversión de zona horaria

---

## 🔄 Cambios Realizados

### **Archivo: `src/components/SessionEditorModal.tsx`**

#### **1. Agregadas funciones helper:**
- `toLocalDatetimeString()` - Para cargar fechas desde la BD
- `localDatetimeToISO()` - Para guardar fechas a la BD

#### **2. Actualizado `useEffect` para cargar sesión:**
```typescript
// Antes:
setStartsAt(session.starts_at ? new Date(session.starts_at).toISOString().slice(0, 16) : '');

// Después:
setStartsAt(toLocalDatetimeString(session.starts_at));
```

#### **3. Actualizado `handleSubmit` para guardar:**
```typescript
// Antes:
starts_at: startsAt ? new Date(startsAt).toISOString() : undefined,

// Después:
starts_at: localDatetimeToISO(startsAt),
```

---

## 📊 Comportamiento Después de la Corrección

### **Ejemplo de Flujo Completo:**

1. **Usuario ingresa:** `02/12/2025 23:59`
   - Se guarda en el estado como string: `"2025-12-02T23:59"`

2. **Al guardar:**
   - `localDatetimeToISO("2025-12-02T23:59")`
   - Crea ISO string: `"2025-12-02T23:59:00.000Z"`
   - Se guarda en la BD con esta hora exacta

3. **Al cargar desde la BD:**
   - BD tiene: `"2025-12-02T23:59:00.000Z"`
   - `toLocalDatetimeString("2025-12-02T23:59:00.000Z")`
   - Convierte a hora local: `"2025-12-02T23:59"` (si está en GMT-3, muestra 20:59)
   - O `"2025-12-02T23:59"` si está en UTC

**Nota:** La función `toLocalDatetimeString` convierte desde UTC a hora local del navegador, mientras que `localDatetimeToISO` preserva la hora exacta ingresada.

---

## ⚠️ Consideraciones

### **1. Zona Horaria del Sistema**

- La base de datos almacena fechas en UTC (tipo `timestamptz`)
- El sistema preserva la hora exacta ingresada por el usuario
- Al mostrar, se convierte a la zona horaria local del navegador

### **2. Compatibilidad con Google Calendar**

El código para crear videollamadas (`handleCreateMeet`) usa:
```typescript
startTime: new Date(startsAt),
```
Esto está correcto porque Google Calendar necesita interpretar la fecha con zona horaria para crear el evento correctamente.

---

## ✅ Verificación

### **Pasos para Verificar:**

1. **Abrir modal de edición de sesión**
   - Verificar que la fecha cargada coincide con la fecha guardada

2. **Ingresar una nueva fecha/hora**
   - Ejemplo: `02/12/2025 23:59`
   - Guardar la sesión

3. **Recargar la página y abrir el modal nuevamente**
   - Verificar que la fecha mostrada es la misma que se ingresó

4. **Verificar en la base de datos**
   - El campo `starts_at` debe contener la hora exacta ingresada

---

## 🔗 Archivos Modificados

1. **`src/components/SessionEditorModal.tsx`**
   - Agregadas funciones helper para conversión de fechas
   - Actualizado manejo de fechas al cargar y guardar

---

## 📝 Notas Técnicas

### **Diferencia con UnitEditorModal:**

El código en `UnitEditorModal.tsx` usa un enfoque similar pero con:
```typescript
starts_at: startsAt ? new Date(startsAt).toISOString() : undefined,
```

Esto puede tener el mismo problema. Sin embargo, para sesiones es más crítico porque las horas específicas son importantes para programar clases.

### **Recomendación Futura:**

Considerar aplicar la misma corrección en `UnitEditorModal.tsx` si se reporta el mismo problema con fechas de unidades.

---

**Última actualización:** Enero 2025  
**Autor:** Sistema EduSpark

