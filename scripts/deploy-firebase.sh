#!/bin/bash
# Script para desplegar Firebase (Firestore + Cloud Functions)

echo "🔥 Iniciando despliegue de Firebase..."

# Verificar que Firebase CLI está instalado
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI no está instalado. Instálalo con: npm install -g firebase-tools"
    exit 1
fi

# Verificar autenticación
echo "🔐 Verificando autenticación..."
firebase projects:list > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "⚠️  No estás autenticado. Ejecutando firebase login..."
    firebase login
fi

# Desplegar reglas de Firestore
echo "📜 Desplegando reglas de Firestore..."
firebase deploy --only firestore:rules

# Desplegar índices de Firestore
echo "📊 Desplegando índices de Firestore..."
firebase deploy --only firestore:indexes

# Instalar dependencias de las funciones
echo "📦 Instalando dependencias de Cloud Functions..."
cd functions/analyzeFile
npm install
npm run build
cd ../createFileProcessingJob
npm install
npm run build
cd ../..

# Desplegar Cloud Functions
echo "🚀 Desplegando Cloud Functions..."
firebase deploy --only functions

echo "✅ Despliegue completado!"
echo ""
echo "📝 No olvides:"
echo "   1. Copiar las URLs de las funciones a tu .env"
echo "   2. Verificar que Firestore esté habilitado en Firebase Console"
echo "   3. Habilitar las APIs necesarias en Google Cloud Console"

