// =====================================================
// Tipos para Personalización Pedagógica
// =====================================================

export interface PedagogicalSettings {
  id: string;
  courseId: string;
  teacherId: string;
  teachingStyle: TeachingStyle;
  tonePreference: TonePreference;
  detailLevel: DetailLevel;
  useExamples: boolean;
  encourageQuestions: boolean;
  voiceName: VoiceName;
  voiceSpeed: number;
  systemPromptOverride?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TeachingStyle = 
  | 'socratico'      // Método socrático: preguntas guiadas
  | 'directo'        // Instrucción directa: explicaciones claras
  | 'colaborativo'   // Aprendizaje colaborativo: trabajo en equipo
  | 'constructivista'; // Constructivismo: construcción del conocimiento

export type TonePreference = 
  | 'amigable'       // Tono casual y cercano
  | 'formal'         // Tono académico y profesional
  | 'motivador'      // Tono alentador y positivo
  | 'neutro';        // Tono equilibrado

export type DetailLevel = 
  | 'basico'         // Explicaciones simples y directas
  | 'medio'          // Explicaciones balanceadas
  | 'avanzado';      // Explicaciones detalladas y técnicas

export type VoiceName = 
  | 'Kore'           // Voz femenina, clara y profesional (Expresiva)
  | 'Charon'         // Voz masculina, profunda y autoritaria (Expresiva)
  | 'Fenrir'         // Voz masculina, energética y motivadora (Expresiva)
  | 'Aoede'          // Voz femenina, cálida y expresiva (Expresiva)
  | 'Puck';          // Voz neutra, versátil y amigable (Expresiva)

/**
 * Estilos expresivos para voces de Gemini 2.5 Flash
 * Permiten controlar el tono, estilo y emoción del habla
 */
export type ExpressiveStyle = 
  | 'friendly'           // Amigable y cercano
  | 'professional'       // Profesional y formal
  | 'energetic'          // Energético y motivador
  | 'calm'               // Calmado y relajante
  | 'excited'            // Emocionado y entusiasta
  | 'empathetic'         // Empático y comprensivo
  | 'authoritative'      // Autoritario y confiable
  | 'warm'               // Cálido y acogedor
  | 'clear'              // Claro y preciso
  | 'amused'             // Divertido y alegre
  | 'fast'               // Rápido
  | 'slow'               // Lento
  | 'normal';            // Normal (sin estilo específico)

// =====================================================
// Sistema de Calificaciones
// =====================================================

export interface GradingScale {
  id: string;
  courseId: string;
  teacherId: string;
  scaleType: ScaleType;
  minScore: number;
  maxScore: number;
  passingScore: number;
  scaleDefinition: ScaleDefinition[];
  roundingRule: RoundingRule;
  showPercentage: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ScaleType = 
  | 'numeric'        // Escala numérica (0-100)
  | 'letter'         // Escala de letras (A, B, C, D, F)
  | 'custom';        // Escala personalizada

export type RoundingRule = 
  | 'nearest'        // Redondear al más cercano
  | 'up'             // Redondear hacia arriba
  | 'down';          // Redondear hacia abajo

export interface ScaleDefinition {
  min: number;
  max: number;
  grade: string;
  label: string;
  color?: string;    // Color para UI (opcional)
  description?: string;
}

// =====================================================
// Perfil de Aprendizaje del Estudiante
// =====================================================

export interface StudentProfile {
  id: string;
  studentId: string;
  courseId: string;
  preferredLearningStyle: LearningStyle;
  interactionCount: number;
  avgSessionDuration: number; // en minutos
  topicsStruggled: string[];
  topicsMastered: string[];
  lastUpdated: Date;
}

export type LearningStyle = 
  | 'visual'         // Aprende mejor con imágenes, diagramas, gráficos
  | 'auditivo'       // Aprende mejor con audio, música, conversaciones
  | 'kinestesico'    // Aprende mejor con movimiento, práctica, experimentos
  | 'lectoescritor'; // Aprende mejor leyendo y escribiendo

// =====================================================
// Gestión de Imágenes
// =====================================================

export interface CourseImage {
  id: string;
  courseId: string;
  uploadedBy: string;
  imageUrl: string;
  imageType: ImageType;
  fileSizeBytes: number;
  mimeType: string;
  altText?: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export type ImageType = 
  | 'cover'          // Imagen de portada del curso
  | 'banner'         // Banner del curso
  | 'material'       // Imagen de material educativo
  | 'content';       // Imagen de contenido específico

// =====================================================
// Configuración de Curso
// =====================================================

export interface CourseContext {
  id: string;
  title: string;
  code: string;
  description: string;
  teacherId: string;
  teacherName: string;
  coverImageUrl?: string;
  bannerImageUrl?: string;
  pedagogicalSettings: PedagogicalSettings;
  gradingScale: GradingScale;
  materials: CourseMaterial[];
  images: CourseImage[];
}

export interface CourseMaterial {
  id: string;
  title: string;
  kind: string;
  url: string;
  mimeType: string;
  thumbnailUrl?: string;
  images: string[];
  metadata: Record<string, any>;
}

// =====================================================
// Templates de Configuración
// =====================================================

export const DEFAULT_PEDAGOGICAL_SETTINGS: Omit<PedagogicalSettings, 'id' | 'courseId' | 'teacherId' | 'createdAt' | 'updatedAt'> = {
  teachingStyle: 'constructivista',
  tonePreference: 'amigable',
  detailLevel: 'medio',
  useExamples: true,
  encourageQuestions: true,
  voiceName: 'Kore',
  voiceSpeed: 1.0
};

export const DEFAULT_GRADING_SCALE: Omit<GradingScale, 'id' | 'courseId' | 'teacherId' | 'createdAt' | 'updatedAt'> = {
  scaleType: 'numeric',
  minScore: 0,
  maxScore: 100,
  passingScore: 60,
  scaleDefinition: [
    { min: 90, max: 100, grade: 'A', label: 'Excelente', color: '#10B981' },
    { min: 80, max: 89, grade: 'B', label: 'Bueno', color: '#3B82F6' },
    { min: 70, max: 79, grade: 'C', label: 'Satisfactorio', color: '#F59E0B' },
    { min: 60, max: 69, grade: 'D', label: 'Aprobado', color: '#EF4444' },
    { min: 0, max: 59, grade: 'F', label: 'Reprobado', color: '#6B7280' }
  ],
  roundingRule: 'nearest',
  showPercentage: true
};

// =====================================================
// Utilidades de Personalización
// =====================================================

export interface PersonalizationContext {
  pedagogical: PedagogicalSettings;
  student: StudentProfile;
  course: CourseContext;
  recentMessages: string[];
  currentTopic?: string;
}

export interface PersonalizedPrompt {
  systemPrompt: string;
  userPrompt: string;
  context: string;
  examples?: string[];
  voiceInstructions?: string;
}

// =====================================================
// Métricas y Analytics
// =====================================================

export interface LearningMetrics {
  studentId: string;
  courseId: string;
  totalInteractions: number;
  avgResponseTime: number;
  topicsCovered: string[];
  difficultyProgression: number[];
  engagementScore: number;
  lastActivity: Date;
}

export interface TeachingMetrics {
  teacherId: string;
  courseId: string;
  totalStudents: number;
  avgStudentEngagement: number;
  mostEffectiveSettings: Partial<PedagogicalSettings>;
  commonStruggles: string[];
  lastUpdated: Date;
}
