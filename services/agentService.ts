// services/agentService.ts

const A2A_COORDINATOR_URL = import.meta.env.VITE_A2A_COORDINATOR_URL || '';

type AgentRequest = {
  message: string;
  courseId: string;
  conversationId?: string;
  studentProfile?: Record<string, unknown> | null;
};

async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit,
  options: { attempts?: number; baseDelayMs?: number; timeoutMs?: number } = {}
): Promise<Response> {
  const { attempts = 4, baseDelayMs = 1000, timeoutMs = 15000 } = options;

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(input, { ...init, signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        console.error(`AgentService: intento ${attempt} HTTP ${response.status}. Cuerpo:`, errorBody);
        lastError = new Error(`HTTP ${response.status}`);
      } else {
        return response;
      }
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
      const delay = baseDelayMs * attempt;
      console.warn(`AgentService: intento ${attempt} falló (${String(err)}). Reintentando en ${delay}ms...`);
      if (attempt < attempts) {
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Fallo tras reintentos');
}

export async function getAgentAssistantResponse(
  message: string,
  courseId: string,
  options: { conversationId?: string; studentProfile?: Record<string, unknown> | null } = {}
): Promise<string> {
  if (!A2A_COORDINATOR_URL) {
    console.error('VITE_A2A_COORDINATOR_URL no está configurada');
    throw new Error('El coordinador A2A no está configurado. Define VITE_A2A_COORDINATOR_URL.');
  }

  const payload: AgentRequest = {
    message,
    courseId,
    conversationId: options.conversationId,
    studentProfile: options.studentProfile ?? null,
  };

  const response = await fetchWithRetry(
    A2A_COORDINATOR_URL,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    { attempts: 2, baseDelayMs: 300, timeoutMs: 15000 } // Optimizado para velocidad
  );

  const data = await response.json().catch(() => ({} as any));

  const text: string | undefined = data?.answer || data?.message || data?.text;
  if (!text) {
    console.error('Respuesta del coordinador A2A sin "answer/message":', data);
    throw new Error('Respuesta inesperada del coordinador A2A.');
  }

  return text;
}


