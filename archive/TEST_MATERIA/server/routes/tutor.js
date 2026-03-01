/**
 * Rutas del Tutor Virtual Inteligente
 * Endpoint para procesar contenido y generar embeddings
 */

const express = require('express');
const { ProcesadorContenido } = require('../scripts/procesar_contenido');
const { GeneradorEmbeddings } = require('../scripts/generar_embeddings');
const router = express.Router();

/**
 * POST /api/tutor/procesar-contenido
 * Procesa el contenido del curso y lo divide en chunks
 */
router.post('/procesar-contenido', async (req, res) => {
    try {
        console.log('🧮 Iniciando procesamiento de contenido...');
        
        const procesador = new ProcesadorContenido();
        const chunks = await procesador.procesarTodosLosArchivos();
        
        if (chunks.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se encontraron archivos para procesar'
            });
        }
        
        // Guardar resultados
        await procesador.guardarResultados(chunks);
        
        // Estadísticas
        const unidades = {};
        chunks.forEach(chunk => {
            const unidad = chunk.metadatos.unidad;
            unidades[unidad] = (unidades[unidad] || 0) + 1;
        });
        
        res.json({
            success: true,
            message: 'Contenido procesado exitosamente',
            data: {
                totalChunks: chunks.length,
                chunksPorUnidad: unidades,
                archivoGenerado: 'chunks_procesados.json'
            }
        });
        
    } catch (error) {
        console.error('Error en procesamiento de contenido:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

/**
 * POST /api/tutor/generar-embeddings
 * Genera embeddings para el contenido procesado
 */
router.post('/generar-embeddings', async (req, res) => {
    try {
        console.log('🧠 Iniciando generación de embeddings...');
        
        // Verificar API key
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(400).json({
                success: false,
                message: 'GEMINI_API_KEY no configurada'
            });
        }
        
        const generador = new GeneradorEmbeddings(apiKey);
        
        // Cargar chunks procesados
        const fs = require('fs').promises;
        let chunks = [];
        
        try {
            const data = await fs.readFile('chunks_procesados.json', 'utf-8');
            const parsed = JSON.parse(data);
            chunks = parsed.chunks || [];
        } catch (error) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró chunks_procesados.json. Ejecuta primero /procesar-contenido'
            });
        }
        
        if (chunks.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No hay chunks para procesar'
            });
        }
        
        // Generar embeddings
        const chunksConEmbeddings = await generador.procesarChunks(chunks);
        
        if (chunksConEmbeddings.length === 0) {
            return res.status(500).json({
                success: false,
                message: 'No se pudieron generar embeddings'
            });
        }
        
        // Guardar resultados
        await generador.guardarEmbeddings(chunksConEmbeddings);
        
        // Generar formato para Supabase
        const registrosSupabase = generador.generarFormatoSupabase(chunksConEmbeddings);
        await generador.guardarFormatoSupabase(registrosSupabase);
        
        res.json({
            success: true,
            message: 'Embeddings generados exitosamente',
            data: {
                totalEmbeddings: chunksConEmbeddings.length,
                dimensiones: chunksConEmbeddings[0]?.dimensiones || 0,
                archivosGenerados: [
                    'embeddings_generados.json',
                    'datos_supabase.json'
                ]
            }
        });
        
    } catch (error) {
        console.error('Error en generación de embeddings:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

/**
 * GET /api/tutor/estado
 * Obtiene el estado actual del procesamiento
 */
router.get('/estado', async (req, res) => {
    try {
        const fs = require('fs').promises;
        const path = require('path');
        
        const archivos = [
            'chunks_procesados.json',
            'embeddings_generados.json',
            'datos_supabase.json'
        ];
        
        const estado = {
            archivos: {},
            contenido: {
                directorio: 'contenido_curso',
                archivosMD: []
            }
        };
        
        // Verificar archivos generados
        for (const archivo of archivos) {
            try {
                const stats = await fs.stat(archivo);
                estado.archivos[archivo] = {
                    existe: true,
                    tamaño: stats.size,
                    fechaModificacion: stats.mtime
                };
            } catch (error) {
                estado.archivos[archivo] = {
                    existe: false
                };
            }
        }
        
        // Verificar contenido del curso
        try {
            const archivos = await fs.readdir('contenido_curso');
            estado.contenido.archivosMD = archivos.filter(archivo => 
                archivo.endsWith('.md')
            );
        } catch (error) {
            estado.contenido.error = 'Directorio contenido_curso no encontrado';
        }
        
        res.json({
            success: true,
            data: estado
        });
        
    } catch (error) {
        console.error('Error al obtener estado:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

/**
 * POST /api/tutor/probar-embedding
 * Prueba la generación de un embedding individual
 */
router.post('/probar-embedding', async (req, res) => {
    try {
        const { texto } = req.body;
        
        if (!texto) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere el campo "texto"'
            });
        }
        
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(400).json({
                success: false,
                message: 'GEMINI_API_KEY no configurada'
            });
        }
        
        const generador = new GeneradorEmbeddings(apiKey);
        const embedding = await generador.generarEmbedding(texto);
        
        if (embedding && embedding.length > 0) {
            res.json({
                success: true,
                data: {
                    texto: texto,
                    dimensiones: embedding.length,
                    embedding: embedding.slice(0, 10), // Solo primeros 10 valores
                    mensaje: 'Embedding generado exitosamente'
                }
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'No se pudo generar el embedding'
            });
        }
        
    } catch (error) {
        console.error('Error en prueba de embedding:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

module.exports = router;
