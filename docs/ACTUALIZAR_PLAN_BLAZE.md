# 🔥 Actualizar Plan Firebase a Blaze

## Pasos para Actualizar

1. **Abre este enlace:**
   👉 https://console.firebase.google.com/project/eduspark-py/usage/details

2. **Haz clic en "Upgrade" o "Modify plan"**

3. **Selecciona el plan "Blaze (pay-as-you-go)"**

4. **Confirma la actualización**

5. **Espera 1-2 minutos** para que se propague el cambio

## ⚠️ Nota Importante

- El plan Blaze tiene un **nivel gratuito generoso**:
  - 2 millones de invocaciones de Cloud Functions por mes
  - 5 GB de almacenamiento de Firestore
  - 1 GB de transferencia de datos por día
- Solo pagas por lo que uses **más allá** del nivel gratuito
- Puedes establecer **límites de facturación** para evitar sorpresas

## ✅ Verificar que está Actualizado

Después de actualizar, ejecuta:

```bash
firebase deploy --only functions
```

Si el plan está actualizado, el despliegue continuará automáticamente.

