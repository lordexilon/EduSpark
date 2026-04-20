/**
 * Textos para reportes administrativos y auditoría (Sprint 5).
 * Idioma UI: clave `EDUSPARK_UI_LANG_STORAGE_KEY` + hook `useUiLang`.
 */

export const adminReportsText = {
  es: {
    pageTitle: 'Reportes Comprehensivos Globales',
    subtitle: 'Vista administrativa de todas las instituciones, carreras y cursos',
    note: 'Resumen agregado por curso (métricas del tutor y progreso medio). No se generan tokens de modelo al abrir esta página: solo lectura en base de datos.',
    exportEnrollments: 'Exportar Matrículas',
    refresh: 'Actualizar',
    updating: 'Actualizando...',
    exporting: 'Exportando...',
    cacheHintPrefix: 'Mostrando datos guardados en este navegador para reducir tráfico. Válidos hasta el próximo cierre diario (~21:00 h, Paraguay). Expiran:',
    freshHint: 'Datos recién calculados. Se volverán a usar desde caché en visitas posteriores hasta el próximo cierre diario (~21:00 h, Paraguay).',
    from: 'Desde:',
    to: 'Hasta:',
    clearFilters: 'Limpiar Filtros',
    
    // Metrics
    institutions: 'Instituciones',
    totalCourses: 'Cursos Totales',
    students: 'Estudiantes',
    totalCost: 'Costo Total Combinado',
    avgProgress: 'Progreso Promedio',
    totalInteractions: 'Interacciones Totales',
    totalTokens: 'Tokens Totales',
    
    // Breakdown
    costBreakdown: 'Desglose de Costos Totales',
    tutorAi: 'Tutor IA',
    processing: 'Procesamiento',
    aiUsage: 'Uso de IA',
    grandTotal: 'Total General',
    costPctOfTotal: 'del total',
    
    // Audit Log
    auditTitle: 'Registro de Auditoría de Sistemas',
    auditSubtitle: 'Trazabilidad completa de acciones críticas y cumplimiento SCA.',
    recentEvents: 'Eventos Recientes',
    last24h: 'Últimas 24h',
    aiAlerts: 'Alertas AI',
    searchPlaceholder: 'Buscar por usuario o acción...',
    
    // Table Headers
    actor: 'Actor',
    action: 'Acción',
    resource: 'Recurso',
    dateTime: 'Fecha / Hora (PY)',
    metadata: 'Metadatos del Evento',
    
    // General
    noData: 'No hay datos disponibles',
    loading: 'Cargando...',
    error: 'Error al cargar los datos',
    
    // Risk Widget
    riskTitle: 'Alumnos en Riesgo',
    riskSubtitle: 'o sin entregas',
    riskCritical: 'Crítico',
    riskWarning: 'Alerta',
    noSubmissions: 'Sin entrega',
    allClear: '¡Todos al día!',
    noRiskDesc: 'No hay estudiantes en riesgo académico.',
    showMore: 'Ver',
    showLess: 'Mostrar menos',
    more: 'más',
    sendMsg: 'Enviar mensaje',
  },
  gn: {
    pageTitle: 'Marandu Guasu Opaite Mbo\'ehaogua',
    subtitle: 'Admin techakuaa opaite mbo\'ehao, carrera ha kurso kuéra rehegua',
    note: 'Kurso ñemombyky (tutor mba\'ekuaa ha jeho promedio). Ndaojejapói token pyahu ko\'ápe: moñe\'ẽnte base de datos-pe.',
    exportEnrollments: 'Emboguejy Matrícula',
    refresh: 'Embopyahu',
    updating: 'Oñembopyahu hína...',
    exporting: 'Oñemboguejy hína...',
    cacheHintPrefix: 'Ehecha marandu ñongatupy ko navegador-pe. Ovale ko árape g̃uarã (21:00 h, Paraguay). Opa hína:',
    freshHint: 'Marandu pyahuite. Ojepurúta jey caché guive ambue jave eikéramo, ko ára paha peve (~21:00 h, Paraguay).',
    from: 'Guive:',
    to: 'Peve:',
    clearFilters: 'Ei’o mboha\'eha',
    
    // Metrics
    institutions: 'Mbo\'ehaokuéra',
    totalCourses: 'Kurso kuéra',
    students: 'Temimbo\'ekuéra',
    totalCost: 'Hepykue Ojoypýpe',
    avgProgress: 'Jeho Promedio',
    totalInteractions: 'Ñemongeta Ojoypýpe',
    totalTokens: 'Token Ojoypýpe',
    
    // Breakdown
    costBreakdown: 'Hepykue Ñembojao',
    tutorAi: 'Tutor IA',
    processing: 'Mba\'apopy',
    aiUsage: 'IA Puru',
    grandTotal: 'Opaite Hepykue',
    costPctOfTotal: 'opaite guive',
    
    // Audit Log
    auditTitle: 'Tembiasakue Trazabilidad rehegua',
    auditSubtitle: 'Tembiasakue opaite tembiapo mbo\'ehao rehegua (SCA).',
    recentEvents: 'Tembiapo pyahukuéra',
    last24h: '24 aravo paha',
    aiAlerts: 'Sapy\'apy IA',
    searchPlaceholder: 'Eheka tekove térã tembiapo...',
    
    // Table Headers
    actor: 'Tekove',
    action: 'Tembiapo',
    resource: 'Mba\'epu',
    dateTime: 'Ara / Aravo (PY)',
    metadata: 'Marandu Detalle',
    
    // General
    noData: 'Ndaipóri marandu',
    loading: 'Oñehenyhẽ hína...',
    error: 'Oiko peteĩ jejavy marandu rekoha',

    // Risk Widget
    riskTitle: 'Temimbo\'e oikoasýva',
    riskSubtitle: 'térã ndohejáiva tembiapo',
    riskCritical: 'Ivaieterei',
    riskWarning: 'Kyhyje',
    noSubmissions: 'Ndohejáiva',
    allClear: '¡Opaite hoypýpe!',
    noRiskDesc: 'Ndaipóri temimbo\'e oikoasýva ko\'ápe.',
    showMore: 'Ehecha',
    showLess: 'Emomichĩ',
    more: 've',
    sendMsg: 'Embou ñe\'ẽ',
  }
} as const;
