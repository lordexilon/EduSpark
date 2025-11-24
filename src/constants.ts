import React from 'react';
import { ModuleInfo, CourseSession, ActivityType, Assignment } from './types.ts';
// FIX: Import icons needed for ACTIVITY_TYPE_DETAILS
import {
    IconBookOpen,
    IconChatAlt2,
    IconClipboardList,
    IconClock,
    IconCog,
    IconInfoCircle,
    IconPencil,
    IconTrophy,
    IconUser,
    IconBriefcase,
    IconChartBar,
    IconClipboardCheck,
    IconCheckCircle
} from './components/Icons.tsx';

export const MODULE_INFO: ModuleInfo = {
  name: "Ética Profesional",
  career: "Lic. en Análisis de Sistemas Informáticos",
  university: "Tecnológica Intercontinental (UTIC)",
  workload: "30 horas",
  sessionsCount: 10,
  sessionDuration: "3 horas"
};

export let SESSIONS_DATA: CourseSession[] = [ // Changed to let for mock updates
  {
    id: "clase-1",
    number: 1,
    date: "Lunes, 23/06/25",
    title: "Introducción a la Ética Profesional",
    objective: "Comprender la importancia de la ética en el ámbito profesional.",
    googleMeetLink: "https://meet.google.com/xyz-abcd-efg",
    blocks: [
      {
        timeRange: "(0-20 min)",
        title: "Bienvenida y Encuadre del Módulo",
        activities: [
          { type: ActivityType.PRESENTATION, title: "Presentación del docente y de los estudiantes." },
          { type: ActivityType.EXPOSITION, title: "Exposición del plan de estudios, metodología, recursos y sistema de evaluación (Examen Parcial y Final)." }
        ]
      },
      {
        timeRange: "(20-80 min)",
        title: "Bloque Teórico I: Fundamentos Conceptuales",
        activities: [
          { type: ActivityType.DEFINITION, title: "Definición de Ética", description: "Origen (griego ethos). Se define como la disciplina filosófica que reflexiona sobre los fundamentos de la conducta moral." },
          { type: ActivityType.DEFINITION, title: "Definición de Moral", description: "Origen (latín mos). Es el conjunto de normas y creencias de una sociedad que guían la conducta." },
          { type: ActivityType.DEFINITION, title: "Definición de Deontología", description: "Es la ética aplicada a una profesión, centrada en los deberes y códigos de conducta." }
        ]
      },
      { timeRange: "(80-90 min)", title: "Descanso.", activities: [{ type: ActivityType.BREAK, title: "Pausa programada" }] },
      {
        timeRange: "(90-160 min)",
        title: "Bloque Práctico: Dilemas Éticos en Informática",
        activities: [
          { type: ActivityType.DISCUSSION, title: "Relación Ética-Profesión", description: "Se discute el impacto social del Analista de Sistemas y la responsabilidad que conlleva." },
          { type: ActivityType.ACTIVITY, title: "Actividad: Debate en grupos sobre casos prácticos", description: "Un analista descubre una falla de seguridad pero su jefe le ordena ocultarla para cumplir una fecha de entrega; se le pide implementar un algoritmo que genere adicción en usuarios. Los grupos analizan los valores en conflicto, los afectados y las posibles acciones." }
        ]
      },
      {
        timeRange: "(160-180 min)",
        title: "Cierre y Reflexión",
        activities: [
          { type: ActivityType.SUMMARY, title: "Resumen de los conceptos clave." },
          { type: ActivityType.PREVIEW, title: "Adelanto de la siguiente clase." }
        ]
      }
    ]
  },
  {
    id: "clase-2",
    number: 2,
    date: "Martes, 24/06/25",
    title: "Valores Morales y Éticos en la Profesión",
    objective: "Identificar los valores esenciales para el ejercicio profesional.",
    googleMeetLink: "https://meet.google.com/qwe-rty-uio",
    blocks: [
      { timeRange: "(0-15 min)", title: "Inicio y Repaso.", activities: [{ type: ActivityType.RECAP, title: "Repaso de la sesión anterior." }] },
      {
        timeRange: "(15-75 min)",
        title: "Bloque Teórico I: El Mundo de los Valores",
        activities: [
          { type: ActivityType.DEFINITION, title: "Valores Morales y Éticos: Definición y tipos.", description: "Se profundiza en valores clave para el analista: Honestidad, Integridad, Responsabilidad, Confidencialidad y Competencia Profesional." }
        ]
      },
      { timeRange: "(75-90 min)", title: "Descanso.", activities: [{ type: ActivityType.BREAK, title: "Pausa programada" }] },
      {
        timeRange: "(90-165 min)",
        title: "Bloque Teórico y Práctico II: La Conciencia Moral",
        activities: [
          { type: ActivityType.EXPOSITION, title: "Conciencia y desarrollo moral", description: "Se explican las etapas del desarrollo moral para entender la evolución del razonamiento ético." },
          { type: ActivityType.ACTIVITY, title: "Actividad: Reflexión grupal.", description: "Los equipos seleccionan y jerarquizan los 5 valores más importantes para su profesión, justificando la elección con ejemplos de situaciones laborales." }
        ]
      },
      { timeRange: "(165-180 min)", title: "Cierre y Conclusiones.", activities: [{ type: ActivityType.SUMMARY, title: "Resumen y conclusiones de la sesión." }] }
    ]
  },
  {
    id: "clase-3",
    number: 3,
    date: "Miércoles, 25/06/25",
    title: "Problemas Éticos en la Sociedad Actual",
    objective: "Analizar los efectos de la corrupción, impunidad y falta de ética en la sociedad.",
    blocks: [
      { timeRange: "(0-15 min)", title: "Inicio y conexión con tema anterior.", activities: [{ type: ActivityType.RECAP, title: "Conexión con temas anteriores." }] },
      {
        timeRange: "(15-75 min)",
        title: "Bloque Teórico: Corrupción y sus Efectos",
        activities: [
          { type: ActivityType.DEFINITION, title: "Problemas Éticos en la Sociedad", description: "Se definen la corrupción y la impunidad, analizando su impacto en el desarrollo y la confianza pública. Se discuten ejemplos locales y globales." }
        ]
      },
      { timeRange: "(75-90 min)", title: "Descanso.", activities: [{ type: ActivityType.BREAK, title: "Pausa programada" }] },
      {
        timeRange: "(90-165 min)",
        title: "Bloque Práctico: Análisis de Casos",
        activities: [
          { type: ActivityType.ACTIVITY, title: "Actividad: Análisis de caso de estudio", description: "Se analiza un caso de estudio detallado sobre un escándalo de corrupción en la adjudicación de un contrato tecnológico gubernamental. Los estudiantes deben identificar las fallas éticas, los actores involucrados y proponer medidas de control y transparencia para prevenirlo." }
        ]
      },
      {
        timeRange: "(165-180 min)",
        title: "Cierre y Reflexión",
        activities: [
          { type: ActivityType.DEBATE, title: "Debate: Rol del profesional informático", description: "Se debate el rol del profesional informático como agente de cambio para la integridad." }
        ]
      }
    ]
  },
  {
    id: "clase-4",
    number: 4,
    date: "Jueves, 26/06/25",
    title: "Ética en la Informática y las Telecomunicaciones",
    objective: "Comprender el impacto de la tecnología en la ética profesional.",
    googleMeetLink: "https://meet.google.com/zxc-vbn-mlk",
    blocks: [
      { timeRange: "(0-15 min)", title: "Inicio y Repaso.", activities: [{ type: ActivityType.RECAP, title: "Repaso de la sesión anterior." }] },
      {
        timeRange: "(15-75 min)",
        title: "Bloque Teórico: Desafíos Éticos Digitales",
        activities: [
          { type: ActivityType.DEBATE, title: "Ética en el Teletrabajo", description: "Debate sobre software de monitoreo vs. derecho a la privacidad del empleado." },
          { type: ActivityType.DATA_PROTECTION_DISCUSSION, title: "Protección de Datos", description: "La responsabilidad ética de implementar \"Privacidad por Diseño\" en los sistemas." },
          { type: ActivityType.DIGITAL_RESPONSIBILITY, title: "Responsabilidad Digital", description: "El papel del analista en la creación de sistemas que combaten la desinformación." }
        ]
      },
      { timeRange: "(75-90 min)", title: "Descanso.", activities: [{ type: ActivityType.BREAK, title: "Pausa programada" }] },
      {
        timeRange: "(90-165 min)",
        title: "Bloque Práctico: Casos de Violación Ética",
        activities: [
          { type: ActivityType.ACTIVITY, title: "Actividad: Presentación de noticias", description: "Los estudiantes presentan noticias recientes sobre violaciones de datos o mal uso de la tecnología, explicando las fallas técnicas y éticas que las permitieron." }
        ]
      },
      { timeRange: "(165-180 min)", title: "Cierre y Conclusiones.", activities: [{ type: ActivityType.SUMMARY, title: "Resumen y conclusiones de la sesión." }] }
    ]
  },
  {
    id: "clase-5",
    number: 5,
    date: "Lunes, 30/06/25",
    title: "Deontología Profesional e Informática y Examen Parcial",
    objective: "Conocer los principios de la deontología profesional y evaluar la primera mitad del módulo.",
    blocks: [
      {
        timeRange: "(0-60 min)",
        title: "Bloque Teórico y Práctico: Códigos Deontológicos",
        activities: [
          { type: ActivityType.DEONTOLOGICAL_CODES_REVIEW, title: "Deontología Profesional", description: "Se analizan los códigos de ética de asociaciones profesionales (ej. ACM, IEEE), enfocándose en sus principios rectores." },
          { type: ActivityType.ACTIVITY, title: "Actividad: Creación de decálogo personal", description: "Creación de un decálogo o código de ética personal que cada estudiante se compromete a seguir en su futura vida profesional." }
        ]
      },
      { timeRange: "(60-75 min)", title: "Repaso y Consultas para el Examen.", activities: [{ type: ActivityType.EXAM_REVIEW, title: "Sesión de repaso y dudas." }] },
      { timeRange: "(75-90 min)", title: "Descanso.", activities: [{ type: ActivityType.BREAK, title: "Pausa programada" }] },
      { timeRange: "(90-165 min)", title: "Examen Parcial.", activities: [{ type: ActivityType.PARTIAL_EXAM, title: "Realización del Examen Parcial." }] },
      { timeRange: "(165-180 min)", title: "Cierre y Feedback.", activities: [{ type: ActivityType.FEEDBACK_SESSION, title: "Comentarios sobre el examen y la primera mitad del curso." }] }
    ]
  },
  {
    id: "clase-6",
    number: 6,
    date: "Martes, 01/07/25",
    title: "Normativas y Regulaciones Éticas",
    objective: "Estudiar el contexto nacional y normativas vigentes.",
    blocks: [
      {
        timeRange: "(0-60 min)",
        title: "Bloque Teórico: Marco Legal Paraguayo",
        activities: [
          { type: ActivityType.LEGAL_FRAMEWORK_REVIEW, title: "Plan Nacional de Integridad (CISNI)", description: "Se explica su propósito y cómo se relaciona con la profesión." },
          { type: ActivityType.LEGAL_FRAMEWORK_REVIEW, title: "Leyes de Protección de Datos", description: "Se estudia la Ley N° 6534/20 de Protección de Datos Personales, explicando los derechos de los ciudadanos y los deberes de las empresas y profesionales." }
        ]
      },
      { timeRange: "(60-75 min)", title: "Descanso.", activities: [{ type: ActivityType.BREAK, title: "Pausa programada" }] },
      {
        timeRange: "(75-165 min)",
        title: "Bloque Práctico: Derecho Comparado",
        activities: [
          { type: ActivityType.ACTIVITY, title: "Actividad: Análisis comparativo.", description: "Los estudiantes, en grupos, comparan la ley paraguaya de protección de datos con el GDPR europeo, identificando fortalezas, debilidades y el impacto práctico para un analista de sistemas." }
        ]
      },
      {
        timeRange: "(165-180 min)",
        title: "Cierre y Debate",
        activities: [
          { type: ActivityType.DEBATE, title: "¿Es suficiente la legislación actual para enfrentar los desafíos tecnológicos?" }
        ]
      }
    ]
  },
  {
    id: "clase-7",
    number: 7,
    date: "Miércoles, 02/07/25",
    title: "Valores Humanos y Ejercicio Profesional",
    objective: "Reflexionar sobre el papel de los valores en la excelencia profesional.",
    blocks: [
      {
        timeRange: "(0-60 min)",
        title: "Bloque Teórico: Ética como Estrategia",
        activities: [
          { type: ActivityType.STRATEGIC_ETHICS_PLANNING, title: "Planificación estratégica y Calidad Total", description: "Se argumenta cómo una cultura ética es un pilar para la calidad, la sostenibilidad y la buena reputación de una empresa tecnológica." },
          { type: ActivityType.TRANSFORMATIONAL_LEADERSHIP, title: "Liderazgo Transformacional", description: "Se define el líder ético como aquel que inspira y promueve un ambiente de integridad en su equipo." }
        ]
      },
      { timeRange: "(60-75 min)", title: "Descanso.", activities: [{ type: ActivityType.BREAK, title: "Pausa programada" }] },
      {
        timeRange: "(75-165 min)",
        title: "Bloque Práctico: Simulación de Decisión",
        activities: [
          { type: ActivityType.ACTIVITY, title: "Actividad: Simulación de un comité de crisis.", description: "Un equipo de desarrollo debe decidir si lanzar un producto con una vulnerabilidad conocida para cumplir una fecha de entrega o asumir el costo del retraso. Los grupos deben tomar y justificar su decisión." }
        ]
      },
      { timeRange: "(165-180 min)", title: "Cierre y Reflexión sobre la Simulación.", activities: [{ type: ActivityType.SUMMARY, title: "Conclusiones de la simulación." }] }
    ]
  },
  {
    id: "clase-8",
    number: 8,
    date: "Jueves, 03/07/25",
    title: "Ética y Emprendimiento",
    objective: "Fomentar la autogestión y responsabilidad ética en proyectos.",
    blocks: [
      {
        timeRange: "(0-60 min)",
        title: "Bloque Teórico: Ética desde la Creación",
        activities: [
          { type: ActivityType.INNOVATION_ETHICS, title: "Ética en la Innovación", description: "Se discute la responsabilidad del emprendedor tecnológico sobre el impacto social de su creación." },
          { type: ActivityType.TECH_BUSINESS_ETHICS, title: "Negocios Tecnológicos", description: "Se abordan temas como la competencia leal, la transparencia con los inversores y la publicidad honesta." }
        ]
      },
      { timeRange: "(60-75 min)", title: "Descanso.", activities: [{ type: ActivityType.BREAK, title: "Pausa programada" }] },
      {
        timeRange: "(75-165 min)",
        title: "Bloque Práctico: Creando una Empresa Ética",
        activities: [
          { type: ActivityType.ACTIVITY, title: "Actividad: Diseño de 'Código de Ética Fundacional'", description: "Los equipos diseñan el \"Código de Ética Fundacional\" para una startup tecnológica ficticia. Deben definir la misión, visión, valores y políticas éticas para con sus clientes, empleados y la sociedad." }
        ]
      },
      { timeRange: "(165-180 min)", title: "Cierre y Presentación de Códigos.", activities: [{type: ActivityType.PRESENTATION, title: "Presentación de los códigos de ética."}]}
    ]
  },
  {
    id: "clase-9",
    number: 9,
    date: "Lunes, 07/07/25",
    title: "Ética en el Ámbito Tecnológico",
    objective: "Valorar la ética en el desarrollo y aplicación de tecnologías emergentes.",
    blocks: [
      {
        timeRange: "(0-75 min)",
        title: "Bloque Teórico: Fronteras de la Ética",
        activities: [
          { type: ActivityType.AI_ETHICS_ANALYSIS, title: "Inteligencia Artificial", description: "Se analiza el problema de los sesgos algorítmicos (discriminación) y la \"caja negra\" de las decisiones de la IA." },
          { type: ActivityType.PRIVACY_CYBERSECURITY_DEBATE, title: "Privacidad y Ciberseguridad", description: "Se debaten los límites éticos de la recolección de datos y las prácticas de \"hacking ético\"." }
        ]
      },
      { timeRange: "(75-90 min)", title: "Descanso.", activities: [{ type: ActivityType.BREAK, title: "Pausa programada" }] },
      {
        timeRange: "(90-165 min)",
        title: "Bloque Práctico: Mesa de Debate",
        activities: [
          { type: ActivityType.ACTIVITY, title: "Actividad: Mesa de debate con roles", description: "Se organiza una mesa de debate con roles sobre la regulación de la Inteligencia Artificial. ¿Debería tener límites? ¿Quién es responsable si una IA causa daño?" }
        ]
      },
      { timeRange: "(165-180 min)", title: "Cierre y Síntesis del Debate.", activities: [{type: ActivityType.SUMMARY, title: "Síntesis de los puntos clave del debate."}]}
    ]
  },
  {
    id: "clase-10",
    number: 10,
    date: "Martes, 08/07/25",
    title: "Examen Final",
    objective: "Medir la comprensión y aplicación de los conceptos abordados.",
    blocks: [
      {
        timeRange: "(0-60 min)",
        title: "Repaso General y Sesión de Consultas",
        activities: [
          { type: ActivityType.EXAM_REVIEW, title: "El docente realiza un recorrido por todos los temas del módulo, resolviendo dudas finales de los estudiantes." }
        ]
      },
      { timeRange: "(60-75 min)", title: "Instrucciones para el Examen.", activities: [{ type: ActivityType.EXAM_INSTRUCTIONS, title: "Instrucciones detalladas para el examen final." }] },
      { timeRange: "(75-90 min)", title: "Descanso.", activities: [{ type: ActivityType.BREAK, title: "Pausa programada" }] },
      {
        timeRange: "(90-165 min)",
        title: "Examen Final Teórico-Práctico.",
        activities: [
          { type: ActivityType.FINAL_EXAM, title: "Realización del Examen Final.", description: "La evaluación incluirá preguntas conceptuales y el análisis de un caso práctico que integre varios de los temas vistos." }
        ]
      },
      {
        timeRange: "(165-180 min)",
        title: "Cierre del Módulo",
        activities: [
          { type: ActivityType.MODULE_CLOSURE, title: "Palabras finales, feedback y cierre formal del curso." }
        ]
      }
    ]
  }
];

