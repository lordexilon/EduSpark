-- sql_scripts/crear_tabla_processing_costs.sql
-- Tabla para almacenar costos reales de procesamiento de archivos

-- Crear tabla de costos de procesamiento
CREATE TABLE IF NOT EXISTS processing_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id VARCHAR(255) NOT NULL UNIQUE, -- ID del job en Firestore
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
    material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
    file_name VARCHAR(500) NOT NULL,
    file_size BIGINT, -- Tamaño en bytes
    total_pages INTEGER,
    total_chunks INTEGER,
    execution_time_seconds NUMERIC(10, 2), -- Tiempo de ejecución en segundos
    pdf_type VARCHAR(20) CHECK (pdf_type IN ('text', 'scanned', 'unknown')),
    
    -- Costos estimados (JSONB)
    estimated_costs JSONB,
    
    -- Costos reales (JSONB)
    actual_costs JSONB NOT NULL,
    
    -- Diferencia entre estimado y real
    cost_difference NUMERIC(10, 4), -- actual - estimado
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_processing_costs_user_id ON processing_costs(user_id);
CREATE INDEX IF NOT EXISTS idx_processing_costs_course_id ON processing_costs(course_id);
CREATE INDEX IF NOT EXISTS idx_processing_costs_material_id ON processing_costs(material_id);
CREATE INDEX IF NOT EXISTS idx_processing_costs_created_at ON processing_costs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_processing_costs_job_id ON processing_costs(job_id);

-- Índice para búsquedas por rango de fechas
CREATE INDEX IF NOT EXISTS idx_processing_costs_date_range ON processing_costs(created_at DESC, user_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_processing_costs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_processing_costs_updated_at ON processing_costs;
CREATE TRIGGER trigger_update_processing_costs_updated_at
    BEFORE UPDATE ON processing_costs
    FOR EACH ROW
    EXECUTE FUNCTION update_processing_costs_updated_at();

-- Vista para estadísticas de costos por usuario
CREATE OR REPLACE VIEW v_processing_costs_by_user AS
SELECT 
    user_id,
    COUNT(*) as total_jobs,
    SUM((actual_costs->>'total')::numeric) as total_cost,
    AVG((actual_costs->>'total')::numeric) as avg_cost_per_job,
    MIN((actual_costs->>'total')::numeric) as min_cost,
    MAX((actual_costs->>'total')::numeric) as max_cost,
    SUM(total_pages) as total_pages_processed,
    SUM(total_chunks) as total_chunks_processed,
    SUM(execution_time_seconds) as total_execution_time_seconds
FROM processing_costs
WHERE user_id IS NOT NULL
GROUP BY user_id;

-- Vista para estadísticas de costos por curso
CREATE OR REPLACE VIEW v_processing_costs_by_course AS
SELECT 
    course_id,
    COUNT(*) as total_jobs,
    SUM((actual_costs->>'total')::numeric) as total_cost,
    AVG((actual_costs->>'total')::numeric) as avg_cost_per_job,
    SUM(total_pages) as total_pages_processed,
    SUM(total_chunks) as total_chunks_processed
FROM processing_costs
WHERE course_id IS NOT NULL
GROUP BY course_id;

-- Vista para estadísticas diarias
CREATE OR REPLACE VIEW v_processing_costs_daily AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_jobs,
    SUM((actual_costs->>'total')::numeric) as total_cost,
    AVG((actual_costs->>'total')::numeric) as avg_cost_per_job,
    SUM(total_pages) as total_pages_processed,
    SUM(total_chunks) as total_chunks_processed
FROM processing_costs
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Comentarios
COMMENT ON TABLE processing_costs IS 'Almacena costos reales de procesamiento de archivos para análisis y control de gastos';
COMMENT ON COLUMN processing_costs.job_id IS 'ID único del job en Firestore';
COMMENT ON COLUMN processing_costs.actual_costs IS 'JSON con costos reales: {ocr, embeddings, cloudRun, firestore, total}';
COMMENT ON COLUMN processing_costs.estimated_costs IS 'JSON con costos estimados: {ocr, embeddings, cloudRun, firestore, total}';
COMMENT ON COLUMN processing_costs.cost_difference IS 'Diferencia entre costo real y estimado (actual - estimado)';

