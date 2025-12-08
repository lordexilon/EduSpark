#!/bin/bash
# Setup script para RAG Worker VM
# Ejecutar como: sudo bash setup-vm.sh

set -e

echo "🚀 Instalando dependencias del sistema..."

# Actualizar sistema
apt-get update
apt-get upgrade -y

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Instalar herramientas adicionales
apt-get install -y git build-essential

# Verificar instalación
echo "✅ Node.js version:"
node --version
echo "✅ NPM version:"
npm --version

echo "🔧 Configurando directorio de trabajo..."

# Crear directorio para el worker
mkdir -p /opt/rag-worker
cd /opt/rag-worker

echo "📦 Clonando repositorio..."

# Clonar el código del worker
# Nota: Ajustar URL del repositorio según corresponda
git clone https://github.com/TU_USUARIO/eduspark.git .

echo "📦 Instalando dependencias del worker..."

# Ir al directorio del worker
cd functions/rag-worker

# Instalar dependencias
npm install

echo "🔐 Configurando variables de entorno..."

# Crear archivo .env
cat > .env << 'EOF'
SUPABASE_URL=https://mckfscukxcqwntpjagar.supabase.co
SUPABASE_SERVICE_KEY=YOUR_SERVICE_KEY_HERE
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
NODE_ENV=production
EOF

echo "⚠️  IMPORTANTE: Edita /opt/rag-worker/functions/rag-worker/.env con tus claves reales"

echo "🔧 Configurando servicio systemd..."

# Crear servicio systemd
cat > /etc/systemd/system/rag-worker.service << 'EOF'
[Unit]
Description=RAG Worker Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/rag-worker/functions/rag-worker
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=rag-worker
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

echo "✅ Setup completado!"
echo ""
echo "📝 Próximos pasos:"
echo "1. Edita /opt/rag-worker/functions/rag-worker/.env con tus claves"
echo "2. Ejecuta: systemctl enable rag-worker"
echo "3. Ejecuta: systemctl start rag-worker"
echo "4. Verifica logs: journalctl -u rag-worker -f"