export const ASSIGNMENTS_DATA: Assignment[] = [
    {
        id: 'assign1',
        title: 'Análisis de Caso Ético: Falla de Seguridad',
        description: 'Analice el caso de estudio proporcionado sobre la falla de seguridad en la empresa "Innovatech". Identifique los dilemas éticos, los stakeholders afectados y proponga un plan de acción siguiendo los principios deontológicos vistos en clase. El documento debe tener una extensión máxima de 3 páginas.',
        dueDate: '28/06/25',
        status: 'Pendiente',
        submissions: []
    },
    {
        id: 'assign2',
        title: 'Creación de Código de Ética Personal',
        description: 'Elabore un decálogo o código de ética personal que guiará su actuación como futuro profesional de sistemas. Justifique cada punto con ejemplos prácticos y relaciónelo con los valores discutidos en la Clase 2.',
        dueDate: '05/07/25',
        status: 'Pendiente',
        submissions: []
    },
    {
        id: 'assign3',
        title: 'Diseño de Código Ética Fundacional para Startup',
        description: 'En equipos, diseñen el "Código de Ética Fundacional" para una startup tecnológica ficticia. Definan misión, visión, valores y políticas éticas claras para clientes, empleados y la sociedad.',
        dueDate: '12/07/25',
        status: 'No Iniciado',
        submissions: [
            {
                id: 'sub1',
                submittedAt: '2025-07-11T14:30:00Z',
                status: 'graded',
                fileName: 'Codigo_Etico_Startup_Grupo_A.pdf',
                fileUrl: '#',
                grade: 'A-',
                feedback: 'Excelente trabajo en la definición de valores. La sección de políticas para empleados podría ser más específica en cuanto a la privacidad de datos. Buen análisis general.'
            }
        ]
    },
];

