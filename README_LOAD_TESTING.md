# Guía de Pruebas de Carga - EduSpark

Este directorio contiene scripts de **k6** para realizar pruebas de estrés en la infraestructura de EduSpark (React + Supabase + Google Cloud).

## 1. Instalación de k6

Si no tienes k6 instalado en tu sistema Windows, puedes hacerlo mediante:

- **Chocolatey**: `choco install k6`
- **Winget**: `winget install k6`
- **Manual**: Descarga el instalador desde [k6.io](https://k6.io/docs/get-started/installation/).

## 2. Configuración

Antes de correr las pruebas, edita el archivo `tests/k6/config.js` con las credenciales correctas:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `TEST_USER` (Debe ser un usuario real creado en Supabase Auth para las pruebas).

## 3. Ejecución de los Escenarios

Ejecuta los comandos desde la raíz del proyecto:

### Fase 1: Carga Ligera (500 Usuarios)
Evalúa el comportamiento del caché semántico.
```bash
k6 run tests/k6/scenarios/smoke_test.js
```

### Fase 2: Carga Media (1,000 Usuarios)
Observa el límite de conexiones de la base de datos (Supavisor).
*Nota: Se recomienda configurar los VUs en el script o vía comando:*
```bash
k6 run --vus 1000 --duration 5m tests/k6/scenarios/smoke_test.js
```

### Fase 3: Estrés Real (10,000 Usuarios)
ADVERTENCIA: Esto generará un tráfico masivo, costos asociados y dura 45 minutos.
```bash
k6 run tests/k6/scenarios/stress_test_10k.js
```

## 4. Métricas a Monitorear
- **Dashboard de Supabase**: Uso de CPU y Conexiones activas.
- **Google Cloud Console**: Cuotas de Vertex AI (Gemini) y latencia de Cloud Functions.
- **k6 Output**: `http_req_duration`, `http_req_failed`, y `iterations`.
