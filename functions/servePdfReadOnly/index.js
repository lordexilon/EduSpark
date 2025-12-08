const functions = require('@google-cloud/functions-framework');
const { createClient } = require('@supabase/supabase-js');

// No inicializar Supabase aquí - hacerlo dentro de la función para que las env vars estén disponibles
let supabaseClient = null;

function getSupabase() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[ServePDF] Variables de entorno faltantes:');
      console.error('  SUPABASE_URL:', supabaseUrl ? 'Definida' : 'NO DEFINIDA');
      console.error('  SUPABASE_SERVICE_KEY:', supabaseKey ? 'Definida (ocultada)' : 'NO DEFINIDA');
      throw new Error('SUPABASE_URL y SUPABASE_SERVICE_KEY son requeridas');
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseKey);
    console.log('[ServePDF] Supabase inicializado correctamente');
  }
  return supabaseClient;
}

/**
 * Cloud Function para servir PDFs con restricciones de solo lectura
 * Previene descarga e impresión agregando headers HTTP restrictivos
 */
functions.http('servePdfReadOnly', async (req, res) => {
  console.log('[ServePDF] Solicitud recibida');

  // Configurar CORS - permitir desde el frontend
  const origin = req.headers.origin || '*';
  res.set('Access-Control-Allow-Origin', origin);
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    // Inicializar Supabase (lazy)
    const supabase = getSupabase();
    // Obtener parámetros
    const { materialId, token } = req.query;

    if (!materialId) {
      return res.status(400).json({ error: 'Material ID es requerido' });
    }

    if (!token) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    console.log('[ServePDF] Verificando material:', materialId);

    // Verificar token de usuario
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[ServePDF] Error de autenticación:', authError);
      return res.status(401).json({ error: 'Token inválido' });
    }

    console.log('[ServePDF] Usuario autenticado:', user.id);

    // Obtener información del material
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('*, courses!inner(teacher_id)')
      .eq('id', materialId)
      .single();

    if (materialError || !material) {
      console.error('[ServePDF] Material no encontrado:', materialError);
      return res.status(404).json({ error: 'Material no encontrado' });
    }

    // Verificar que el usuario tiene acceso al curso
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('course_id', material.course_id)
      .eq('student_id', user.id)
      .single();

    // Permitir acceso si es estudiante inscrito o profesor del curso
    const isTeacher = material.courses.teacher_id === user.id;
    const isStudent = !!enrollment;

    if (!isTeacher && !isStudent) {
      console.error('[ServePDF] Usuario sin acceso al material');
      return res.status(403).json({ error: 'No tienes acceso a este material' });
    }

    console.log('[ServePDF] Acceso verificado:', { isTeacher, isStudent });

    // Obtener la URL del archivo desde metadata
    const fileUrl = material.url;
    
    if (!fileUrl) {
      console.error('[ServePDF] Material sin URL');
      return res.status(404).json({ error: 'Material sin archivo asociado' });
    }

    console.log('[ServePDF] Descargando archivo desde Supabase Storage');

    // Descargar el archivo desde Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('course-documents')
      .download(fileUrl.replace(/^.*course-documents\//, ''));

    if (downloadError || !fileData) {
      console.error('[ServePDF] Error descargando archivo:', downloadError);
      return res.status(500).json({ error: 'Error descargando archivo' });
    }

    console.log('[ServePDF] Archivo descargado, sirviendo con headers restrictivos');

    // Configurar headers para prevenir descarga e impresión
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', 'inline; filename="document.pdf"'); // inline fuerza visualización
    res.set('X-Content-Type-Options', 'nosniff');
    
    // Permitir embedding en iframe desde el frontend (necesario para visualizar)
    // NO establecer X-Frame-Options para permitir embedding desde nuestro dominio
    // O usar ALLOW-FROM, pero es mejor no ponerlo y usar CSP frame-ancestors
    
    // CSP menos restrictivo para evitar bloqueos del navegador
    // Permitir el PDF en sí pero bloquear scripts y objetos externos
    // frame-ancestors permite embedding desde nuestro frontend
    // Para PDFs en iframes, no restringir frame-ancestors demasiado
    const allowedOrigins = [
      'https://eduspark-frontend-mcc5aevj6a-uc.a.run.app',
      'http://localhost:5173',
      'http://localhost:3000'
    ];
    const requestOrigin = req.headers.origin || '';
    // Permitir embedding desde nuestro frontend o desde cualquier origen para desarrollo
    // En producción, puedes restringir esto más
    const frameAncestors = allowedOrigins.some(o => requestOrigin.includes(o)) || !requestOrigin
      ? "frame-ancestors *" // Permitir desde cualquier origen para desarrollo
      : "frame-ancestors 'self'";
    
    // CSP simplificado - no bloquear el embedding del PDF
    res.set('Content-Security-Policy', `default-src 'none'; ${frameAncestors};`);
    
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private'); // No cachear
    
    // Headers adicionales para prevenir descarga
    res.set('X-Download-Options', 'noopen'); // IE
    res.set('X-Permitted-Cross-Domain-Policies', 'none');
    
    // Convertir blob a buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Enviar el archivo
    res.status(200).send(buffer);
    console.log('[ServePDF] Archivo enviado exitosamente');

  } catch (error) {
    console.error('[ServePDF] Error:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

