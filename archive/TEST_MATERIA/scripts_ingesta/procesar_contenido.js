/**
 * Script para procesar el contenido de Matemática para la Empresa I
 * y prepararlo para la ingesta en la base de datos vectorial.
 * Compatible con Node.js/Express.js
 */

const fs = require('fs').promises;
const path = require('path');

class ProcesadorContenido {
    constructor(directorioContenido = 'contenido_curso') {
        this.directorioContenido = directorioContenido;
        this.chunksProcesados = [];
    }

    /**
     * Lee un archivo Markdown y retorna su contenido
     */
    async leerArchivoMD(rutaArchivo) {
        try {
            const contenido = await fs.readFile(rutaArchivo, 'utf-8');
            return contenido;
        } catch (error) {
            console.error(`Error al leer ${rutaArchivo}:`, error.message);
            return '';
        }
    }

    /**
     * Divide el contenido en chunks más pequeños para embeddings
     */
    dividirEnChunks(contenido, maxChars = 2000) {
        // Dividir por secciones (## o ###)
        const secciones = contenido.split(/\n(#{2,3})\s+/);
        
        const chunks = [];
        let chunkActual = '';
        
        for (let i = 0; i < secciones.length; i++) {
            const seccion = secciones[i];
            
            if (seccion.startsWith('#')) {
                // Es un título, agregarlo al chunk actual
                if (chunkActual && chunkActual.length > 0) {
                    chunks.push(chunkActual.trim());
                }
                chunkActual = seccion + '\n';
            } else {
                // Es contenido, agregarlo al chunk actual
                chunkActual += seccion;
                
                // Si el chunk es muy grande, dividirlo
                if (chunkActual.length > maxChars) {
                    // Buscar un punto de división natural
                    let puntoDivision = chunkActual.lastIndexOf('\n\n', maxChars);
                    if (puntoDivision === -1) {
                        puntoDivision = chunkActual.lastIndexOf('\n', maxChars);
                    }
                    if (puntoDivision === -1) {
                        puntoDivision = maxChars;
                    }
                    
                    chunks.push(chunkActual.substring(0, puntoDivision).trim());
                    chunkActual = chunkActual.substring(puntoDivision).trim();
                }
            }
        }
        
        // Agregar el último chunk si no está vacío
        if (chunkActual.trim()) {
            chunks.push(chunkActual.trim());
        }
        
        return chunks;
    }

    /**
     * Extrae metadatos del contenido
     */
    extraerMetadatos(contenido, nombreArchivo) {
        return {
            archivo: nombreArchivo,
            unidad: this.identificarUnidad(nombreArchivo),
            conceptosClave: this.extraerConceptosClave(contenido),
            nivelDificultad: this.identificarNivelDificultad(contenido),
            aplicacionesEmpresariales: this.identificarAplicacionesEmpresariales(contenido)
        };
    }

    /**
     * Identifica la unidad basándose en el nombre del archivo
     */
    identificarUnidad(nombreArchivo) {
        if (nombreArchivo.includes('unidad_1')) {
            return 'EXPRESIONES ALGEBRAICAS';
        } else if (nombreArchivo.includes('unidad_2')) {
            return 'ECUACIONES LINEALES – SISTEMAS DE ECUACIONES';
        } else if (nombreArchivo.includes('unidad_3')) {
            return 'PROGRESIONES ARITMÉTICAS Y GEOMÉTRICAS';
        } else if (nombreArchivo.includes('unidad_4')) {
            return 'TEORÍA DE CONJUNTOS';
        } else {
            return 'GENERAL';
        }
    }

    /**
     * Extrae conceptos clave del contenido
     */
    extraerConceptosClave(contenido) {
        const conceptos = [];
        const contenidoLower = contenido.toLowerCase();
        
        const terminosMatematicos = [
            'variable', 'constante', 'coeficiente', 'expresión algebraica',
            'ecuación', 'sistema de ecuaciones', 'factorización',
            'progresión aritmética', 'progresión geométrica',
            'conjunto', 'unión', 'intersección', 'diferencia',
            'costo', 'ingreso', 'utilidad', 'punto de equilibrio'
        ];
        
        terminosMatematicos.forEach(termino => {
            if (contenidoLower.includes(termino.toLowerCase())) {
                conceptos.push(termino);
            }
        });
        
        return [...new Set(conceptos)]; // Eliminar duplicados
    }

    /**
     * Identifica el nivel de dificultad del contenido
     */
    identificarNivelDificultad(contenido) {
        const contenidoLower = contenido.toLowerCase();
        
        if (contenidoLower.includes('básico') || 
            contenidoLower.includes('fundamental') || 
            contenidoLower.includes('introducción')) {
            return 'básico';
        } else if (contenidoLower.includes('avanzado') || 
                   contenidoLower.includes('complejo') || 
                   contenidoLower.includes('optimización')) {
            return 'avanzado';
        } else {
            return 'intermedio';
        }
    }

    /**
     * Identifica si el contenido tiene aplicaciones empresariales
     */
    identificarAplicacionesEmpresariales(contenido) {
        const contenidoLower = contenido.toLowerCase();
        const palabrasEmpresariales = [
            'empresa', 'negocio', 'costos', 'ingresos', 'utilidad',
            'ventas', 'clientes', 'mercado', 'administración'
        ];
        
        return palabrasEmpresariales.some(palabra => 
            contenidoLower.includes(palabra)
        );
    }

    /**
     * Procesa un archivo completo y retorna los chunks procesados
     */
    async procesarArchivo(rutaArchivo) {
        const nombreArchivo = path.basename(rutaArchivo);
        const contenido = await this.leerArchivoMD(rutaArchivo);
        
        if (!contenido) {
            return [];
        }
        
        const metadatos = this.extraerMetadatos(contenido, nombreArchivo);
        const chunks = this.dividirEnChunks(contenido);
        
        const chunksProcesados = [];
        chunks.forEach((chunk, index) => {
            const chunkProcesado = {
                id: `${nombreArchivo}_${index + 1}`,
                contenido: chunk,
                metadatos: metadatos,
                posicion: index + 1,
                longitud: chunk.length,
                tipo: 'contenido_curso'
            };
            chunksProcesados.push(chunkProcesado);
        });
        
        return chunksProcesados;
    }

    /**
     * Procesa todos los archivos del directorio de contenido
     */
    async procesarTodosLosArchivos() {
        const todosLosChunks = [];
        
        try {
            const archivos = await fs.readdir(this.directorioContenido);
            const archivosMD = archivos.filter(archivo => archivo.endsWith('.md'));
            
            if (archivosMD.length === 0) {
                console.log(`No se encontraron archivos .md en ${this.directorioContenido}`);
                return [];
            }
            
            for (const archivo of archivosMD) {
                console.log(`Procesando: ${archivo}`);
                const rutaCompleta = path.join(this.directorioContenido, archivo);
                const chunks = await this.procesarArchivo(rutaCompleta);
                todosLosChunks.push(...chunks);
            }
            
        } catch (error) {
            console.error(`Error al leer directorio ${this.directorioContenido}:`, error.message);
            return [];
        }
        
        return todosLosChunks;
    }

    /**
     * Guarda los chunks procesados en un archivo JSON
     */
    async guardarResultados(chunks, archivoSalida = 'chunks_procesados.json') {
        const resultado = {
            totalChunks: chunks.length,
            fechaProcesamiento: new Date().toISOString(),
            chunks: chunks
        };
        
        try {
            await fs.writeFile(archivoSalida, JSON.stringify(resultado, null, 2), 'utf-8');
            console.log(`✅ Resultados guardados en ${archivoSalida}`);
            console.log(`Total de chunks procesados: ${chunks.length}`);
        } catch (error) {
            console.error(`Error al guardar ${archivoSalida}:`, error.message);
        }
    }
}

/**
 * Función principal para ejecutar el procesamiento
 */
async function main() {
    console.log('🧮 Procesador de Contenido - Matemática para la Empresa I');
    console.log('='.repeat(60));
    
    // Crear instancia del procesador
    const procesador = new ProcesadorContenido();
    
    // Procesar todos los archivos
    const chunks = await procesador.procesarTodosLosArchivos();
    
    if (chunks.length > 0) {
        // Guardar resultados
        await procesador.guardarResultados(chunks);
        
        // Mostrar estadísticas
        console.log('\n📊 Estadísticas del Procesamiento:');
        console.log(`Total de chunks: ${chunks.length}`);
        
        // Agrupar por unidad
        const unidades = {};
        chunks.forEach(chunk => {
            const unidad = chunk.metadatos.unidad;
            unidades[unidad] = (unidades[unidad] || 0) + 1;
        });
        
        console.log('\n📚 Chunks por Unidad:');
        Object.entries(unidades).forEach(([unidad, cantidad]) => {
            console.log(`  ${unidad}: ${cantidad} chunks`);
        });
        
        // Mostrar conceptos clave encontrados
        const todosConceptos = new Set();
        chunks.forEach(chunk => {
            chunk.metadatos.conceptosClave.forEach(concepto => {
                todosConceptos.add(concepto);
            });
        });
        
        console.log(`\n🔑 Conceptos Clave Encontrados: ${todosConceptos.size}`);
        console.log(`Conceptos: ${Array.from(todosConceptos).sort().join(', ')}`);
        
    } else {
        console.log('❌ No se procesaron chunks. Verifica que existan archivos .md en el directorio.');
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { ProcesadorContenido };
