const express = require('express');
const cors = require('cors');
require('dotenv').config();
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 54333;
const FLOW_ID = "dea2bf34-773e-4ede-bef5-4f8049c66a3f";
const LANGFLOW_API_URL = process.env.LANGFLOW_API_URL || `http://host.docker.internal:7860/api/v1/run/${FLOW_ID}`;

// Discovery Endpoint para LibreChat
app.get('/models', (req, res) => {
  res.json({
    object: "list",
    data: [
      {
        id: "langflow-pyinvest-agent",
        object: "model",
        created: Math.floor(Date.now() / 1000),
        owned_by: "businessspark"
      }
    ]
  });
});

// Chat Completions Endpoint
app.post('/chat/completions', async (req, res) => {
  try {
    const body = req.body;
    const messages = body.messages || [];
    
    // Extraemos la última pregunta del usuario
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
    let userQuery = "";
    
    if (lastUserMsg) {
      if (typeof lastUserMsg.content === "string") {
        userQuery = lastUserMsg.content;
      } else if (Array.isArray(lastUserMsg.content)) {
        userQuery = lastUserMsg.content
          .map(p => typeof p === "string" ? p : (p.text || ""))
          .filter(Boolean)
          .join(" ");
      }
    }

    if (!userQuery) {
      return res.status(400).json({ error: "No user message found" });
    }

    console.log(`\n[Langflow Node Gateway] Recibida nueva petición.`);
    console.log(`[Langflow Node Gateway] Query extraída: "${userQuery.substring(0, 50)}..."`);

    const langflowPayload = {
      input_value: userQuery,
      output_type: "chat",
      input_type: "chat",
      tweaks: {
        "ChatInput-1": {},
        "ChatOutput-1": {}
      }
    };

    const apiKey = process.env.LANGFLOW_API_KEY || "";
    
    // Configurar Timeout alto (5 minutos) para evitar cortes
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); 

    console.log(`[Langflow Node Gateway] Enviando petición a Langflow. Timeout configurado en 5 min.`);

    const headers = { "Content-Type": "application/json" };
    if (apiKey) {
      headers["x-api-key"] = apiKey;
    }

    const langflowResponse = await fetch(LANGFLOW_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(langflowPayload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!langflowResponse.ok) {
      const errText = await langflowResponse.text();
      console.error("[Langflow Node Gateway] Error de Langflow:", errText);
      throw new Error(`Langflow error: ${langflowResponse.status}`);
    }

    const lfData = await langflowResponse.json();
    
    let replyText = "Lo siento, no pude procesar la respuesta.";
    try {
      if (lfData.outputs && lfData.outputs[0]?.outputs && lfData.outputs[0].outputs[0]?.results?.message?.text) {
        replyText = lfData.outputs[0].outputs[0].results.message.text;
      } else if (lfData.outputs && lfData.outputs[0]?.outputs && lfData.outputs[0].outputs[0]?.artifacts?.message) {
        replyText = lfData.outputs[0].outputs[0].artifacts.message;
      } else {
        replyText = JSON.stringify(lfData.outputs);
      }
    } catch (extractErr) {
      console.error("[Langflow Node Gateway] Error extrayendo texto de Langflow:", extractErr);
    }

    console.log(`[Langflow Node Gateway] Respuesta de Langflow recibida con éxito (${replyText.length} caracteres). Enviando a LibreChat.`);

    if (body.stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const streamId = `chatcmpl-${crypto.randomUUID()}`;
      const created = Math.floor(Date.now() / 1000);
      const modelName = body.model || "langflow-pyinvest-agent";

      const chunk = {
        id: streamId,
        object: "chat.completion.chunk",
        created: created,
        model: modelName,
        choices: [{ index: 0, delta: { role: "assistant", content: replyText }, finish_reason: null }]
      };
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      
      const stopChunk = {
        id: streamId,
        object: "chat.completion.chunk",
        created: created,
        model: modelName,
        choices: [{ index: 0, delta: {}, finish_reason: "stop" }]
      };
      res.write(`data: ${JSON.stringify(stopChunk)}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    } else {
      res.json({
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
      });
    }

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error("[Langflow Node Gateway] TIMEOUT EXCEDIDO: La petición a Langflow superó los 5 minutos.");
      return res.status(504).json({ error: "Gateway Timeout", message: "Langflow took too long to respond." });
    }
    console.error("[Langflow Node Gateway] Gateway Error:", error);
    res.status(500).json({ error: "Internal Server Error", message: String(error) });
  }
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Langflow Node Gateway corriendo en http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
