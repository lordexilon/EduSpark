// services/teacherAdvisorAgent.ts
// Agente de IA para análisis y recomendaciones para docentes
// Analiza datos de desempeño del Tutor IA y genera recomendaciones inteligentes

import { generateContent } from './geminiService';
import type { StudentMetrics, CourseMetrics } from './tutorAnalyticsService';

export interface AdvisorRecommendation {
  type: 'student_attention' | 'course_improvement' | 'content_gap' | 'engagement' | 'cost_optimization';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionItems: string[];
  studentIds?: string[]; // Para recomendaciones específicas de estudiantes
}

export interface AdvisorAnalysis {
  summary: string;
  keyInsights: string[];
  recommendations: AdvisorRecommendation[];
  trends: {
    participationTrend: 'increasing' | 'decreasing' | 'stable';
    performanceTrend: 'improving' | 'declining' | 'stable';
    costTrend: 'increasing' | 'decreasing' | 'stable';
  };
}

/**
 * Analiza los datos del curso y genera recomendaciones inteligentes
 */
export async function analyzeCoursePerformance(
  courseMetrics: CourseMetrics,
  studentMetrics: StudentMetrics[]
): Promise<AdvisorAnalysis> {
  try {
    // Preparar datos para el análisis
    const analysisData = {
      course: {
        title: courseMetrics.courseTitle,
        totalStudents: courseMetrics.totalStudents,
        activeStudents: courseMetrics.activeStudents,
        participationRate: courseMetrics.totalStudents > 0 
          ? (courseMetrics.activeStudents / courseMetrics.totalStudents) * 100 
          : 0,
        totalInteractions: courseMetrics.totalInteractions,
        averageInteractionsPerStudent: courseMetrics.averageInteractionsPerStudent,
        totalCost: courseMetrics.totalCost,
        topTopics: courseMetrics.topTopics.slice(0, 5),
      },
      students: studentMetrics.map(s => ({
        name: s.studentName,
        interactions: s.totalInteractions,
        tokens: s.totalTokens,
        cost: s.totalCost,
        lastInteraction: s.lastInteractionDate,
        performanceImprovement: s.performanceImprovement,
        needsAttention: courseMetrics.studentsNeedingAttention.includes(s.studentId),
      })),
      studentsNeedingAttention: courseMetrics.studentsNeedingAttention.length,
    };

    // Crear prompt para el análisis
    const prompt = createAnalysisPrompt(analysisData);

    // Llamar a Gemini para análisis
    const systemInstruction = `Eres un asesor educativo experto especializado en análisis de datos de aprendizaje y recomendaciones pedagógicas. 
Analiza los datos proporcionados y genera recomendaciones prácticas y accionables para mejorar el desempeño del curso y el aprendizaje de los estudiantes.
Responde SIEMPRE en español y en formato JSON válido.`;

    const response = await generateContent(prompt, {
      model: 'gemini-2.5-flash',
      temperature: 0.7,
      systemInstruction,
    });

    // Parsear respuesta JSON
    const analysis = parseAnalysisResponse(response.text);

    // Generar recomendaciones adicionales basadas en reglas
    const ruleBasedRecommendations = generateRuleBasedRecommendations(
      courseMetrics,
      studentMetrics
    );

    // Combinar recomendaciones de IA y reglas
    analysis.recommendations = [
      ...analysis.recommendations,
      ...ruleBasedRecommendations,
    ];

    // Ordenar recomendaciones por prioridad
    analysis.recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    return analysis;
  } catch (error) {
    console.error('Error analyzing course performance:', error);
    
    // Retornar análisis básico basado en reglas si falla la IA
    return generateFallbackAnalysis(courseMetrics, studentMetrics);
  }
}

/**
 * Crea el prompt para el análisis de IA
 */
function createAnalysisPrompt(data: any): string {
  return `Analiza los siguientes datos del curso "${data.course.title}" y genera un análisis completo con recomendaciones:

**Métricas del Curso:**
- Total de estudiantes: ${data.course.totalStudents}
- Estudiantes activos (usaron el tutor): ${data.course.activeStudents}
- Tasa de participación: ${data.course.participationRate.toFixed(1)}%
- Total de interacciones: ${data.course.totalInteractions}
- Promedio de interacciones por estudiante: ${data.course.averageInteractionsPerStudent.toFixed(1)}
- Costo total: $${data.course.totalCost.toFixed(4)}
- Temas más consultados: ${data.course.topTopics.map((t: any) => t.topic).join(', ')}

**Estudiantes que Necesitan Atención:** ${data.studentsNeedingAttention}

**Datos de Estudiantes:**
${data.students.map((s: any) => `
- ${s.name}: ${s.interactions} interacciones, ${s.tokens.toLocaleString()} tokens, $${s.cost.toFixed(4)}, 
  Última interacción: ${s.lastInteraction || 'Nunca'}, 
  Mejora de desempeño: ${s.performanceImprovement !== null ? s.performanceImprovement.toFixed(1) + '%' : 'N/A'},
  Necesita atención: ${s.needsAttention ? 'Sí' : 'No'}
`).join('')}

Genera un análisis en formato JSON con la siguiente estructura:
{
  "summary": "Resumen ejecutivo del análisis (2-3 párrafos)",
  "keyInsights": ["insight 1", "insight 2", "insight 3"],
  "recommendations": [
    {
      "type": "student_attention|course_improvement|content_gap|engagement|cost_optimization",
      "priority": "high|medium|low",
      "title": "Título de la recomendación",
      "description": "Descripción detallada",
      "actionItems": ["acción 1", "acción 2"]
    }
  ],
  "trends": {
    "participationTrend": "increasing|decreasing|stable",
    "performanceTrend": "improving|declining|stable",
    "costTrend": "increasing|decreasing|stable"
  }
}`;
}

