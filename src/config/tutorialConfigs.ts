/**
 * Configuraciones de tutoriales interactivos
 * Define los pasos y objetivos para cada tutorial
 */

import type { TutorialConfig } from '@/services/tutorialService';

/**
 * Tutorial para la vista del curso
 */
export const courseViewTutorial: TutorialConfig = {
  id: 'course-view',
  name: 'Tutorial: Cómo Usar el Curso',
  description: 'Aprende a navegar y usar todas las funcionalidades del curso',
  steps: [
    {
      id: 'welcome',
      target: 'body',
      title: '¡Bienvenido al Curso!',
      content: 'Este tutorial te guiará paso a paso para aprovechar al máximo todas las funcionalidades del curso.\n\nVerás cómo navegar por las unidades, acceder a materiales, completar sesiones y mucho más.',
      position: 'center'
    },
    {
      id: 'course-header',
      target: '[data-tutorial="course-header"]',
      title: 'Información del Curso',
      content: 'Aquí puedes ver la información general del curso: nombre, descripción, materia y carrera.\n\nTambién verás tu progreso general del curso.',
      position: 'bottom'
    },
    {
      id: 'units-section',
      target: '[data-tutorial="units-section"]',
      title: 'Unidades del Curso',
      content: 'Las unidades organizan el contenido del curso. Cada unidad contiene varias sesiones.\n\nHaz clic en una unidad para expandirla y ver sus sesiones.',
      position: 'bottom',
      action: 'wait'
    },
    {
      id: 'expand-unit',
      target: '[data-tutorial="unit-item"]:first-child',
      title: 'Expandir una Unidad',
      content: 'Haz clic en el nombre de la unidad o en la flecha para expandirla y ver todas sus sesiones.\n\nLas unidades se pueden expandir y contraer según necesites.',
      position: 'bottom',
      action: 'click',
      actionTarget: '[data-tutorial="unit-item"]:first-child',
      actionDelay: 500
    },
    {
      id: 'session-item',
      target: '[data-tutorial="session-item"]:first-child',
      title: 'Sesiones',
      content: 'Cada sesión contiene el contenido de aprendizaje. Haz clic en una sesión para abrirla y ver su contenido.\n\nVerás un check verde cuando hayas completado una sesión.',
      position: 'bottom'
    },
    {
      id: 'materials-section',
      target: '[data-tutorial="materials-section"]',
      title: 'Materiales del Curso',
      content: 'En esta sección encontrarás todos los materiales del curso: videos, PDFs, enlaces y más.\n\nPuedes buscar, filtrar y ordenar los materiales según tus necesidades.',
      position: 'top'
    },
    {
      id: 'material-filters',
      target: '[data-tutorial="material-filters"]',
      title: 'Buscar y Filtrar Materiales',
      content: 'Usa el campo de búsqueda para encontrar materiales por nombre.\n\nTambién puedes filtrar por tipo (videos, PDFs, enlaces) y por categorías o hashtags.',
      position: 'bottom'
    },
    {
      id: 'evaluations-section',
      target: '[data-tutorial="evaluations-section"]',
      title: 'Evaluaciones',
      content: 'Aquí encontrarás todas las evaluaciones del curso: quizzes, trivias, exámenes parciales y el examen final.\n\nHaz clic en una evaluación para tomarla.',
      position: 'top'
    },
    {
      id: 'tutor-button',
      target: '[data-tutorial="tutor-button"]',
      title: 'Tutor AI',
      content: '¿Tienes dudas? Haz clic aquí para abrir el Tutor AI, tu asistente inteligente disponible 24/7.\n\nEl Tutor puede responder preguntas sobre el contenido del curso usando información de tus materiales.',
      position: 'left'
    },
    {
      id: 'progress-indicator',
      target: '[data-tutorial="progress-indicator"]',
      title: 'Tu Progreso',
      content: 'Aquí puedes ver tu progreso en el curso: porcentaje completado, sesiones completadas y más.\n\nMantente al día revisando tu progreso regularmente.',
      position: 'bottom'
    },
    {
      id: 'complete',
      target: 'body',
      title: '¡Tutorial Completado!',
      content: 'Ya conoces todas las funcionalidades principales del curso.\n\n¡Ahora estás listo para comenzar a aprender! Si necesitas ayuda, siempre puedes consultar al Tutor AI.',
      position: 'center'
    }
  ]
};

/**
 * Tutorial para el Tutor AI
 */
