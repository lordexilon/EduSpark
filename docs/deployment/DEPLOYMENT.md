# 🐳 Guía de Deployment con Docker

## Preparación

### 1. Configurar Variables de Entorno

```bash
# Copiar plantilla
cp .env.docker.example .env

# Editar con tus valores reales
nano .env  # o con tu editor favorito
```

Asegúrate de completar:
- ✅ `GEMINI_API_KEY` - Para embeddings del RAG
- ✅ `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` - Para base de datos
- ✅ Otras variables según necesites

## Deployment en Servidor

### Opción 1: Docker Compose (Recomendado)

```bash
# 1. Construir imágenes
docker-compose build

# 2. Iniciar servicios
docker-compose up -d

# 3. Verificar que estén corriendo
docker-compose ps

# 4. Ver logs
docker-compose logs -f
```

Esto levanta:
- **Frontend** (Nginx) en puerto 80
- **Worker** (Express) en puerto 3001

### Opción 2: Docker Directo

```bash
# Build frontend
docker build --target frontend -t eduspark-frontend .

# Build worker
docker build --target worker -t eduspark-worker .

# Run frontend
docker run -d -p 80:80 --name eduspark-frontend eduspark-frontend

# Run worker (con variables de entorno)
docker run -d -p 3001:3001 \
  --env-file .env \
  --name eduspark-worker \
  eduspark-worker
```

## Desarrollo Local (Sin Docker)

### ✅ Comando Simplificado (Recomendado)

```bash
npm run dev:all
```

Si tienes el error de `concurrently`, usa:

```bash
# Opción A: Dos terminales separadas
# Terminal 1
npm run dev

# Terminal 2
npm run dev:worker
```

```bash
# Opción B: PowerShell
Start-Process npm -ArgumentList "run dev"
Start-Process npm -ArgumentList "run dev:worker"
```

## Verificación

### Verificar Frontend
```bash
curl http://localhost
# o abre http://localhost en navegador
```

### Verificar Worker
```bash
curl http://localhost:3001/health
# Respuesta esperada: {"status":"ok"}
```

### Ver logs en Docker
```bash
# Todos los servicios
docker-compose logs -f

# Solo frontend
docker-compose logs -f frontend

# Solo worker
docker-compose logs -f worker
```

## Comandos Útiles

### Detener servicios
```bash
docker-compose down
```

### Reconstruir después de cambios
```bash
docker-compose up -d --build
```

### Reiniciar un servicio específico
```bash
docker-compose restart worker
docker-compose restart frontend
```

### Ver uso de recursos
```bash
docker stats
```

## Troubleshooting

### Error: "spawn cmd.exe ENOENT" en Windows

**Solución:** Usa las opciones alternativas arriba o asegúrate de tener `cmd.exe` en tu PATH.

### Worker no se conecta a Supabase

Verifica que las variables de entorno estén correctas:
```bash
docker-compose exec worker env | grep SUPABASE
```

### Frontend no carga

Verifica los logs:
```bash
docker-compose logs frontend
```

### Puerto ocupado

```bash
# Cambiar puertos en docker-compose.yml
ports:
  - "8080:80"  # En lugar de "80:80"
```

## Arquitectura de Deployment

```
┌─────────────────┐      ┌──────────────────┐
│   Nginx (80)    │      │  Worker (3001)   │
│   Frontend SPA  │──────│  RAG Indexing    │
└─────────────────┘      └──────────────────┘
        │                         │
        └────────┬────────────────┘
                 │
         ┌───────▼────────┐
         │   Supabase     │
         │   (Cloud)      │
         └────────────────┘
```

## Producción

Para producción, considera:

1. **Usar HTTPS** (Let's Encrypt con certbot)
2. **Variables de entorno** desde secretos del servidor
3. **Backups** automáticos de Supabase
4. **Monitoreo** (Prometheus + Grafana)
5. **Load balancer** si necesitas escalar

## Actualización en Producción

```bash
# 1. Pull últimos cambios
git pull origin main

# 2. Rebuild containers
docker-compose up -d --build

# 3. Verificar que todo funcione
docker-compose ps
docker-compose logs -f
```

## Rollback

Si algo sale mal:

```bash
# Volver a la imagen anterior
docker-compose down
git checkout [commit-anterior]
docker-compose up -d --build
```

---

**¿Necesitas ayuda?** Revisa los logs con `docker-compose logs -f`
