/**
 * Servidor Express.js para el Tutor Virtual Inteligente
 * Compatible con Vite + Express.js stack
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

// Importar rutas
const tutorRoutes = require('./routes/tutor');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware de seguridad
app.use(helmet());

// Middleware de CORS
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
}));

// Middleware de logging
app.use(morgan('combined'));

// Middleware de compresión
app.use(compression());

// Middleware para parsear JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rutas del Tutor Virtual
app.use('/api/tutor', tutorRoutes);

// Ruta de salud
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Tutor Virtual Inteligente',
        version: '1.0.0'
    });
});

// Ruta raíz
app.get('/', (req, res) => {
    res.json({
        message: 'Tutor Virtual Inteligente - Matemática para la Empresa I',
        endpoints: {
            health: '/api/health',
            tutor: {
                procesar: 'POST /api/tutor/procesar-contenido',
                embeddings: 'POST /api/tutor/generar-embeddings',
                estado: 'GET /api/tutor/estado',
                probar: 'POST /api/tutor/probar-embedding'
            }
        }
    });
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Error interno'
    });
});

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada',
        path: req.originalUrl
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log('🚀 Servidor del Tutor Virtual iniciado');
    console.log(`📍 Puerto: ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📚 Materia: Matemática para la Empresa I`);
    console.log('='.repeat(50));
    console.log('📋 Endpoints disponibles:');
    console.log(`  GET  /api/health`);
    console.log(`  POST /api/tutor/procesar-contenido`);
    console.log(`  POST /api/tutor/generar-embeddings`);
    console.log(`  GET  /api/tutor/estado`);
    console.log(`  POST /api/tutor/probar-embedding`);
    console.log('='.repeat(50));
});

module.exports = app;