export const tutorAITutorial: TutorialConfig = {
  id: 'tutor-ai',
  name: 'Tutorial: Cómo Usar el Tutor AI',
  description: 'Aprende a usar el Tutor AI para resolver tus dudas',
  steps: [
    {
      id: 'welcome',
      target: 'body',
      title: '¡Bienvenido al Tutor AI!',
      content: 'El Tutor AI es tu asistente inteligente disponible 24/7. Puede responder preguntas sobre el contenido de tu curso usando información de tus materiales.\n\nEste tutorial te mostrará cómo usarlo efectivamente.',
      position: 'center'
    },
    {
      id: 'course-selector',
      target: '[data-tutorial="course-selector"]',
      title: 'Seleccionar Curso',
      content: 'Si tienes múltiples cursos, selecciona el curso sobre el cual quieres hacer preguntas.\n\nEl Tutor usará el contenido de ese curso específico para responder.',
      position: 'bottom'
    },
    {
      id: 'input-field',
      target: '[data-tutorial="tutor-input"]',
      title: 'Campo de Pregunta',
      content: 'Escribe aquí tu pregunta sobre el contenido del curso.\n\nSé específico: en lugar de "Explícame esto", pregunta "¿Qué es un balance general?"',
      position: 'top'
    },
    {
      id: 'voice-button',
      target: '[data-tutorial="voice-button"]',
      title: 'Entrada por Voz',
      content: 'Haz clic en el ícono del micrófono para hacer preguntas hablando en lugar de escribir.\n\nEl sistema transcribirá tu voz automáticamente.',
      position: 'left'
    },
    {
      id: 'send-button',
      target: '[data-tutorial="send-button"]',
      title: 'Enviar Pregunta',
      content: 'Haz clic aquí o presiona Enter para enviar tu pregunta.\n\nEl Tutor procesará tu pregunta y te dará una respuesta basada en el contenido de tu curso.',
      position: 'top'
    },
    {
      id: 'response-area',
      target: '[data-tutorial="response-area"]',
      title: 'Respuestas del Tutor',
      content: 'Aquí verás las respuestas del Tutor. Cada respuesta incluye:\n\n• Explicación detallada\n• Ejemplos prácticos (si están disponibles)\n• Enlaces a fuentes donde se explica el tema',
      position: 'top'
    },
    {
      id: 'sources-button',
      target: '[data-tutorial="sources-button"]',
      title: 'Ver Fuentes',
      content: 'Haz clic en "Ver fuentes" para ver de dónde viene la información que el Tutor usó para responder.\n\nPuedes hacer clic en las fuentes para ir directamente a ese material, unidad o sesión.',
      position: 'top'
    },
    {
      id: 'rating-buttons',
      target: '[data-tutorial="rating-buttons"]',
      title: 'Calificar Respuestas',
      content: 'Usa los botones de pulgar arriba (👍) o pulgar abajo (👎) para calificar las respuestas.\n\nEsto ayuda a mejorar el sistema y le da feedback a tu docente.',
      position: 'top'
    },
    {
      id: 'settings-button',
      target: '[data-tutorial="settings-button"]',
      title: 'Configuración',
      content: 'Haz clic aquí para personalizar cómo funciona el Tutor:\n\n• Nivel de explicación\n• Estilo de respuesta\n• Configuración de audio\n• Selección de curso',
      position: 'left'
    },
    {
      id: 'complete',
      target: 'body',
      title: '¡Tutorial Completado!',
      content: 'Ya sabes cómo usar el Tutor AI.\n\n¡Haz preguntas cuando tengas dudas! El Tutor está disponible 24/7 para ayudarte.',
      position: 'center'
    }
  ]
};

/**
 * Tutorial de bienvenida para el dashboard
 */
export const welcomeTutorial: TutorialConfig = {
  id: 'welcome',
  name: 'Tutorial: Bienvenida a EduSpark',
  description: 'Conoce las funcionalidades principales de EduSpark',
  steps: [
    {
      id: 'welcome',
      target: 'body',
      title: '¡Bienvenido a EduSpark! 🎓',
      content: 'Te damos la bienvenida a tu plataforma de aprendizaje inteligente.\n\nEste tutorial rápido te mostrará las funcionalidades principales para que puedas aprovechar al máximo tu experiencia de aprendizaje.',
      position: 'center'
    },
    {
      id: 'dashboard-overview',
      target: '[data-tutorial="dashboard-overview"]',
      title: 'Tu Dashboard',
      content: 'Aquí puedes ver un resumen de tu progreso:\n\n• Tus cursos activos\n• Tareas pendientes\n• Progreso semanal\n• Próximas actividades\n\nRevisa esta página regularmente para mantenerte al día.',
      position: 'bottom'
    },
    {
      id: 'courses-section',
      target: '[data-tutorial="courses-section"]',
      title: 'Mis Cursos',
      content: 'Aquí verás todos los cursos en los que estás inscrito.\n\nHaz clic en un curso para acceder a su contenido, materiales y evaluaciones.',
      position: 'top'
    },
    {
      id: 'sidebar-menu',
      target: '[data-tutorial="sidebar-menu"]',
      title: 'Menú de Navegación',
      content: 'Usa el menú lateral para acceder a:\n\n• Aprendizaje: Clases, Tutor IA, Flashcards\n• Evaluaciones: Tareas y Calificaciones\n• Comunicación: Avisos, Foros, Mensajería\n• Tutoriales: Aprende a usar la plataforma',
      position: 'right'
    },
    {
      id: 'tutor-link',
      target: '[data-tutorial="tutor-link"]',
      title: 'Tutor IA',
      content: '¿Tienes dudas? El Tutor IA está disponible 24/7 para ayudarte.\n\nPuede responder preguntas sobre el contenido de tus cursos usando información de tus materiales.',
      position: 'left'
    },
    {
      id: 'complete',
      target: 'body',
      title: '¡Listo para Empezar!',
      content: 'Ya conoces lo básico de EduSpark.\n\n¡Explora tus cursos y comienza a aprender! Si necesitas ayuda, siempre puedes consultar los tutoriales desde el menú.',
      position: 'center'
    }
  ]
};

/**
 * Mapeo de tutoriales por ID
 */
export const tutorialConfigs: Record<string, TutorialConfig> = {
  'welcome': welcomeTutorial,
  'course-view': courseViewTutorial,
  'tutor-ai': tutorAITutorial
};

/**
 * Obtiene la configuración de un tutorial por ID
 */
export function getTutorialConfig(tutorialId: string): TutorialConfig | null {
  return tutorialConfigs[tutorialId] || null;
}

