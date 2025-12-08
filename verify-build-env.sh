#!/bin/bash
# Script para verificar que las variables de entorno se están leyendo correctamente durante el build

echo "=== Verificando variables de entorno en el build ==="
echo ""

# Verificar si existe .env
if [ -f ".env" ]; then
    echo "✅ Archivo .env existe"
    echo ""
    echo "Contenido de .env (solo variables VITE_*):"
    grep "^VITE_" .env | sed 's/=.*/=***/' || echo "No se encontraron variables VITE_*"
else
    echo "❌ Archivo .env NO existe"
fi

echo ""
echo "=== Verificando .gcloudignore ==="
if [ -f ".gcloudignore" ]; then
    if grep -q "^\.env$" .gcloudignore; then
        echo "⚠️  .env está excluido en .gcloudignore"
    elif grep -q "^!\.env$" .gcloudignore; then
        echo "✅ .env está explícitamente incluido en .gcloudignore"
    else
        echo "ℹ️  .env no está mencionado en .gcloudignore (se incluirá por defecto)"
    fi
else
    echo "ℹ️  No existe .gcloudignore"
fi

echo ""
echo "=== Verificando Dockerfile-cloudrun ==="
if [ -f "Dockerfile-cloudrun" ]; then
    if grep -q "COPY \.env" Dockerfile-cloudrun; then
        echo "✅ Dockerfile-cloudrun copia .env"
        echo ""
        echo "Líneas relevantes:"
        grep -n "COPY.*\.env" Dockerfile-cloudrun
    else
        echo "❌ Dockerfile-cloudrun NO copia .env"
    fi
else
    echo "❌ Dockerfile-cloudrun NO existe"
fi

