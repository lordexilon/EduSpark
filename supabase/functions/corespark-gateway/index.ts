import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { selectModel, dispatch, loadRegistry, type BudgetState } from "../_shared/modelRouter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-eduspark-api-key",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const DEFAULT_SYSTEM = "Eres CoreSpark, un asistente de IA general. Responde de forma clara y concisa.";

function extractUserQuery(messages: any[]): string {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const raw = lastUser?.content ?? "";
  if (Array.isArray(raw)) {
    return raw.map((p: any) => (typeof p === "string" ? p : p.text || p.value || "")).filter(Boolean).join(" ");
  }
  if (typeof raw === "string") return raw;
  return raw?.text ? String(raw.text) : "";
}

function extractSystem(messages: any[]): string {
  const sys = messages.find((m) => m.role === "system");
  if (!sys) return DEFAULT_SYSTEM;
  const raw = sys.content;
  if (Array.isArray(raw)) {
    return raw.map((p: any) => (typeof p === "string" ? p : p.text || "")).filter(Boolean).join("\n");
  }
  return typeof raw === "string" ? raw : String(raw?.text ?? DEFAULT_SYSTEM);
}

// Convierte historial OpenAI a mensajes {role, content} (sin system, se agrega aparte)
function normalizeMessages(messages: any[]): { role: string; content: string }[] {
  const out: { role: string; content: string }[] = [];
  for (const m of messages) {
    if (m.role === "system") continue;
    const role = m.role === "assistant" ? "assistant" : m.role === "tool" ? "tool" : "user";
    let content = "";
    if (typeof m.content === "string") content = m.content;
    else if (Array.isArray(m.content)) {
      content = m.content.map((p: any) => (typeof p === "string" ? p : p.text || "")).filter(Boolean).join("\n");
    } else if (m.text) content = String(m.text);
    content = content.trim();
    if (!content) continue;
    const last = out[out.length - 1];
    if (last && last.role === role) last.content += "\n\n" + content;
    else out.push({ role, content });
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // 1. Validar API key
    const apiKey = req.headers.get("x-eduspark-api-key") ||
      req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Unauthorized", message: "Falta API Key" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
    }
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

    const { data: authData, error: authError } = await supabaseAdmin.rpc("validate_api_key", {
      p_raw_key: apiKey,
      p_required_scope: "tutor:chat",
    });
    if (authError || !authData || authData.length === 0 || !authData[0].is_valid) {
      return new Response(JSON.stringify({ error: "Unauthorized", message: "API Key inválida o sin scope." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const institutionId = authData[0].institution_id;

    // 2. GET /health
    if (path.endsWith("/health")) {
      return new Response(JSON.stringify({ name: "CoreSpark Gateway", version: "1.0.0", status: "healthy" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. GET /models — discovery desde model_registry
    if (path.endsWith("/models")) {
      const entries = await loadRegistry(supabaseAdmin);
      return new Response(JSON.stringify({
        object: "list",
        data: entries.map((e) => ({
          id: e.model_key,
          object: "model",
          created: 1700000000,
          owned_by: "corespark",
        })),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 4. POST /chat/completions — chat genérico (sin RAG)
    if (path.endsWith("/chat/completions")) {
      const body = await req.json();
      const messages: any[] = body.messages || [];
      const userQuery = String(extractUserQuery(messages) || "").trim();
      if (!userQuery) {
        return new Response(JSON.stringify({ error: "Bad Request", message: "Falta mensaje del usuario." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const systemInstruction = extractSystem(messages);
      const history = normalizeMessages(messages);
      if (history.length === 0) history.push({ role: "user", content: userQuery });

      const shouldStream = body.stream ?? false;

      if (!shouldStream) {
        try {
          const payload: any = {
            messages: [{ role: "system", content: systemInstruction }, ...history],
            stream: false,
            temperature: body.temperature ?? 0.5,
            max_tokens: 2048,
          };
          if (body.tools) payload.tools = body.tools;
          if (body.tool_choice) payload.tool_choice = body.tool_choice;

          const budget: BudgetState = { allowed: true, current_monthly_cost: 0, remaining_budget: 50, monthly_limit: 50 };
          const decision = await selectModel(supabaseAdmin, {
            userQuery,
            messages: history as any,
            systemInstruction,
            hasTools: !!body.tools,
            institutionId,
            stream: false,
            temperature: body.temperature ?? 0.5,
          }, budget);

          const { response: modelResponse } = await dispatch(decision, payload);
          const data = await modelResponse.json();
          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (err: any) {
          console.error("Error en llamada síncrona CoreSpark:", err);
          return new Response(JSON.stringify({ error: "Internal Server Error", message: err.message }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        const chatId = `chatcmpl-${crypto.randomUUID()}`;
        const created = Math.floor(Date.now() / 1000);
        const encoder = new TextEncoder();

        const stream = new ReadableStream({
          async start(controller) {
            const roleChunk = JSON.stringify({
              id: chatId, object: "chat.completion.chunk", created,
              model: "corespark-v1",
              choices: [{ index: 0, delta: { role: "assistant", content: "" }, finish_reason: null }],
            });
            controller.enqueue(encoder.encode(`data: ${roleChunk}\n\n`));

            try {
              const payload: any = {
                messages: [{ role: "system", content: systemInstruction }, ...history],
                stream: true,
                temperature: body.temperature ?? 0.5,
                max_tokens: 2048,
              };
              if (body.tools) payload.tools = body.tools;
              if (body.tool_choice) payload.tool_choice = body.tool_choice;

              const budget: BudgetState = { allowed: true, current_monthly_cost: 0, remaining_budget: 50, monthly_limit: 50 };
              const decision = await selectModel(supabaseAdmin, {
                userQuery,
                messages: history as any,
                systemInstruction,
                hasTools: !!body.tools,
                institutionId,
                stream: true,
                temperature: body.temperature ?? 0.5,
              }, budget);

              const { response: modelResponse } = await dispatch(decision, payload);
              const reader = modelResponse.body!.getReader();
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                controller.enqueue(value);
              }

              const doneChunk = JSON.stringify({
                id: chatId, object: "chat.completion.chunk", created,
                model: "corespark-v1",
                choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
              });
              controller.enqueue(encoder.encode(`data: ${doneChunk}\n\n`));
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            } catch (err: any) {
              console.error("Error en pipe de streaming CoreSpark:", err);
              const errChunk = JSON.stringify({
                id: chatId, object: "chat.completion.chunk", created,
                model: "corespark-v1",
                choices: [{ index: 0, delta: { content: `\n\n*[Error: ${(err?.message || "").substring(0, 100)}]*` }, finish_reason: "stop" }],
              });
              controller.enqueue(encoder.encode(`data: ${errChunk}\n\n`));
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            } finally {
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
          },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Not Found", message: "Endpoint no implementado." }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("CoreSpark Gateway Error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error", message: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
