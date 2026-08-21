import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { selectModel, dispatch, type BudgetState } from "../_shared/modelRouter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-eduspark-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Manejar preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // 1. Obtener API Key de cabeceras
    const apiKey = req.headers.get("x-eduspark-api-key") || 
                   req.headers.get("Authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Unauthorized", message: "Falta API Key de EduSpark (cabecera x-eduspark-api-key)" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 2. Inicializar cliente Supabase con privilegios elevados (service_role) para validar claves
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // 3. Validar la clave de API
    // Para simplificar, requerimos scope 'tutor:chat' si es tutor, 'analytics:read' si es analítica, etc.
    let requiredScope = "tutor:chat";
    if (path.includes("/analytics/")) requiredScope = "analytics:read";
    if (path.includes("/compliance/")) requiredScope = "compliance:write";

    const { data: authData, error: authError } = await supabaseAdmin.rpc("validate_api_key", {
      p_raw_key: apiKey,
      p_required_scope: requiredScope
    });

    if (authError || !authData || authData.length === 0 || !authData[0].is_valid) {
      return new Response(JSON.stringify({ error: "Unauthorized", message: "API Key inválida, expirada o con scopes insuficientes." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const institutionId = authData[0].institution_id;

    // 4. Enrutar Endpoints
    // ==========================================
    // ENDPOINT: /models — Discovery de modelos (OpenAI-compatible)
    // ==========================================
    if (path.endsWith("/models")) {
      return new Response(JSON.stringify({
        object: "list",
        data: [
          {
            id: "eduspark-tutor-v1",
            object: "model",
            created: 1700000000,
            owned_by: "eduspark"
          }
        ]
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ==========================================
    // ENDPOINT: GET /tutor — Health check / info
    // ==========================================
    if (path.endsWith("/tutor") && req.method === "GET") {
      return new Response(JSON.stringify({
        name: "EduSpark AI Gateway",
        version: "1.1.5",
        models: ["eduspark-tutor-v1"],
        status: "healthy"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ==========================================
    // ENDPOINT: /tutor/chat o /tutor/chat/completions
    // ==========================================
    if (path.includes("/tutor/chat")) {
      const body = await req.json();
      const isCompletionsAlias = path.endsWith("/completions");
      
      let userQuery = "";
      let messages: any[] = [];
      let courseId = body.course_id;

      if (isCompletionsAlias) {
        messages = body.messages || [];
        const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
        const rawContent = lastUserMsg ? lastUserMsg.content : "";
        if (Array.isArray(rawContent)) {
          userQuery = rawContent
            .map((p: any) => typeof p === "string" ? p : (p.text || p.value || ""))
            .filter(Boolean)
            .join(" ");
        } else if (typeof rawContent === "string") {
          userQuery = rawContent;
        } else if (rawContent?.text) {
          userQuery = typeof rawContent.text === "string" ? rawContent.text : String(rawContent.text);
        }

        const ocrText = (lastUserMsg as any)?.ocr || (lastUserMsg as any)?.image_details?.ocr || "";
        if (ocrText && !userQuery.includes(ocrText.substring(0, 50))) {
          userQuery = userQuery ? userQuery + "\n\n" + ocrText : ocrText;
        }

        userQuery = String(userQuery || "").trim();
      } else {
        messages = body.messages || [];
        const lastMsg = messages[messages.length - 1];
        if (lastMsg) {
          if (typeof lastMsg.content === "string") {
            userQuery = lastMsg.content;
          } else if (Array.isArray(lastMsg.content)) {
            userQuery = lastMsg.content
              .map((p: any) => typeof p === "string" ? p : (p.text || p.value || ""))
              .filter(Boolean)
              .join("\n");
          } else if (lastMsg.text) {
            userQuery = typeof lastMsg.text === "string" ? lastMsg.text : "";
          }

          const ocrText = (lastMsg as any)?.ocr || (lastMsg as any)?.image_details?.ocr || "";
          if (ocrText && !userQuery.includes(ocrText.substring(0, 50))) {
            userQuery = userQuery ? userQuery + "\n\n" + ocrText : ocrText;
          }
        }
        userQuery = String(userQuery || "").trim();
      }

      console.log("DEBUG payload keys:", JSON.stringify(Object.keys(body)));
      console.log("DEBUG last message role/content type:", JSON.stringify({
        role: messages[messages.length - 1]?.role,
        contentType: typeof messages[messages.length - 1]?.content,
        isArray: Array.isArray(messages[messages.length - 1]?.content),
        hasOcr: !!(messages[messages.length - 1] as any)?.ocr,
        hasImageUrls: !!(messages[messages.length - 1] as any)?.image_urls,
        textPreview: String(userQuery || "").substring(0, 300)
      }));

      if (!userQuery) {
        console.error("400 - userQuery vacío. Payload recibido:", JSON.stringify(body).substring(0, 2000));
        return new Response(JSON.stringify({
          error: "Bad Request",
          message: "Falta mensaje del usuario en el payload.",
          detail: "No se encontró un mensaje de rol 'user' en messages. Revisa que LibreChat esté enviando el historial correctamente."
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Si no viene courseId, buscar el primer curso de la institución para pruebas/fallback
      if (!courseId) {
        const { data: firstCourse } = await supabaseAdmin
          .from("courses")
          .select("id")
          .eq("institution_id", institutionId)
          .limit(1)
          .single();
        courseId = firstCourse?.id;
      }

      if (!courseId) {
        return new Response(JSON.stringify({ error: "Not Found", message: "No se encontró ningún curso asociado a tu institución." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      if (isCompletionsAlias) {
        // ── Modo SSE streaming para LibreChat (Respuesta INMEDIATA 0ms) ──────────
        const chatId = `chatcmpl-${crypto.randomUUID()}`;
        const created = Math.floor(Date.now() / 1000);
        const encoder = new TextEncoder();

        const stream = new ReadableStream({
          async start(controller) {
            // Enviar INMEDIATAMENTE el chunk inicial de rol
            const roleChunk = JSON.stringify({
              id: chatId, object: "chat.completion.chunk", created,
              model: "eduspark-tutor-v1",
              choices: [{ index: 0, delta: { role: "assistant", content: "" }, finish_reason: null }]
            });
            controller.enqueue(encoder.encode(`data: ${roleChunk}\n\n`));

            try {
              // 1. RAG ultrarrápido sin bloquear
              let retrievedChunks: any[] = [];
              try {
                const cleanKeywords = String(userQuery || "").replace(/[^\w\s]/gi, '').toLowerCase().substring(0, 100);
                const { data: textResults } = await supabaseAdmin
                  .from("course_content_chunks")
                  .select("id, content, metadata")
                  .eq("course_id", parseInt(courseId))
                  .eq("institution_id", institutionId)
                  .ilike("content", `%${cleanKeywords}%`)
                  .limit(4);

                if (textResults) {
                  textResults.forEach((tr: any) => {
                    retrievedChunks.push({
                      id: tr.id,
                      content: tr.content,
                      document_title: tr.metadata?.sourceFileName || "Manual Técnico",
                      page_start: tr.metadata?.pageStart || tr.metadata?.page_start,
                      page_end: tr.metadata?.pageEnd || tr.metadata?.page_end,
                    });
                  });
                }
              } catch (ragErr) {
                console.error("Error no crítico en RAG:", ragErr);
              }

              const contextString = retrievedChunks.length > 0 
                ? retrievedChunks.map(c => `[Documento: ${c.document_title || 'Manual'}, Páginas: ${c.page_start || 'N/A'}-${c.page_end || 'N/A'}]\n${c.content}`).join("\n\n---\n\n")
                : "No hay materiales adicionales cargados en la biblioteca para este tema.";

              const systemInstruction = `
Eres EduSpark, un Asistente Técnico y Tutor Académico de IA especializado.
Tu tarea es responder a la pregunta del estudiante utilizando como base primordial la información técnica provista.

CONTEXTO TÉCNICO Y BIBLIOTECA DISPONIBLE:
"""
${contextString}
"""

REGLAS DE COMPORTAMIENTO:
1. Responde de manera profesional, estructurada y pedagógica en Markdown.
2. Si el contexto técnico provisto contiene la respuesta, cítala explícitamente indicando el documento y las páginas.
3. Si la pregunta es conceptual general y no requiere los manuales, responde amablemente.
4. NUNCA inventes pasos técnicos ni checklists de seguridad que no estén en la documentación.
`;

              // Construir mensajes en formato OpenAI/Qwen desde el historial de LibreChat
              const qwenMessages: any[] = [];
              for (const m of messages) {
                let role = m.role;
                if (role === "system") continue;
                if (role !== "assistant" && role !== "tool" && role !== "user") role = "user";

                let content = "";
                if (typeof m.content === "string") {
                  content = m.content;
                } else if (Array.isArray(m.content)) {
                  content = m.content
                    .map((p: any) => typeof p === "string" ? p : (p.text || ""))
                    .filter(Boolean)
                    .join("\n");
                } else if (m.text) {
                  content = typeof m.text === "string" ? m.text : "";
                }
                content = content.trim();

                const msg: any = { role };
                if (content) msg.content = content;
                if (role === "assistant" && m.tool_calls) {
                  msg.tool_calls = m.tool_calls;
                }
                if (role === "tool" && m.tool_call_id) {
                  msg.tool_call_id = m.tool_call_id;
                }

                if (!content && !m.tool_calls) continue;

                if (role === "tool" || (role === "assistant" && m.tool_calls)) {
                  qwenMessages.push(msg);
                  continue;
                }

                if (qwenMessages.length === 0 && role === "assistant") continue;

                const last = qwenMessages[qwenMessages.length - 1];
                if (last && last.role === role) {
                  last.content += "\n\n" + content;
                } else {
                  qwenMessages.push(msg);
                }
              }
              if (qwenMessages.length === 0) {
                qwenMessages.push({ role: "user", content: userQuery });
              }

              const payload: any = {
                messages: [
                  { role: "system", content: systemInstruction },
                  ...qwenMessages
                ],
                stream: true,
                temperature: 0.5,
                max_tokens: 2048
              };
              if (body.tools) payload.tools = body.tools;
              if (body.tool_choice) payload.tool_choice = body.tool_choice;

              // CoreSpark: selección de modelo + despacho con fallback.
              // Budget best-effort (se activará con user_id vía LTI/JWT).
              const budget: BudgetState = { allowed: true, current_monthly_cost: 0, remaining_budget: 50, monthly_limit: 50 };
              const decision = await selectModel(supabaseAdmin, {
                userQuery,
                messages: qwenMessages,
                systemInstruction,
                hasTools: !!body.tools,
                institutionId,
                stream: true,
                temperature: 0.5
              }, budget);

              const { response: modelResponse } = await dispatch(decision, payload);

              // Proxy directo del SSE — Qwen y Ollama retornan formato OpenAI-compatible
              const reader = modelResponse.body!.getReader();
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                controller.enqueue(value);
              }

              // Chunk final
              const doneChunk = JSON.stringify({
                id: chatId, object: "chat.completion.chunk", created,
                model: "eduspark-tutor-v1",
                choices: [{ index: 0, delta: {}, finish_reason: "stop" }]
              });
              controller.enqueue(encoder.encode(`data: ${doneChunk}\n\n`));
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            } catch (err: any) {
              console.error("Error en pipe de streaming EduSpark Tutor:", err);
              const msgError = `\n\n*[Error al consultar el Tutor: ${(err?.message || "").substring(0, 100)}]*`;
              const errChunk = JSON.stringify({
                id: chatId, object: "chat.completion.chunk", created,
                model: "eduspark-tutor-v1",
                choices: [{ index: 0, delta: { content: msgError }, finish_reason: "stop" }]
              });
              controller.enqueue(encoder.encode(`data: ${errChunk}\n\n`));
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            } finally {
              controller.close();
            }
          }
        });

        return new Response(stream, {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
          }
        });

      } else {
        // ── Modo JSON síncrono para llamadas directas nativas de EduSpark ──
        // Construir mensajes en formato Qwen
        const syncMessages: { role: string; content: string }[] = [];
        for (const m of messages) {
          const role = m.role === "assistant" ? "assistant" : "user";
          let content = "";
          if (typeof m.content === "string") {
            content = m.content;
          } else if (Array.isArray(m.content)) {
            content = m.content
              .map((p: any) => typeof p === "string" ? p : (p.text || ""))
              .filter(Boolean)
              .join("\n");
          } else if (m.text) {
            content = typeof m.text === "string" ? m.text : "";
          }
          content = content.trim();
          if (!content) continue;
          const last = syncMessages[syncMessages.length - 1];
          if (last && last.role === role) {
            last.content += "\n\n" + content;
          } else {
            syncMessages.push({ role, content });
          }
        }
        if (syncMessages.length === 0) {
          syncMessages.push({ role: "user", content: userQuery });
        }

        // RAG (mismo flujo que la rama streaming)
        let retrievedChunks: any[] = [];
        try {
          const cleanKeywords = String(userQuery || "").replace(/[^\w\s]/gi, '').toLowerCase().substring(0, 100);
          const { data: textResults } = await supabaseAdmin
            .from("course_content_chunks")
            .select("id, content, metadata")
            .eq("course_id", parseInt(courseId))
            .eq("institution_id", institutionId)
            .ilike("content", `%${cleanKeywords}%`)
            .limit(4);
          if (textResults) {
            textResults.forEach((tr: any) => {
              retrievedChunks.push({
                id: tr.id,
                content: tr.content,
                document_title: tr.metadata?.sourceFileName || "Manual Técnico",
                page_start: tr.metadata?.pageStart || tr.metadata?.page_start,
                page_end: tr.metadata?.pageEnd || tr.metadata?.page_end,
              });
            });
          }
        } catch (ragErr) {
          console.error("Error no crítico en RAG:", ragErr);
        }

        const contextString = retrievedChunks.length > 0
          ? retrievedChunks.map(c => `[Documento: ${c.document_title || 'Manual'}, Páginas: ${c.page_start || 'N/A'}-${c.page_end || 'N/A'}]\n${c.content}`).join("\n\n---\n\n")
          : "No hay materiales adicionales cargados en la biblioteca para este tema.";

        const systemInstruction = `
Eres EduSpark, un Asistente Técnico y Tutor Académico de IA especializado.
Tu tarea es responder a la pregunta del estudiante utilizando como base primordial la información técnica provista.

CONTEXTO TÉCNICO Y BIBLIOTECA DISPONIBLE:
"""
${contextString}
"""

REGLAS DE COMPORTAMIENTO:
1. Responde de manera profesional, estructurada y pedagógica en Markdown.
2. Si el contexto técnico provisto contiene la respuesta, cítala explícitamente indicando el documento y las páginas.
3. Si la pregunta es conceptual general y no requiere los manuales, responde amablemente.
4. NUNCA inventes pasos técnicos ni checklists de seguridad que no estén en la documentación.
`;

        // CoreSpark: selección de modelo + despacho con fallback.
        // Budget best-effort (se activará con user_id vía LTI/JWT).
        const budget: BudgetState = { allowed: true, current_monthly_cost: 0, remaining_budget: 50, monthly_limit: 50 };
        const decision = await selectModel(supabaseAdmin, {
          userQuery,
          messages: syncMessages as any,
          systemInstruction,
          hasTools: false,
          institutionId,
          stream: false,
          temperature: 0.5
        }, budget);

        const syncPayload: any = {
          messages: [
            { role: "system", content: systemInstruction },
            ...syncMessages
          ],
          stream: false,
          temperature: 0.5,
          max_tokens: 2048
        };

        const { response: modelResponse, entry } = await dispatch(decision, syncPayload);
        const modelData = await modelResponse.json();
        const replyText = modelData.choices?.[0]?.message?.content || "No se pudo generar una respuesta.";

        const nativeResponse = {
          success: true, reply: replyText,
          metadata: {
            model: entry.model_key,
            source_metadata: retrievedChunks.map(c => ({
              document_title: c.document_title || "Manual Técnico",
              page_start: c.page_start || c.page_number,
              page_end: c.page_end
            }))
          }
        };
        return new Response(JSON.stringify(nativeResponse), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // ==========================================
    // ENDPOINT: /analytics/dropout-risk
    // ==========================================
    if (path.includes("/analytics/dropout-risk")) {
      const body = await req.json();
      const metrics = body.student_metrics || [];

      // Lógica simulada de analítica de deserción (Early Warning System)
      const results = metrics.map((m: any) => {
        let riskScore = 15.0; // Puntuación base baja
        const keyFactors: string[] = [];

        if (m.login_frequency_days > 7) {
          riskScore += 25.0;
          keyFactors.push(`Ausencia de accesos al LMS en los últimos ${m.login_frequency_days} días`);
        }
        if (m.late_submissions_count > 3) {
          riskScore += 20.0;
          keyFactors.push(`Historial de entregas tardías frecuentes (${m.late_submissions_count} entregas)`);
        }
        if (m.average_grade < 3.5) {
          riskScore += 30.0;
          keyFactors.push(`Promedio general en baja por debajo del mínimo recomendado (${m.average_grade})`);
        }
        if (m.chat_frustration_index > 0.6) {
          riskScore += 15.0;
          keyFactors.push("Nivel de frustración recurrente detectado en sus interacciones con el Tutor");
        }

        let riskLevel = "LOW";
        if (riskScore >= 40.0) riskLevel = "MEDIUM";
        if (riskScore >= 70.0) riskLevel = "HIGH";
        if (riskScore >= 85.0) riskLevel = "CRITICAL";

        return {
          student_id: m.student_id,
          risk_score: Math.min(riskScore, 100.0),
          risk_level: riskLevel,
          key_risk_factors: keyFactors,
          pedagogical_recommendation: riskLevel === "LOW" 
            ? "Mantener plan de estudio estándar." 
            : `Coordinar tutoría de apoyo académica y revisar progreso de Unidad 3.`
        };
      });

      return new Response(JSON.stringify({
        institution_id: institutionId,
        analyzed_count: metrics.length,
        results
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ==========================================
    // ENDPOINT: /compliance/aneaes-audit
    // ==========================================
    if (path.includes("/compliance/aneaes-audit")) {
      const body = await req.json();
      const standard = body.accreditation_standard || "ANEAES-MEDICINA";
      const sData = body.syllabus_data || {};

      // Auditoría automatizada basada en criterios de cumplimiento
      const hasBibliography = sData.bibliography && sData.bibliography.length > 0;
      const hoursValid = sData.total_hours >= 120;
      const outcomesValid = sData.learning_outcomes && sData.learning_outcomes.length >= 3;

      let complianceScore = 30.0;
      const findings: string[] = [];

      if (hasBibliography) {
        complianceScore += 30.0;
        findings.push("Cumple: Bibliografía provista y coherente.");
      } else {
        findings.push("Brecha: No se detecta bibliografía obligatoria recomendada en el sílabo.");
      }

      if (hoursValid) {
        complianceScore += 20.0;
        findings.push("Cumple: Carga horaria académica cumple con los mínimos regulatorios.");
      } else {
        findings.push("Brecha: Carga horaria total es menor a la requerida por el CONES.");
      }

      if (outcomesValid) {
        complianceScore += 20.0;
        findings.push("Cumple: Resultados de aprendizaje adecuadamente formulados.");
      }

      const status = complianceScore >= 80.0 
        ? "COMPLIANT" 
        : (complianceScore >= 50.0 ? "PARTIAL" : "NON_COMPLIANT");

      return new Response(JSON.stringify({
        audit_id: crypto.randomUUID(),
        accreditation_standard: standard,
        compliance_score: complianceScore,
        status,
        summary: `Auditoría completada para estándar ${standard}. Nivel de cumplimiento: ${complianceScore}%`,
        findings,
        action_plan: status === "COMPLIANT" 
          ? ["Proceder a la firma del expediente de acreditación."]
          : ["Agregar un mínimo de 3 obras en bibliografía.", "Actualizar los resultados de aprendizaje en mallas."]
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Ruta no encontrada
    return new Response(JSON.stringify({ error: "Not Found", message: "Endpoint no implementado en el Gateway." }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Gateway Error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error", message: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
