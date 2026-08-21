# Sistema de Pagos con Suspensión/Reactivación Automática

## 📋 Resumen

Sistema completo para gestionar pagos de mensualidades de estudiantes y vincular automáticamente con suspensión/reactivación de usuarios. Permite importar pagos desde archivos Excel o CSV y actualiza automáticamente el estado de los usuarios según su situación de pago.

## 🎯 Funcionalidades Principales

### 1. Importación de Pagos desde Excel/CSV
- ✅ Soporte para archivos Excel (.xlsx, .xls)
- ✅ Soporte para archivos CSV
- ✅ Detección automática de columnas (identity_document, paid, payment_date, amount)
- ✅ Múltiples formatos de valores aceptados para el campo `paid`

### 2. Procesamiento Automático de Pagos
- ✅ Si pagó → Usuario se activa/reactiva automáticamente
- ✅ Si no pagó → Usuario se suspende automáticamente
- ✅ Registro automático de pagos en la base de datos
- ✅ Actualización de fechas de próximo pago según ciclo de facturación

### 3. Gestión de Suscripciones
- ✅ Vinculación automática con suscripciones de estudiantes
- ✅ Actualización de estado de suscripción (active/suspended)
- ✅ Cálculo automático de próxima fecha de pago

## 📁 Archivos Implementados

### Backend (SQL)
- **`sql_scripts/154_create_payments_structure.sql`**
  - Tablas: `payment_plans`, `student_subscriptions`, `payments`
  - Funciones: `get_student_payment_status()`, `get_payment_status_by_identity_document()`
  - Triggers: Vinculación automática suspensión ↔ pagos

- **`sql_scripts/155_process_payments_and_update_status.sql`**
  - Función RPC: `process_payments_and_update_status()`
  - Procesa pagos desde Excel/CSV
  - Actualiza estados automáticamente
  - Registra pagos en la base de datos

### Frontend
- **`src/pages/BulkSuspendReactivatePage.tsx`**
  - Interfaz mejorada con soporte Excel
  - Modo de procesamiento: "Procesar Pagos" vs "Solo Suspender/Reactivar"
  - Visualización de información de pagos
  - Indicadores de estado de pago por usuario

- **`src/pages/StudentPaymentManagementPage.tsx`**
  - Dashboard de gestión de pagos
  - Resumen: total estudiantes, pagos vencidos, al día, suspendidos
  - Filtros por estado
  - Detalles de suscripción e historial de pagos

- **`src/services/paymentService.ts`**
  - Servicio completo para gestión de pagos
  - Funciones para consultar estado de pagos
  - Funciones para crear suscripciones y registrar pagos

- **`src/services/bulkSuspendReactivateService.ts`**
  - Función `parseExcelFile()` - Parsear archivos Excel
  - Función `processPaymentsFromExcel()` - Procesar pagos y actualizar estados
  - Mejoras en parseo de CSV con soporte para campo `paid`

## 🔄 Flujo de Trabajo

### 1. Importar Pagos desde Excel
```
Usuario sube archivo Excel con columnas:
- identity_document (requerido)
- paid (requerido): true/false, si/no, pagado/no pagado, 1/0
- payment_date (opcional): Fecha del pago
- amount (opcional): Monto pagado
```

### 2. Procesamiento Automático
```
Para cada usuario en el Excel:
  ├─ Si paid = true/si/pagado:
  │   ├─ Registrar pago en tabla payments
  │   ├─ Actualizar suscripción a 'active'
  │   ├─ Calcular próxima fecha de pago
  │   └─ Actualizar usuario.is_active = true
  │
  └─ Si paid = false/no/no pagado:
      ├─ Actualizar suscripción a 'suspended'
      └─ Actualizar usuario.is_active = false
```

### 3. Resultados
- Resumen de procesamiento (exitosos/fallidos)
- Detalle por usuario (qué se hizo)
- Indicación de si se registró pago

## 📊 Estructura de Datos

### Tabla `payment_plans`
```sql
- id (SERIAL)
- name (VARCHAR) - Ej: "Mensual", "Trimestral", "Anual"
- amount (DECIMAL) - Monto de la cuota
- billing_cycle (VARCHAR) - 'monthly', 'quarterly', 'yearly'
```

### Tabla `student_subscriptions`
```sql
- id (SERIAL)
- student_id (UUID) - FK a users
- payment_plan_id (INTEGER) - FK a payment_plans
- status (VARCHAR) - 'active', 'suspended', 'cancelled', 'expired'
- next_payment_date (DATE)
- suspension_reason (TEXT)
```

### Tabla `payments`
```sql
- id (SERIAL)
- subscription_id (INTEGER) - FK a student_subscriptions
- student_id (UUID) - FK a users
- amount (DECIMAL)
- status (VARCHAR) - 'pending', 'paid', 'failed', 'refunded'
- payment_date (DATE)
- due_date (DATE)
- paid_at (TIMESTAMP)
- transaction_id (VARCHAR) - Para integración futura con pasarelas
```

## 🔐 Seguridad

- ✅ RLS habilitado en todas las tablas
- ✅ Funciones con `SECURITY DEFINER` para operaciones administrativas
- ✅ Validación de permisos en funciones SQL
- ✅ Validación de datos en frontend antes de procesar

## 🚀 Uso

### Para Administradores

1. **Importar Pagos desde Excel:**
   - Ir a `/admin/bulk-suspend-reactivate`
   - Seleccionar modo "Procesar Pagos"
   - Subir archivo Excel con columnas: `identity_document`, `paid`
   - Revisar lista de usuarios
   - Procesar

2. **Ver Gestión de Pagos:**
   - Ir a `/admin/payment-management`
   - Ver resumen de pagos
   - Filtrar por estado
   - Ver detalles de cada estudiante

### Formato Excel Requerido

| identity_document | paid | payment_date | amount |
|-------------------|------|--------------|--------|
| 12345678          | true | 2025-01-15   | 50.00  |
| 87654321          | false|              |        |
| 11223344          | si   | 2025-01-20   | 50.00  |
| 44332211          | no   |              |        |

**Valores aceptados para `paid`:**
- `true`, `1`, `si`, `yes`, `pagado`, `paid`, `pago`, `sí` → Pagó
- `false`, `0`, `no`, `no pagado`, `unpaid`, `sin pago`, `pendiente`, `pending` → No pagó

## 🔗 Integración Futura

El sistema está preparado para integración con pasarelas de pago:
- Campo `transaction_id` para IDs de transacciones
- Estados compatibles con webhooks
- Campo `payment_method` para método de pago usado
- Timestamp `paid_at` para confirmación de pago

## 📝 Notas Técnicas

- La función `process_payments_and_update_status()` es transaccional
- Si falla un usuario, continúa con los demás
- Los pagos se registran solo si el usuario tiene suscripción activa
- La próxima fecha de pago se calcula automáticamente según el ciclo de facturación
- Los triggers automáticos vinculan suspensión manual con estado de pago

## ✅ Estado de Implementación

- ✅ Estructura de base de datos creada
- ✅ Funciones SQL implementadas
- ✅ Servicio de pagos completo
- ✅ Página de gestión de pagos
- ✅ Soporte Excel/CSV en suspender/reactivar
- ✅ Procesamiento automático de pagos
- ✅ Vinculación automática suspensión ↔ pagos
- ✅ Interfaz de usuario mejorada
- ⏳ Integración con pasarelas de pago (futuro)

