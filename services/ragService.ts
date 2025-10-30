// services/ragService.ts

// --- ¡ACCIÓN REQUERIDA! ---
// Reemplace esta URL con la URL de su Webhook de producción del workflow '[MVP] Consulta RAG de Alumno'.
// En una aplicación real, esto debería ser una variable de entorno (ej. process.env.REACT_APP_N8N_WEBHOOK_URL).
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://applicandola.auto.hostybee.com/webhook/tutor-chat';

async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit,
  options: { attempts?: number; baseDelayMs?: number; timeoutMs?: number } = {}
): Promise<Response> {
  const { attempts = 4, baseDelayMs = 1000, timeoutMs = 12000 } = options;

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(input, { ...init, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        // Capturamos cuerpo para logging, pero dejamos que el caller decida
        const errorBody = await response.text().catch(() => '');
        console.error(`RAGService: intento ${attempt} falló con HTTP ${response.status}. Cuerpo:`, errorBody);
        lastError = new Error(`HTTP ${response.status}`);
      } else {
        return response;
      }
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
      const delay = baseDelayMs * attempt; // backoff lineal simple (1000ms, 2000ms, ...)
      console.warn(`RAGService: intento ${attempt} falló (${String(err)}). Reintentando en ${delay}ms...`);
      if (attempt < attempts) {
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('No se pudo completar la solicitud después de reintentos');
}

/**
 * Llama al backend RAG (Retrieval-Augmented Generation) orquestado por n8n 
 * para obtener una respuesta basada en el contenido del curso.
 * 
 * @param question La pregunta del usuario.
 * @param course_id El ID del curso para contextualizar la búsqueda.
 * @returns Una promesa que se resuelve con la respuesta del asistente de IA.
 */
export const getAiAssistantResponse = async (question: string, course_id: string): Promise<string> => {
  console.log(`[Servicio RAG] Enviando pregunta al workflow de n8n para el curso '${course_id}': "${question}"`);

  if (!N8N_WEBHOOK_URL || N8N_WEBHOOK_URL.includes('YOUR_N8N_INSTANCE_URL')) {
    console.error("URL del Webhook de n8n no configurada en services/ragService.ts");
    throw new Error("La conexión con el asistente de IA no está configurada. Por favor, edita el archivo `services/ragService.ts` y añade la URL de tu webhook de n8n.");
  }

  try {
    const response = await fetchWithRetry(
      N8N_WEBHOOK_URL,
      {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: question,
        courseId: course_id, // El workflow de n8n espera la clave 'courseId'
      }),
      },
      { attempts: 4, baseDelayMs: 1000, timeoutMs: 15000 }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Error en la respuesta de n8n:', response.status, errorBody);
      throw new Error(`El servidor respondió con un error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.answer) {
      console.error('La respuesta de n8n no contiene la propiedad "answer":', data);
      throw new Error('Respuesta inesperada del asistente.');
    }

    return data.answer;

  } catch (error) {
    console.error('No se pudo comunicar con el workflow de n8n:', error);
    // Re-lanzamos el error para que el componente que llama (AssistantIA) pueda manejarlo
    // y mostrar un mensaje de error al usuario.
    throw new Error('No se pudo conectar con el asistente de IA. Revisa la consola para más detalles.');
  }
};