/**
 * Parsea la respuesta de Gemini a formato estructurado
 */
function parseAnalysisResponse(text: string): AdvisorAnalysis {
  try {
    // Intentar extraer JSON del texto (puede venir con markdown)
    let jsonText = text.trim();
    
    // Remover markdown code blocks si existen
    const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/) || 
                     jsonText.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonText);
    
    return {
      summary: parsed.summary || 'Análisis completado',
      keyInsights: parsed.keyInsights || [],
      recommendations: parsed.recommendations || [],
      trends: parsed.trends || {
        participationTrend: 'stable',
        performanceTrend: 'stable',
        costTrend: 'stable',
      },
    };
  } catch (error) {
    console.error('Error parsing analysis response:', error);
    throw new Error('No se pudo parsear la respuesta del análisis');
  }
}

/**
 * Genera recomendaciones basadas en reglas (fallback si falla la IA)
 */
function generateRuleBasedRecommendations(
  courseMetrics: CourseMetrics,
  studentMetrics: StudentMetrics[]
): AdvisorRecommendation[] {
  const recommendations: AdvisorRecommendation[] = [];

  // Recomendación: Baja participación
  if (courseMetrics.totalStudents > 0) {
    const participationRate = (courseMetrics.activeStudents / courseMetrics.totalStudents) * 100;
    if (participationRate < 30) {
      recommendations.push({
        type: 'engagement',
        priority: 'high',
        title: 'Baja Participación en el Tutor IA',
        description: `Solo el ${participationRate.toFixed(1)}% de los estudiantes han usado el Tutor IA. Esto indica que muchos estudiantes no están aprovechando esta herramienta de aprendizaje.`,
        actionItems: [
          'Anunciar el Tutor IA en clase y explicar sus beneficios',
          'Enviar un aviso a todos los estudiantes sobre cómo usar el tutor',
          'Crear un video tutorial corto sobre el uso del tutor',
          'Incentivar su uso mencionándolo en las sesiones',
        ],
      });
    }
  }

  // Recomendación: Estudiantes que necesitan atención
  if (courseMetrics.studentsNeedingAttention.length > 0) {
    const studentNames = studentMetrics
      .filter(s => courseMetrics.studentsNeedingAttention.includes(s.studentId))
      .map(s => s.studentName)
      .slice(0, 5);

    recommendations.push({
      type: 'student_attention',
      priority: 'high',
      title: `${courseMetrics.studentsNeedingAttention.length} Estudiante(s) Necesitan Atención`,
      description: `Hay ${courseMetrics.studentsNeedingAttention.length} estudiante(s) que requieren seguimiento especial. Algunos no han usado el tutor, otros tienen muchas consultas pero bajo desempeño.`,
      actionItems: [
        'Revisar el desempeño individual de estos estudiantes',
        'Contactar a los estudiantes que no han usado el tutor',
        'Ofrecer sesiones de apoyo adicional para estudiantes con bajo desempeño',
        'Identificar temas problemáticos y reforzarlos',
      ],
      studentIds: courseMetrics.studentsNeedingAttention,
    });
  }

  // Recomendación: Temas más consultados (posibles brechas de contenido)
  if (courseMetrics.topTopics.length > 0) {
    const topTopic = courseMetrics.topTopics[0];
    if (topTopic.count > courseMetrics.averageInteractionsPerStudent * 2) {
      recommendations.push({
        type: 'content_gap',
        priority: 'medium',
        title: `Tema "${topTopic.topic}" Muy Consultado`,
        description: `El tema "${topTopic.topic}" tiene ${topTopic.count} consultas, lo que sugiere que los estudiantes tienen dificultades con este contenido.`,
        actionItems: [
          `Revisar el material del tema "${topTopic.topic}" y mejorarlo`,
          'Crear ejemplos adicionales o ejercicios prácticos',
          'Considerar una sesión de repaso dedicada a este tema',
          'Agregar recursos complementarios (videos, lecturas)',
        ],
      });
    }
  }

  // Recomendación: Optimización de costos
  if (courseMetrics.totalCost > 10) {
    recommendations.push({
      type: 'cost_optimization',
      priority: 'low',
      title: 'Optimización de Costos del Tutor IA',
      description: `El costo total del Tutor IA es $${courseMetrics.totalCost.toFixed(2)}. Considera optimizar el uso para reducir costos sin afectar la experiencia de aprendizaje.`,
      actionItems: [
        'Revisar si hay estudiantes con uso excesivo del tutor',
        'Considerar establecer límites de uso por estudiante',
        'Promover el uso eficiente del tutor (preguntas específicas)',
        'Monitorear costos semanalmente',
      ],
    });
  }

  return recommendations;
}

