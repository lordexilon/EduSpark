-- Tabla para gestionar tutoriales completados por usuario
-- Permite rastrear qué tutoriales ha completado cada usuario

CREATE TABLE IF NOT EXISTS user_tutorials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tutorial_id TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  dont_show_again BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Un usuario solo puede tener un registro por tutorial
  UNIQUE(user_id, tutorial_id)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_user_tutorials_user_id ON user_tutorials(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tutorials_tutorial_id ON user_tutorials(tutorial_id);
CREATE INDEX IF NOT EXISTS idx_user_tutorials_completed ON user_tutorials(completed);

-- Comentarios
COMMENT ON TABLE user_tutorials IS 'Registra qué tutoriales interactivos ha completado cada usuario';
COMMENT ON COLUMN user_tutorials.tutorial_id IS 'ID del tutorial (course-view, tutor-ai, etc.)';
COMMENT ON COLUMN user_tutorials.completed IS 'Indica si el usuario ha completado este tutorial';
COMMENT ON COLUMN user_tutorials.dont_show_again IS 'Indica si el usuario marcó "no volver a mostrar" este tutorial';

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_user_tutorials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_tutorials_updated_at
  BEFORE UPDATE ON user_tutorials
  FOR EACH ROW
  EXECUTE FUNCTION update_user_tutorials_updated_at();

