/**
 * AISpark Core (Langflow) Service API
 * Handles communication with the Langflow backend for RAG and AI Agents.
 */

const LANGFLOW_API_URL = import.meta.env.VITE_LANGFLOW_API_URL || 'http://localhost:7860';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

/**
 * Sends a message to a Langflow workflow.
 *
 * @param flowId - The ID of the flow to trigger
 * @param message - The user's input message
 * @param sessionId - Optional session ID for memory/history
 * @returns The AI's response text
 */
export const sendChatMessage = async (
  flowId: string,
  message: string,
  sessionId?: string
): Promise<string> => {
  try {
    // The endpoint format for Langflow 1.0+ is usually /api/v1/run/<flowId>
    const endpoint = `${LANGFLOW_API_URL}/api/v1/run/${flowId}`;

    // We send a generic payload structure expected by Langflow's chat inputs
    const payload = {
      input_value: message,
      output_type: 'chat',
      input_type: 'chat',
      tweaks: {},
      session_id: sessionId || `session-${Date.now()}`,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${LANGFLOW_API_KEY}` // If needed in production
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Error en la conexión con AISpark Core: ${response.statusText}`);
    }

    const data = await response.json();

    // Extract the message from Langflow's nested response structure
    // (This structure varies slightly depending on the Langflow version,
    // but usually it's inside outputs[0].outputs[0].results.message.text)
    let aiResponse = 'Lo siento, no pude procesar la respuesta correctamente.';

    if (data && data.outputs && data.outputs.length > 0) {
      const firstOutput = data.outputs[0];
      if (firstOutput.outputs && firstOutput.outputs.length > 0) {
        const result = firstOutput.outputs[0].results;
        if (result && result.message && result.message.text) {
          aiResponse = result.message.text;
        }
      }
    }

    return aiResponse;
  } catch (error) {
    console.error('AISpark Core Error:', error);
    throw error;
  }
};