/**
 * Genera análisis de fallback si falla la IA
 */
function generateFallbackAnalysis(
  courseMetrics: CourseMetrics,
  studentMetrics: StudentMetrics[]
): AdvisorAnalysis {
  const recommendations = generateRuleBasedRecommendations(courseMetrics, studentMetrics);

  return {
    summary: `Análisis del curso "${courseMetrics.courseTitle}". 
    ${courseMetrics.activeStudents} de ${courseMetrics.totalStudents} estudiantes han usado el Tutor IA, 
    con un total de ${courseMetrics.totalInteractions} interacciones. 
    ${courseMetrics.studentsNeedingAttention.length > 0 
      ? `${courseMetrics.studentsNeedingAttention.length} estudiante(s) requieren atención especial.` 
      : 'Todos los estudiantes están participando activamente.'}`,
    keyInsights: [
      `Tasa de participación: ${courseMetrics.totalStudents > 0 
        ? ((courseMetrics.activeStudents / courseMetrics.totalStudents) * 100).toFixed(1) 
        : 0}%`,
      `Promedio de ${courseMetrics.averageInteractionsPerStudent.toFixed(1)} interacciones por estudiante`,
      `Costo total: $${courseMetrics.totalCost.toFixed(2)}`,
    ],
    recommendations,
    trends: {
      participationTrend: 'stable',
      performanceTrend: 'stable',
      costTrend: 'stable',
    },
  };
}

/**
 * Genera recomendaciones específicas para un estudiante
 */
export async function analyzeStudentPerformance(
  studentMetrics: StudentMetrics,
  courseMetrics: CourseMetrics
): Promise<AdvisorRecommendation[]> {
  const recommendations: AdvisorRecommendation[] = [];

  // Sin interacciones
  if (studentMetrics.totalInteractions === 0) {
    recommendations.push({
      type: 'engagement',
      priority: 'high',
      title: 'Estudiante No Ha Usado el Tutor IA',
      description: `${studentMetrics.studentName} aún no ha usado el Tutor IA. Esto puede indicar falta de conocimiento sobre la herramienta o falta de necesidad percibida.`,
      actionItems: [
        'Contactar al estudiante para explicar los beneficios del tutor',
        'Enviar un tutorial sobre cómo usar el tutor',
        'Ofrecer una sesión de demostración',
      ],
      studentIds: [studentMetrics.studentId],
    });
  }

  // Muchas interacciones pero bajo desempeño
  if (
    studentMetrics.totalInteractions > 15 &&
    studentMetrics.performanceImprovement !== null &&
    studentMetrics.performanceImprovement < 0
  ) {
    recommendations.push({
      type: 'student_attention',
      priority: 'high',
      title: 'Estudiante con Muchas Consultas pero Bajo Desempeño',
      description: `${studentMetrics.studentName} ha realizado ${studentMetrics.totalInteractions} consultas pero su desempeño ha disminuido en ${Math.abs(studentMetrics.performanceImprovement).toFixed(1)}%. Esto sugiere que necesita apoyo adicional.`,
      actionItems: [
        'Revisar las preguntas específicas que ha hecho el estudiante',
        'Ofrecer una sesión de tutoría personalizada',
        'Identificar temas donde tiene más dificultades',
        'Considerar recursos adicionales de aprendizaje',
      ],
      studentIds: [studentMetrics.studentId],
    });
  }

  // Sin actividad reciente
  if (studentMetrics.lastInteractionDate) {
    const daysSinceLastInteraction =
      (Date.now() - new Date(studentMetrics.lastInteractionDate).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastInteraction > 7 && studentMetrics.totalInteractions > 0) {
      recommendations.push({
        type: 'engagement',
        priority: 'low',
        title: 'Estudiante Sin Actividad Reciente',
        description: `${studentMetrics.studentName} no ha usado el tutor en ${Math.floor(daysSinceLastInteraction)} días.`,
        actionItems: [
          'Recordar al estudiante sobre la disponibilidad del tutor',
          'Verificar si está progresando bien sin necesidad del tutor',
        ],
        studentIds: [studentMetrics.studentId],
      });
    }
  }

  return recommendations;
}

