-- Tablas para el Experimento de GraphRAG (Grafo de Conocimiento)
-- Estas tablas conviven con las existentes sin afectar el funcionamiento actual.

-- 1. NODOS: Representan las entidades (Conceptos, Autores, Definiciones, etc.)
CREATE TABLE IF NOT EXISTS graph_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT, -- Ejemplo: 'Concepto', 'Proceso', 'Persona', 'Teoría'
    description TEXT, -- Opcional: una breve descripción generada por la IA
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Restricción para evitar duplicados exactos de nombre+tipo
    UNIQUE(name, type)
);

-- 2. ARISTAS: Representan las relaciones entre nodos (Sujeto -> Predicado -> Objeto)
CREATE TABLE IF NOT EXISTS graph_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
    relation TEXT NOT NULL, -- El "verbo" o predicado, ej: "produce", "es_parte_de"
    
    -- Metadata para rastrear el origen de este conocimiento
    chunk_id UUID REFERENCES course_content_chunks(id) ON DELETE SET NULL, -- Enlace al texto fuente
    confidence_score FLOAT, -- Confianza de la IA en esta extracción (0.0 a 1.0)
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ÍNDICES: Para búsquedas rápidas durante la inferencia
CREATE INDEX IF NOT EXISTS idx_graph_nodes_name ON graph_nodes(name);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_type ON graph_nodes(type);
CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON graph_edges(source_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON graph_edges(target_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_relation ON graph_edges(relation);

-- 4. COMENTARIOS: Documentación en la base de datos
COMMENT ON TABLE graph_nodes IS 'Almacena las entidades únicas del Grafo de Conocimiento de EduSpark';
COMMENT ON TABLE graph_edges IS 'Almacena las relaciones semánticas entre entidades, vinculadas al contenido del curso';
