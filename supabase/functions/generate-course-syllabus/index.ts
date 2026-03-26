import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const { action, content, prompt_instructions } = body;

        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) {
            return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY en variables de entorno." }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
            });
        }

        const MODEL_NAME = "gemini-flash-latest"; // Using Flash for speed and good structured output
        const API_VERSION = "v1beta";
        const API_URL = `https://generativelanguage.googleapis.com/${API_VERSION}/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

        if (action === 'generate-syllabus') {
            // Limit input lengths to avoid extreme payload sizes
            const cleanContent = content ? content.substring(0, 50000) : '';
            const customInstructions = prompt_instructions || 'Genera una estructura estándar basada en la información proporcionada.';

            const prompt = `
          ERES UN EXPERTO EN DISEÑO INSTRUCCIONAL Y PEDAGOGÍA UNIVERSITARIA. 
          TU TAREA: Crear un syllabus de curso (Materia -> Unidades -> Sesiones) usando la información proporcionada.
          
          REGLAS CRÍTICAS:
          1. Todo el contenido generado debe estar en ESPAÑOL.
          2. Debes devolver EXCLUSIVAMENTE un bloque JSON válido, sin delimitadores Markdown (\`\`\`json) ni texto introductorio. 
          3. Las descripciones deben ser profesionales, persuasivas y de estilo académico.
          4. Usa las instrucciones específicas del usuario como máxima prioridad: "${customInstructions}".
          
          ESTRUCTURA JSON REQUERIDA (Sigue exactamente este esquema):
          {
            "title": "Título sugerido del curso",
            "description": "Descripción general y justificación del curso.",
            "duration_months": 4, 
            "total_credits": 10,
            "units": [
              {
                "title": "Nombre de la Unidad 1",
                "description": "Objetivo principal de la unidad y contexto.",
                "learning_objectives": ["Identificar X", "Comprender Y"],
                "order": 1,
                "sessions": [
                  { 
                    "title": "Clase 1: Introducción a...", 
                    "description": "Qué se verá específicamente en esta sesión.",
                    "duration_minutes": 120,
                    "order": 1
                  }
                ]
              }
            ]
          }
          
          Contenido Fuente (Syllabus, PDF parseado o transcripción de requisitos):
          """${cleanContent}"""
      `;

            const payload = {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.3, // Low temperature for more deterministic JSON structure
                }
            };

            console.log("Enviando petición a Gemini...");
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error("Error from Gemini API:", errText);
                throw new Error(`Google API respondido con error: ${response.status}`);
            }

            const data = await response.json();
            let responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!responseText) {
                throw new Error("Respuesta vacía o inválida del modelo.");
            }

            // Limpiar markdown residual para asegurar parseo JSON limpio
            responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();

            // Validate JSON internally before sending down to client
            let jsonParsed;
            try {
                jsonParsed = JSON.parse(responseText);
            } catch (parseError) {
                console.error("No se pudo parsear el JSON de Gemini:", responseText);
                throw new Error("El modelo no devolvió un JSON válido. Intenta refrasear tu solicitud.");
            }

            // Return the clean JSON
            return new Response(JSON.stringify(jsonParsed), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            });
        }

        return new Response(JSON.stringify({ error: 'Acción no soportada por esta Edge Function' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error("Edge Function Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
