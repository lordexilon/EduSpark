/**
 * Textos de la tarjeta «Información general» en vista de curso (CONES/ANEAES).
 * Idioma UI: clave `EDUSPARK_UI_LANG_STORAGE_KEY` + hook `useUiLang` (selector en Header).
 */
import type { Assessment } from '@/services/quizService';

export type CourseViewCardLocale = 'es' | 'gn';

/** Misma clave que `useUiLang` / selector global. */
export const EDUSPARK_UI_LANG_STORAGE_KEY = 'eduspark-ui-lang';

export function getCourseViewCardLocale(): CourseViewCardLocale {
  if (typeof window === 'undefined') return 'es';
  return window.localStorage.getItem(EDUSPARK_UI_LANG_STORAGE_KEY) === 'gn' ? 'gn' : 'es';
}

export const courseViewCardText = {
  es: {
    cardTitle: 'Información general y comunicación',
    schedule: 'Cronograma',
    scheduleEmpty:
      'Las fechas del período pueden cargarse al definir el curso; consultá también el programa o avisos del docente.',
    syllabus: 'Programa / sílabo',
    syllabusHint:
      'El docente puede publicar el programa o guía como material con categoría «sílabo» o «programa»; se listará aquí.',
    objectives: 'Objetivos de aprendizaje (por unidad)',
    objectivesNote: 'Definidos por unidad en la planificación del curso.',
    objectivesEmpty:
      'Aún no hay objetivos cargados en las unidades. El docente puede editarlos en la planificación del curso.',
    evaluation: 'Instrumentos y criterios de evaluación',
    evaluationNote:
      'Resumen de evaluaciones publicadas del curso. El acceso puede depender de fechas y de tu avance en el curso.',
    evaluationEmpty: 'No hay evaluaciones publicadas en este curso todavía.',
    rubricMaterials: 'Rúbricas o criterios (materiales)',
    rubricMaterialsEmpty:
      'Podés cargar rúbricas con categoría «rúbrica» o «criterios» para que aparezcan aquí.',
    communication: 'Comunicación del curso',
    linkAnnouncements: 'Avisos',
    linkForums: 'Foros',
    linkMessages: 'Mensajes',
    unitLabel: 'Unidad',
    contextCourse: 'Todo el curso',
    contextFinal: 'Examen final',
    pointsAbbr: 'pts.',
    minPass: 'Mín. para aprobar',
    loSectionTitle: 'Resultados de aprendizaje',
    loSectionNote:
      'Cada RA se considera evidenciado cuando aprobás al menos una evaluación publicada que el docente vinculó a ese resultado.',
    loEvident: 'Evidenciado',
    loPending: 'Pendiente',
    loTeacherHint:
      'Como docente o administrador, aquí ves los RA del curso; el estado de evidencia lo ven los estudiantes inscritos.',
    typeLabels: {
      quiz: 'Cuestionario',
      trivia: 'Trivia',
      exam: 'Examen',
      project: 'Proyecto',
      assignment: 'Entrega / tarea',
    } as Record<Assessment['assessment_type'], string>,
  },
  gn: {
    cardTitle: 'Marandu ha ñe\'ẽme (mba\'ekuaa ha ñembohovái)',
    schedule: 'Aravo\'apy',
    scheduleEmpty:
      'Aravo\'apy ikatu oje\'e kurso ombo\'ávo; ehecha avei sílabo térã aviso profésor rupi.',
    syllabus: 'Mba\'epu / sílabo',
    syllabusHint:
      'Profesor ikatu omoĩ tembiapo térã guía «sílabo» térã «programa» rupi; opa\'ãmo\'ãva.',
    objectives: 'Mbo\'ehao reko (peteĩ peteĩ yvoty rupi)',
    objectivesNote: 'Yvoty peteĩ peteĩ rupi oje\'e kurso ñembohekópe.',
    objectivesEmpty:
      'Ndaipóri gueteri mbo\'ehao yvoty rupi. Profesor ikatu ombosako\'i kurso ñembohekópe.',
    evaluation: 'Ombopora ha ohechauka',
    evaluationNote:
      'Kurso ombopora opa\'ãva re\'ã. Jeike ikatu odepender aravo\'apy ha ne rembiapo porã.',
    evaluationEmpty: 'Ndaipóri gueteri ombopora ko kurso rupi.',
    rubricMaterials: 'Rúbrica térã mba\'epu (marandu)',
    rubricMaterialsEmpty:
      'Ikatu emoĩ rúbrica «rúbrica» térã «criterios» rupi.',
    communication: 'Ñe\'ẽ kurso rupi',
    linkAnnouncements: 'Je\'e',
    linkForums: 'Foro',
    linkMessages: 'Ñe\'ẽ',
    unitLabel: 'Yvoty',
    contextCourse: 'Opaite kurso',
    contextFinal: 'Opa\'ã porã',
    pointsAbbr: 'mb.',
    minPass: 'Mín. oñeme\'ẽ hag̃ua',
    loSectionTitle: 'Mba\'epu reko (mba\'ehao)',
    loSectionNote:
      'RA peteĩ peteĩ ojehechauka eme\'ẽ vorentã ombopora opa\'ãva profésor ojuaju hague ko mba\'epurã.',
    loEvident: 'Ojehecha',
    loPending: 'O\'u hína',
    loTeacherHint:
      'Profesor térã admin rupi, ehecha RA kurso rupi; mba\'e ojehecha opo\'ytyrã ohecha estudiante oje\'e\'áva.',
    typeLabels: {
      quiz: 'Porandu',
      trivia: 'Trivia',
      exam: 'Opa\'ã',
      project: 'Tembiapo',
      assignment: 'Me\'ẽ',
    } as Record<Assessment['assessment_type'], string>,
  },
} as const;

/** Dashboard estudiante (resumen RA, etc.) — par es/gn con `useUiLang`. */
export const dashboardStudentText = {
  es: {
    loDashboardTitle: 'Resultados de aprendizaje',
    loDashboardSubtitle:
      'Progreso por curso según evaluaciones vinculadas por tu docente.',
    loDashboardEvidencedSuffix: 'evidenciados',
    loDashboardLink: 'Ver detalle en el curso',
    courseFallback: 'Curso',
  },
  gn: {
    loDashboardTitle: 'Mba\'epu reko (mba\'ehao)',
    loDashboardSubtitle:
      'Kurso peteĩ peteĩ rembiapo ombopora profésor ojuaju hague.',
    loDashboardEvidencedSuffix: 'ojehecháva',
    loDashboardLink: 'Ehecha kurso rupi',
    courseFallback: 'Kurso',
  },
} as const;

export function assessmentTypeLabel(
  type: Assessment['assessment_type'],
  loc: CourseViewCardLocale
): string {
  const labels = courseViewCardText[loc].typeLabels;
  return labels[type] ?? type;
}
