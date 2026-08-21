#!/usr/bin/env pwsh
# Recrea el contenedor Edge Runtime para EduSpark LMS con:
# 1. Directorio de trabajo correcto (-w) para que resuelva entrypointPath
# 2. Timeouts extendidos (--request-wait-timeout=60000 --user-worker-request-idle-timeout=120000)
# 3. Mantenimiento de todos los volúmenes originales de Supabase CLI

$mainServicePath = "C:\Users\Legion 5\AppData\Local\Temp\supabase-functions-serve-main-c40V6N"
$functionsSrc = "/run/desktop/mnt/host/c/Users/Legion 5/Documents/ApplicandoLA/EduSpark LMS/eduspark/supabase/functions"
$functionsDst = "/Users/Legion 5/Documents/ApplicandoLA/EduSpark LMS/eduspark/supabase/functions"
$envFile = (Resolve-Path "$PSScriptRoot\edge_runtime.env").Path

docker rm -f supabase_edge_runtime_eduspark-lms-local 2>$null

docker run -d `
  --name supabase_edge_runtime_eduspark-lms-local `
  --network supabase_network_eduspark-lms-local `
  --label "com.docker.compose.project=eduspark-lms-local" `
  --label "com.supabase.cli.project=eduspark-lms-local" `
  --entrypoint "sh" `
  --env-file "$envFile" `
  -w "/Users/Legion 5/Documents/ApplicandoLA/EduSpark LMS/eduspark" `
  -v "${mainServicePath}/index.ts:/root/index.ts:ro" `
  -v "supabase_edge_runtime_eduspark-lms-local:/root/.cache/deno:rw" `
  -v "${functionsSrc}:${functionsDst}:ro" `
  "public.ecr.aws/supabase/edge-runtime:v1.74.2" `
  -c "edge-runtime start --main-service=/root --port=8081 --policy=per_worker --request-wait-timeout=60000 --user-worker-request-idle-timeout=120000"

Write-Host "Contenedor Edge Runtime recreado exitosamente con timeouts extendidos."
