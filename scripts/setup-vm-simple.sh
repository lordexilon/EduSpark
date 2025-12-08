#!/bin/bash
# Setup simplificado para RAG Worker VM
# No requiere GitHub

set -e

echo "🚀 Instalando dependencias del sistema..."

# Actualizar sistema
sudo apt-get update
sudo apt-get upgrade -y

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs

# Instalar herramientas adicionales
sudo apt-get install -y git build-essential

# Verificar instalación
echo "✅ Node.js version:"
node --version
echo "✅ NPM version:"
npm --version

echo "🔧 Configurando directorio de trabajo..."

# Crear directorio para el worker
sudo mkdir -p /opt/rag-worker/functions/rag-worker
sudo chown -R $USER:$USER /opt/rag-worker

echo "✅ Setup básico completado!"
echo ""
echo "📝 Próximos pasos:"
echo "1. Copiar archivos del worker desde tu máquina local"
echo "2. Instalar dependencias con: cd /opt/rag-worker/functions/rag-worker && npm install"
echo "3. Configurar variables de entorno en .env"
echo "4. Iniciar servicio"
