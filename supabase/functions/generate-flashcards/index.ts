
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, content, topics, context } = body;

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const MODEL_NAME = "gemini-flash-latest";
    const API_VERSION = "v1beta";
    const API_URL = `https://generativelanguage.googleapis.com/${API_VERSION}/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

    // 1. GENERATE COURSE STRUCTURE
    if (action === 'generate-structure') {
      const cleanContent = content ? content.substring(0, 40000) : '';
      const prompt = `
          ERES UN EXPERTO EN DISEÑO INSTRUCCIONAL. 
          TU TAREA: Crear una estructura de curso organizada usando EXCLUSIVAMENTE el texto proporcionado.
          
          REGLAS CRÍTICAS:
          1. NO inventes temas fuera del texto.
          2. Si el texto es breve, crea menos unidades pero que sean fieles.
          3. Todo el contenido debe estar en ESPAÑOL.
          
          ESTRUCTURA REQUERIDA:
          El curso debe tener: Título, Descripción breve y una lista de Unidades.
          Cada Unidad debe tener un número, título, descripción y una lista de Sesiones (temas específicos hallados en el texto).
          
          Devuelve SOLO un JSON válido con este formato:
          {
            "title": "Título detectado o generado del contexto",
            "description": "Resumen basado en el texto",
            "units": [
              {
                "number": 1,
                "title": "Título de la Unidad",
                "description": "Qué se aprenderá según el texto",
                "sessions": [
                  { "title": "Nombre del Tema del texto", "description": "Breve explicación" }
                ]
              }
            ]
          }
          
          Texto Fuente: """${cleanContent}"""
        `;

      const payload = { contents: [{ parts: [{ text: prompt }] }] };
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();

      return new Response(text, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. GENERATE FLASHCARDS WITH IMAGE PROMPTS
    if (action === 'generate-with-images') {
      const cleanContent = content ? content.substring(0, 20000) : '';
      const prompt = `
            Genera 5-8 flashcards educativas en ESPAÑOL basándote EXCLUSIVAMENTE en el contenido del texto fuente.
            Contexto del curso: "${context}".
            
            REGLAS:
            1. No uses conocimiento externo al texto proporcionado.
            2. Cada flashcard debe incluir un "image_prompt" (descripción visual detallada en INGLÉS para generar imagen).
            
            Devuelve SOLO un JSON (array):
            [
              {
                "front_text": "Pregunta o Concepto extraído del texto",
                "back_text": "Respuesta o Definición hallada en el texto",
                "image_prompt": "Visual description in English (minimalist, 3D render, textbook style)",
                "difficulty_level": 3,
                "tags": ["tema_especifico"]
              }
            ]

            Texto Fuente: """${cleanContent}"""
          `;

      const payload = { contents: [{ parts: [{ text: prompt }] }] };
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();

      const cards = JSON.parse(text).map((c: any, idx: number) => ({
        ...c,
        id: `gen-${Date.now()}-${idx}`,
        is_active: true,
        points_value: 10,
        created_at: new Date().toISOString()
      }));

      return new Response(JSON.stringify(cards), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 3. ANALYZE CONTENT FOR TOPICS
    if (action === 'analyze') {
      const cleanContent = content ? content.substring(0, 30000) : '';
      const prompt = `
            Analiza el siguiente contenido educativo y extrae los 5-10 temas principales para estudiar.
            Para cada tema, asigna un nivel de relevancia (0-100) y estima cuántas flashcards se podrían generar (por defecto 5).
            
            Devuelve SOLO un JSON (array):
            [
              {
                "id": "topic-1",
                "title": "Nombre del Tema",
                "snippet": "Breve descripción o contexto del tema extraído del texto...",
                "relevance": 95,
                "cardCount": 5,
                "selected": true
              }
            ]
            
            Contenido: """${cleanContent}"""
            `;

      const payload = { contents: [{ parts: [{ text: prompt }] }] };
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();

      return new Response(text, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 4. GENERATE FLASHCARDS FROM TOPICS
    if (action === 'generate-cards') {
      const cleanContent = content ? content.substring(0, 30000) : '';
      const topicsList = topics.map((t: any) => `${t.title}: ${t.cardCount} tarjetas`).join('\n');

      const prompt = `
            Genera flashcards educativas basadas en los siguientes temas y el contenido proporcionado.
            
            Temas seleccionados:
            ${topicsList}
            
            REGLAS CRÍTICAS DE IDIOMA:
            1. "front_text" (La pregunta/concepto) -> DEBE SER ESPAÑOL.
            2. "back_text" (La respuesta/definición) -> DEBE SER ESPAÑOL.
            3. "image_prompt" (Descripción visual) -> DEBE SER INGLÉS (English), optimizado para generar imágenes.

            Devuelve SOLO un JSON (array):
            [
              {
                "front_text": "¿Pregunta en Español?",
                "back_text": "Respuesta detallada en Español.",
                "image_prompt": "Minimalist educational illustration of [Concept], white background, high quality",
                "difficulty_level": 3,
                "tags": ["tema_correspondiente"]
              }
            ]

            Contenido base: """${cleanContent}"""
            `;

      const payload = { contents: [{ parts: [{ text: prompt }] }] };
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();

      const cards = JSON.parse(text).map((c: any, idx: number) => ({
        ...c,
        id: `gen-cards-${Date.now()}-${idx}`,
        is_active: true,
        points_value: 10,
        created_at: new Date().toISOString()
      }));

      return new Response(JSON.stringify(cards), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 4.5. GENERATE QUIZ QUESTIONS (SAFE RAG-LIKE)
    if (action === 'generate-quiz') {
      const cleanContent = content ? content.substring(0, 40000) : '';
      const { numQuestions = 5, difficulty = 'medium', quizType = 'multiple_choice' } = body;

      const prompt = `
            ACTÚA COMO UN EXPERTO PEDAGOGO Y EVALUADOR.
            Tu tarea es generar un examen (quiz) de ${numQuestions} preguntas de tipo selección múltiple.
            
            BASADO EXCLUSIVAMENTE EN ESTE TEXTO:
            """${cleanContent}"""
            
            REGLAS CRÍTICAS DE SEGURIDAD (ANTI-ALUCINACIONES):
            1. SOLO genera preguntas cuyas respuestas estén EXPLÍCITAMENTE en el texto.
            2. Si el texto no menciona un dato, NO PREGUNTES sobre él.
            3. Genera 4 opciones para cada pregunta (A, B, C, D).
            4. Indica claramente cuál es la correcta.
            5. Agrega una explicación breve de por qué es la correcta, citando el texto.
            6. IDIOMA: ESPAÑOL.
            7. Nivel de dificultad: ${difficulty}.
            
            FORMATO DE RESPUESTA JSON REQUERIDO:
            [
              {
                "question_text": "¿Pregunta clara?",
                "question_type": "multiple_choice",
                "points": 10,
                "options": [
                  { "text": "Opción A incorrecta", "correct": false },
                  { "text": "Opción B correcta", "correct": true },
                  { "text": "Opción C incorrecta", "correct": false },
                  { "text": "Opción D incorrecta", "correct": false }
                ],
                "explanation": "Explicación basada en el texto..."
              }
            ]
            
            Devuelve SOLO el JSON, sin markdown, sin introducciones.
      `;

      const payload = { contents: [{ parts: [{ text: prompt }] }] };
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      // Limpieza de markdown
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();

      let questions = [];
      try {
        questions = JSON.parse(text);
      } catch (e) {
        console.error("Error parsing AI JSON response:", text);
        throw new Error("La IA generó una respuesta con formato inválido. Intenta de nuevo.");
      }

      // Post-procesamiento
      const processedQuestions = questions.map((q: any, idx: number) => ({
        ...q,
        id: `ai-q-${Date.now()}-${idx}`,
        order_index: idx,
        is_required: true,
        partial_credit: false
      }));

      return new Response(JSON.stringify(processedQuestions), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 5. REFINE OR TRANSLATE PROMPT FOR IMAGES
    if (action === 'refine-prompt') {
      const { prompt: userPrompt } = body;
      const prompt = `
            Translate the following text to ENGLISH and convert it into a highly descriptive AI image generation prompt.
            The style should be educational, clean, and professional (like a textbook illustration or a 3D medical render).
            
            Source Text: "${userPrompt}"
            
            Return ONLY the English prompt text, no quotes, no conversational filler.
            `;

      const payload = { contents: [{ parts: [{ text: prompt }] }] };
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(await response.text());
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      return new Response(JSON.stringify({ prompt: text }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 6. GENERATE IMAGE - Gemini 2.5 Flash Image (modelo oficial para generación de imágenes)
    if (action === 'generate-image') {
      const { prompt } = body;
      let lastError = 'No attempt made';

      // Helper: fetch con timeout usando AbortController
      const fetchWithTimeout = (url: string, options: RequestInit, timeoutMs: number) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        return fetch(url, { ...options, signal: controller.signal })
          .finally(() => clearTimeout(timer));
      };

      // Usar gemini-2.5-flash-image (modelo oficial de Google para generación de imágenes)
      // Documentación: https://ai.google.dev/gemini-api/docs/image-generation
      try {
        console.log("Generating image with gemini-2.5-flash-image...");
        const GEMINI_IMG_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`;

        const geminiPayload = {
          contents: [{
            parts: [{ text: `Create a professional educational illustration for a flashcard: ${prompt}. Style: clean, minimalist, white background, suitable for a medical/science textbook. Do not include any text or labels.` }]
          }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"]
          }
        };

        const geminiResponse = await fetchWithTimeout(GEMINI_IMG_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify(geminiPayload)
        }, 30000); // 30s timeout para generación de imagen

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          const parts = geminiData.candidates?.[0]?.content?.parts || [];
          for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
              const mimeType = part.inlineData.mimeType || 'image/png';
              console.log("SUCCESS: Image generated with Gemini 2.5 Flash Image");
              return new Response(JSON.stringify({
                url: `data:${mimeType};base64,${part.inlineData.data}`,
                provider: 'gemini-image'
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              });
            }
          }
          // Gemini respondió OK pero sin datos de imagen
          const partKeys = parts.map((p: any) => Object.keys(p));
          lastError = `Gemini OK but no image in response. Parts: ${JSON.stringify(partKeys)}`;
          console.warn(lastError);
        } else {
          const errBody = await geminiResponse.text();
          lastError = `HTTP ${geminiResponse.status}: ${errBody.substring(0, 500)}`;
          console.error("Gemini error:", lastError);
        }
      } catch (e: any) {
        lastError = e.name === 'AbortError' ? 'Timeout 30s' : `Exception: ${e.message}`;
        console.error("Gemini exception:", lastError);
      }

      // Devolver error CON DETALLE para debug
      return new Response(JSON.stringify({
        error: `Gemini image gen failed: ${lastError}`,
        url: null
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Acción no soportada en este entorno optimizado' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