// FIX: Add ACTIVITY_TYPE_DETAILS to provide metadata for activity types.
export const ACTIVITY_TYPE_DETAILS: { [key in ActivityType]: { name: string; description: string; icon: React.FC<any> } } = {
  [ActivityType.NONE]: { name: 'Sin especificar', description: 'Actividad sin tipo definido.', icon: IconInfoCircle },
  [ActivityType.PRESENTATION]: { name: 'Presentación', description: 'El docente o los estudiantes presentan un tema.', icon: IconUser },
  [ActivityType.EXPOSITION]: { name: 'Exposición', description: 'Exposición detallada de un tema por parte del docente.', icon: IconBookOpen },
  [ActivityType.DEFINITION]: { name: 'Definición', description: 'Se definen y explican conceptos clave.', icon: IconInfoCircle },
  [ActivityType.DISCUSSION]: { name: 'Discusión', description: 'Intercambio de ideas y opiniones sobre un tema.', icon: IconChatAlt2 },
  [ActivityType.BREAK]: { name: 'Descanso', description: 'Pausa programada durante la sesión.', icon: IconClock },
  [ActivityType.PRACTICAL_DILEMMAS]: { name: 'Dilemas Prácticos', description: 'Análisis y resolución de casos prácticos y dilemas éticos.', icon: IconChartBar },
  [ActivityType.SUMMARY]: { name: 'Resumen', description: 'Síntesis de los puntos más importantes de la sesión.', icon: IconClipboardList },
  [ActivityType.PREVIEW]: { name: 'Adelanto', description: 'Vista previa de los temas de la próxima sesión.', icon: IconBookOpen },
  [ActivityType.RECAP]: { name: 'Repaso', description: 'Revisión de los conceptos vistos en la sesión anterior.', icon: IconBookOpen },
  [ActivityType.GROUP_REFLECTION]: { name: 'Reflexión Grupal', description: 'Actividad para que los grupos reflexionen y compartan sus conclusiones.', icon: IconChatAlt2 },
  [ActivityType.CASE_ANALYSIS]: { name: 'Análisis de Caso', description: 'Estudio y análisis detallado de un caso de estudio.', icon: IconChartBar },
  [ActivityType.DEBATE]: { name: 'Debate', description: 'Discusión formal y estructurada sobre un tema polémico.', icon: IconChatAlt2 },
  [ActivityType.DATA_PROTECTION_DISCUSSION]: { name: 'Discusión sobre Protección de Datos', description: 'Debate centrado en las implicaciones éticas y legales de la protección de datos.', icon: IconChatAlt2 },
  [ActivityType.DIGITAL_RESPONSIBILITY]: { name: 'Responsabilidad Digital', description: 'Análisis de la responsabilidad ética en el entorno digital.', icon: IconBriefcase },
  [ActivityType.VIOLATION_CASES_PRESENTATION]: { name: 'Presentación de Casos de Violación', description: 'Exposición de casos reales de violaciones éticas o de seguridad.', icon: IconUser },
  [ActivityType.DEONTOLOGICAL_CODES_REVIEW]: { name: 'Revisión de Códigos Deontológicos', description: 'Estudio y análisis de códigos de ética profesionales.', icon: IconBookOpen },
  [ActivityType.PERSONAL_CODE_CREATION]: { name: 'Creación de Código Personal', description: 'Actividad práctica para que los estudiantes elaboren su propio código de ética.', icon: IconPencil },
  [ActivityType.EXAM_REVIEW]: { name: 'Repaso para Examen', description: 'Sesión dedicada a repasar contenidos y resolver dudas antes de un examen.', icon: IconClipboardList },
  [ActivityType.PARTIAL_EXAM]: { name: 'Examen Parcial', description: 'Evaluación de los conocimientos adquiridos en la primera mitad del módulo.', icon: IconClipboardCheck },
  [ActivityType.FINAL_EXAM]: { name: 'Examen Final', description: 'Evaluación final que abarca todos los contenidos del módulo.', icon: IconTrophy },
  [ActivityType.FEEDBACK_SESSION]: { name: 'Sesión de Feedback', description: 'Espacio para dar y recibir retroalimentación sobre el curso o las evaluaciones.', icon: IconChatAlt2 },
  [ActivityType.LEGAL_FRAMEWORK_REVIEW]: { name: 'Revisión del Marco Legal', description: 'Estudio de las leyes y normativas relevantes para la profesión.', icon: IconBookOpen },
  [ActivityType.COMPARATIVE_LAW_ANALYSIS]: { name: 'Análisis de Derecho Comparado', description: 'Comparación de marcos legales de diferentes regiones o países.', icon: IconChartBar },
  [ActivityType.STRATEGIC_ETHICS_PLANNING]: { name: 'Planificación Ética Estratégica', description: 'Desarrollo de planes y estrategias con un enfoque ético.', icon: IconCog },
  [ActivityType.TRANSFORMATIONAL_LEADERSHIP]: { name: 'Liderazgo Transformacional', description: 'Estudio de modelos de liderazgo que promueven la ética y la integridad.', icon: IconUser },
  [ActivityType.DECISION_SIMULATION]: { name: 'Simulación de Decisión', description: 'Actividad práctica que simula la toma de decisiones en un escenario complejo.', icon: IconChartBar },
  [ActivityType.INNOVATION_ETHICS]: { name: 'Ética en la Innovación', description: 'Análisis de las implicaciones éticas de las nuevas tecnologías e innovaciones.', icon: IconCog },
  [ActivityType.TECH_BUSINESS_ETHICS]: { name: 'Ética en Negocios Tecnológicos', description: 'Estudio de la ética aplicada a la creación y gestión de empresas de tecnología.', icon: IconBriefcase },
  [ActivityType.ETHICAL_STARTUP_CREATION]: { name: 'Creación de Startup Ética', description: 'Ejercicio práctico de diseño de una empresa tecnológica con fundamentos éticos sólidos.', icon: IconPencil },
  [ActivityType.EMERGING_TECH_FRONTIERS]: { name: 'Fronteras de la Tecnología Emergente', description: 'Discusión sobre los desafíos éticos de tecnologías futuras y emergentes.', icon: IconCog },
  [ActivityType.AI_ETHICS_ANALYSIS]: { name: 'Análisis de Ética en IA', description: 'Estudio de los sesgos, la transparencia y la responsabilidad en la Inteligencia Artificial.', icon: IconCog },
  [ActivityType.PRIVACY_CYBERSECURITY_DEBATE]: { name: 'Debate sobre Privacidad y Ciberseguridad', description: 'Discusión sobre los límites éticos en la recolección de datos y la seguridad digital.', icon: IconChatAlt2 },
  [ActivityType.AI_REGULATION_DEBATE]: { name: 'Debate sobre Regulación de IA', description: 'Discusión sobre la necesidad y el alcance de la regulación de la Inteligencia Artificial.', icon: IconChatAlt2 },
  [ActivityType.EXAM_INSTRUCTIONS]: { name: 'Instrucciones de Examen', description: 'Explicación detallada de las pautas y el formato del examen.', icon: IconInfoCircle },
  [ActivityType.MODULE_CLOSURE]: { name: 'Cierre del Módulo', description: 'Conclusiones finales, retroalimentación y cierre formal del curso.', icon: IconCheckCircle },
  [ActivityType.ACTIVITY]: { name: 'Actividad Práctica', description: 'Ejercicio o tarea práctica para aplicar los conocimientos teóricos.', icon: IconPencil },
};

export const STUDENT_PROGRESS_DATA: { [sessionId: string]: number } = {
  "clase-1": 8,
  "clase-2": 5,
  "clase-3": 3,
  "clase-4": 1,
  "clase-5": 0,
  "clase-6": 0,
  "clase-7": 0,
  "clase-8": 0,
  "clase-9": 0,
  "clase-10": 0,
};

// Note: For a real application with a backend, you wouldn't export SESSIONS_DATA directly
// or modify it here. This is just for the mock frontend setup.
// Helper function to update SESSIONS_DATA for mock purposes.
export const updateMockSessions = (newSessions: CourseSession[]) => {
  SESSIONS_DATA = newSessions;
};