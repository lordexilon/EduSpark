import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ID del flujo que el usuario configuró en Langflow
const FLOW_ID = "dea2bf34-773e-4ede-bef5-4f8049c66a3f";
const LANGFLOW_API_URL = `http://host.docker.internal:7860/api/v1/run/${FLOW_ID}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // Discovery Endpoint para LibreChat
    if (path.endsWith("/models")) {
      return new Response(JSON.stringify({
        object: "list",
        data: [
          {
            id: "langflow-pyinvest-agent",
            object: "model",
            created: Math.floor(Date.now() / 1000),
            owned_by: "businessspark"
          }
        ]
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Chat Completions Endpoint
    if (path.includes("/chat/completions")) {
      const body = await req.json();
      const messages = body.messages || [];
      
      // Extraemos la última pregunta del usuario
      const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
      let userQuery = "";
      
      if (lastUserMsg) {
        if (typeof lastUserMsg.content === "string") {
          userQuery = lastUserMsg.content;
        } else if (Array.isArray(lastUserMsg.content)) {
          userQuery = lastUserMsg.content
            .map((p: any) => typeof p === "string" ? p : (p.text || ""))
            .filter(Boolean)
            .join(" ");
        }
      }

      if (!userQuery) {
        return new Response(JSON.stringify({ error: "No user message found" }), { status: 400, headers: corsHeaders });
      }

      console.log(`[Langflow Gateway] Enviando query a Langflow: "${userQuery.substring(0, 50)}..."`);

      // 1. Llamar a Langflow
      const langflowPayload = {
        input_value: userQuery,
        output_type: "chat",
        input_type: "chat",
        tweaks: {
          "ChatInput-1": {},
          "ChatOutput-1": {}
        }
      };

      const apiKey = Deno.env.get("LANGFLOW_API_KEY") || "";
      console.log(`[Langflow Gateway] Enviando petición a Langflow. API Key configurada: ${apiKey ? "Sí" : "No"}`);

      const langflowResponse = await fetch(LANGFLOW_API_URL, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "x-api-key": apiKey
        },
        body: JSON.stringify(langflowPayload)
      });

      if (!langflowResponse.ok) {
        const errText = await langflowResponse.text();
        console.error("[Langflow Gateway] Error de Langflow:", errText);
        throw new Error(`Langflow error: ${langflowResponse.status}`);
      }

      const lfData = await langflowResponse.json();
      
      // Extraer el texto de la respuesta de Langflow (estructura estándar de Langflow 1.0)
      let replyText = "Lo siento, no pude procesar la respuesta.";
      try {
        if (lfData.outputs && lfData.outputs[0]?.outputs && lfData.outputs[0].outputs[0]?.results?.message?.text) {
          replyText = lfData.outputs[0].outputs[0].results.message.text;
        } else if (lfData.outputs && lfData.outputs[0]?.outputs && lfData.outputs[0].outputs[0]?.artifacts?.message) {
          replyText = lfData.outputs[0].outputs[0].artifacts.message;
        } else {
          // Fallback para inspeccionar el body si cambió la estructura
          replyText = JSON.stringify(lfData.outputs);
        }
      } catch (extractErr) {
        console.error("Error extrayendo texto de Langflow:", extractErr);
      }

      console.log(`[Langflow Gateway] Respuesta recibida, enviando a LibreChat.`);

      // 2. Formatear como OpenAI API para LibreChat
      if (body.stream) {
        console.log(`[Langflow Gateway] Retornando respuesta como Stream (SSE) a LibreChat.`);
        const streamId = `chatcmpl-${crypto.randomUUID()}`;
        const created = Math.floor(Date.now() / 1000);
        const modelName = body.model || "langflow-pyinvest-agent";

        const stream = new ReadableStream({
          start(controller) {
            // Enviar un solo chunk con todo el texto (ya que Langflow nos da la respuesta completa)
            const chunk = {
              id: streamId,
              object: "chat.completion.chunk",
              created: created,
              model: modelName,
              choices: [{ index: 0, delta: { role: "assistant", content: replyText }, finish_reason: null }]
            };
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`));
            
            // Enviar chunk de parada
            const stopChunk = {
              id: streamId,
              object: "chat.completion.chunk",
              created: created,
              model: modelName,
              choices: [{ index: 0, delta: {}, finish_reason: "stop" }]
            };
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(stopChunk)}\n\n`));
            controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
            controller.close();
          }
        });

        return new Response(stream, {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          }
        });
      } else {
        console.log(`[Langflow Gateway] Retornando respuesta como JSON normal a LibreChat.`);
        const responseBody = {
          id: `chatcmpl-${crypto.randomUUID()}`,
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: body.model || "langflow-pyinvest-agent",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: replyText,
              },
              finish_reason: "stop"
            }
          ],
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
        };

        return new Response(JSON.stringify(responseBody), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  } catch (error) {
    console.error("Gateway Error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error", message: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
