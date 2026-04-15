#!/bin/bash
# Script para dividir PDFs grandes usando qpdf
# Uso: ./split-pdf.sh input.pdf [pages_per_chunk]

set -e

INPUT_PDF="$1"
PAGES_PER_CHUNK="${2:-500}"  # Default 500 páginas por chunk

if [ -z "$INPUT_PDF" ]; then
    echo "Uso: $0 <input.pdf> [pages_per_chunk]"
    exit 1
fi

if [ ! -f "$INPUT_PDF" ]; then
    echo "Error: Archivo $INPUT_PDF no encontrado"
    exit 1
fi

echo "=== PDF Splitter con qpdf ==="
echo "Archivo de entrada: $INPUT_PDF"

# Obtener número total de páginas
TOTAL_PAGES=$(qpdf --show-npages "$INPUT_PDF")
echo "Total de páginas: $TOTAL_PAGES"
echo "Páginas por chunk: $PAGES_PER_CHUNK"

# Calcular número de chunks
NUM_CHUNKS=$(( ($TOTAL_PAGES + $PAGES_PER_CHUNK - 1) / $PAGES_PER_CHUNK ))
echo "Chunks a crear: $NUM_CHUNKS"
echo ""

# Crear directorio para chunks
OUTPUT_DIR="chunks_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$OUTPUT_DIR"

# Dividir PDF
for ((i=0; i<NUM_CHUNKS; i++)); do
    START_PAGE=$(( i * PAGES_PER_CHUNK + 1 ))
    END_PAGE=$(( (i + 1) * PAGES_PER_CHUNK ))
    
    # Ajustar última página
    if [ $END_PAGE -gt $TOTAL_PAGES ]; then
        END_PAGE=$TOTAL_PAGES
    fi
    
    CHUNK_NAME="$OUTPUT_DIR/chunk_$(printf '%03d' $i)_pages_${START_PAGE}-${END_PAGE}.pdf"
    
    echo "Creando chunk $((i+1))/$NUM_CHUNKS: páginas $START_PAGE-$END_PAGE"
    
    # Dividir usando qpdf (NO carga todo en memoria)
    qpdf "$INPUT_PDF" --pages "$INPUT_PDF" ${START_PAGE}-${END_PAGE} -- "$CHUNK_NAME"
    
    # Mostrar tamaño del chunk
    SIZE=$(du -h "$CHUNK_NAME" | cut -f1)
    echo "  ✓ Creado: $CHUNK_NAME ($SIZE)"
done

echo ""
echo "=== Resumen ==="
echo "Chunks creados: $NUM_CHUNKS"
echo "Directorio: $OUTPUT_DIR"
echo "Tamaño total:"
du -sh "$OUTPUT_DIR"

# Listar chunks
echo ""
echo "=== Chunks generados ==="
ls -lh "$OUTPUT_DIR"
