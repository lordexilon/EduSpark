/**
 * Script para generar embeddings del contenido procesado
 * usando la API de Google Text Embedding 004.
 * Compatible con Node.js/Express.js
 */

const fs = require('fs').promises;
const https = require('https');

class GeneradorEmbeddings {
    constructor(apiKey = null) {
        this.apiKey = apiKey || process.env.GEMINI_API_KEY;
        if (!this.apiKey) {
            throw new Error('Se requiere GEMINI_API_KEY en las variables de entorno');
        }
        
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent';
        this.embeddingsGenerados = [];
    }

    /**
     * Genera un embedding para un texto dado
     */
    async generarEmbedding(texto) {
        const payload = JSON.stringify({
            model: 'models/text-embedding-004',
            content: {
                parts: [{ text: texto }]
            }
        });

        const options = {
            hostname: 'generativelanguage.googleapis.com',
            port: 443,
            path: `/v1beta/models/text-embedding-004:embedContent?key=${this.apiKey}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        if (res.statusCode === 200) {
                            const response = JSON.parse(data);
                            resolve(response.embedding?.values || []);
                        } else {
                            console.error(`Error en la API: ${res.statusCode} - ${data}`);
                            resolve([]);
                        }
                    } catch (error) {
                        console.error('Error al parsear respuesta:', error.message);
                        resolve([]);
                    }
                });
            });

            req.on('error', (error) => {
                console.error('Error de conexión:', error.message);
                resolve([]);
            });

            req.write(payload);
            req.end();
        });
    }

    /**
     * Procesa una lista de chunks y genera embeddings para cada uno
     */
    async procesarChunks(chunks) {
        const chunksConEmbeddings = [];
        
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.log(`Procesando chunk ${i + 1}/${chunks.length}: ${chunk.id}`);
            
            // Generar embedding
            const embedding = await this.generarEmbedding(chunk.contenido);
            
            if (embedding && embedding.length > 0) {
                const chunkConEmbedding = { ...chunk };
                chunkConEmbedding.embedding = embedding;
                chunkConEmbedding.dimensiones = embedding.length;
                chunksConEmbeddings.push(chunkConEmbedding);
                
                // Pequeña pausa para no sobrecargar la API
                await new Promise(resolve => setTimeout(resolve, 100));
            } else {
                console.log(`⚠️ No se pudo generar embedding para ${chunk.id}`);
            }
        }
        
        return chunksConEmbeddings;
    }

    /**
     * Guarda los chunks con embeddings en un archivo JSON
     */
    async guardarEmbeddings(chunksConEmbeddings, archivoSalida = 'embeddings_generados.json') {
        const resultado = {
            totalChunks: chunksConEmbeddings.length,
            dimensionesEmbedding: chunksConEmbeddings.length > 0 ? chunksConEmbeddings[0].dimensiones : 0,
            fechaGeneracion: new Date().toISOString(),
            chunksConEmbeddings: chunksConEmbeddings
        };
        
        try {
            await fs.writeFile(archivoSalida, JSON.stringify(resultado, null, 2), 'utf-8');
            console.log(`✅ Embeddings guardados en ${archivoSalida}`);
            console.log(`Total de chunks con embeddings: ${chunksConEmbeddings.length}`);
        } catch (error) {
            console.error(`Error al guardar ${archivoSalida}:`, error.message);
        }
    }

    /**
     * Genera el formato específico para insertar en Supabase
     */
    generarFormatoSupabase(chunksConEmbeddings) {
        const registrosSupabase = [];
        
        chunksConEmbeddings.forEach(chunk => {
            const registro = {
                id: chunk.id,
                course_id: 'matematica_empresa_1',
                content: chunk.contenido,
                embedding: chunk.embedding,
                metadata: {
                    unidad: chunk.metadatos.unidad,
                    conceptos_clave: chunk.metadatos.conceptosClave,
                    nivel_dificultad: chunk.metadatos.nivelDificultad,
                    aplicaciones_empresariales: chunk.metadatos.aplicacionesEmpresariales,
                    posicion: chunk.posicion,
                    longitud: chunk.longitud,
                    tipo: chunk.tipo
                },
                created_at: new Date().toISOString()
            };
            registrosSupabase.push(registro);
        });
        
        return registrosSupabase;
    }

    /**
     * Guarda los datos en formato para Supabase
     */
    async guardarFormatoSupabase(registros, archivoSalida = 'datos_supabase.json') {
        const resultado = {
            tabla: 'course_content_chunks',
            totalRegistros: registros.length,
            fechaGeneracion: new Date().toISOString(),
            registros: registros
        };
        
        try {
            await fs.writeFile(archivoSalida, JSON.stringify(resultado, null, 2), 'utf-8');
            console.log(`✅ Datos para Supabase guardados en ${archivoSalida}`);
            console.log(`Total de registros: ${registros.length}`);
        } catch (error) {
            console.error(`Error al guardar ${archivoSalida}:`, error.message);
        }
    }
}

/**
 * Carga los chunks procesados desde un archivo JSON
 */
async function cargarChunksProcesados(archivo = 'chunks_procesados.json') {
    try {
        const data = await fs.readFile(archivo, 'utf-8');
        const parsed = JSON.parse(data);
        return parsed.chunks || [];
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log(`❌ No se encontró el archivo ${archivo}`);
            console.log('Ejecuta primero procesar_contenido.js');
        } else {
            console.log(`❌ Error al cargar ${archivo}:`, error.message);
        }
        return [];
    }
}

/**
 * Función principal para generar embeddings
 */
async function main() {
    console.log('🧠 Generador de Embeddings - Matemática para la Empresa I');
    console.log('='.repeat(60));
    
    // Verificar API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.log('❌ Error: Se requiere GEMINI_API_KEY en las variables de entorno');
        console.log('Ejemplo: export GEMINI_API_KEY="tu_api_key_aqui"');
        return;
    }
    
    // Cargar chunks procesados
    const chunks = await cargarChunksProcesados();
    if (chunks.length === 0) {
        return;
    }
    
    console.log(`📚 Cargados ${chunks.length} chunks para procesar`);
    
    // Crear generador de embeddings
    const generador = new GeneradorEmbeddings(apiKey);
    
    // Procesar chunks
    console.log('\n🔄 Generando embeddings...');
    const chunksConEmbeddings = await generador.procesarChunks(chunks);
    
    if (chunksConEmbeddings.length > 0) {
        // Guardar resultados
        await generador.guardarEmbeddings(chunksConEmbeddings);
        
        // Generar formato para Supabase
        const registrosSupabase = generador.generarFormatoSupabase(chunksConEmbeddings);
        await generador.guardarFormatoSupabase(registrosSupabase);
        
        // Mostrar estadísticas
        console.log('\n📊 Estadísticas de Embeddings:');
        console.log(`Total procesados: ${chunksConEmbeddings.length}`);
        console.log(`Dimensiones por embedding: ${chunksConEmbeddings[0].dimensiones}`);
        
        // Estadísticas por unidad
        const unidades = {};
        chunksConEmbeddings.forEach(chunk => {
            const unidad = chunk.metadatos.unidad;
            unidades[unidad] = (unidades[unidad] || 0) + 1;
        });
        
        console.log('\n📚 Embeddings por Unidad:');
        Object.entries(unidades).forEach(([unidad, cantidad]) => {
            console.log(`  ${unidad}: ${cantidad} embeddings`);
        });
        
        console.log('\n✅ Proceso completado exitosamente!');
        console.log('📁 Archivos generados:');
        console.log('  - embeddings_generados.json');
        console.log('  - datos_supabase.json');
        
    } else {
        console.log('❌ No se generaron embeddings. Verifica la API key y la conexión.');
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { GeneradorEmbeddings };
