
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Determinar semana actual
    const now = new Date();
    // Simple week number calc (can be improved)
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const pastDays = Math.floor((now.valueOf() - startOfYear.valueOf()) / 86400000);
    const weekNumber = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);
    const year = now.getFullYear();

    console.log(`Processing reports for Week ${weekNumber}, Year ${year}`);

    // 2. Obtener estudiantes que necesitan reporte
    // Llamada a la función SQL que creamos
    const { data: students, error: fetchError } = await supabase.rpc(
      "get_students_needing_weekly_report",
      {
        p_week_number: weekNumber,
        p_year: year,
        p_limit: 10 // Procesamos en lotes pequeños para evitar timeouts
      }
    );

    if (fetchError) throw fetchError;

    if (!students || students.length === 0) {
      return new Response(JSON.stringify({ message: "No pending reports for this week." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${students.length} students needing reports.`);

    const results = [];

    // 3. Procesar cada estudiante
    for (const student of students) {
      try {
        // 3.1 Obtener actividad detallada
        const { data: activity } = await supabase.rpc("get_student_weekly_activity", {
          p_student_id: student.student_id,
          p_course_id: student.course_id
        });

        // 3.2 Generar Análisis con Gemini
        const prompt = `
            Actúa como un Tutor Académico experto en Medicina. 
            Analiza la actividad de este estudiante en la última semana y genera un reporte breve y motivador.
            
            ACTIVIDAD: ${JSON.stringify(activity)}
            
            Requisitos:
            1. Responde SOLO en formato JSON válido.
            2. Estructura:
               {
                 "summary": "Resumen de su desempeño en 2 frases",
                 "strengths": ["Fortaleza 1", "Fortaleza 2"],
                 "weaknesses": ["Debilidad 1 (constructiva)"],
                 "path_forward": "Sugerencia concreta para la próxima semana"
               }
            3. Sé empático pero riguroso.
            `;

        const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });

        if (!aiRes.ok) throw new Error(`Gemini API Error: ${aiRes.statusText}`);

        const aiData = await aiRes.json();
        const aiText = aiData.candidates[0].content.parts[0].text;
        const reportJson = JSON.parse(aiText);
        const tokensUsed = aiData.usageMetadata?.totalTokenCount || 0;

        // 3.3 Guardar Reporte
        const { error: insertError } = await supabase.from("tutor_weekly_reports").insert({
          student_id: student.student_id,
          course_id: student.course_id,
          week_number: weekNumber,
          year: year,
          report_json: reportJson,
          tokens_used: tokensUsed
        });

        if (insertError) throw insertError;

        results.push({ student: student.student_id, status: "generated" });

      } catch (err: any) { // Type 'unknown' is safer but 'any' is practical here for quick error log access
        console.error(`Error processing student ${student.student_id}:`, err);
        results.push({ student: student.student_id, status: "error", error: err.message });
      }
    }

    return new Response(JSON.stringify({
      message: "Batch processing completed",
      processed: results.length,
      details: results
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) { // Valid type annotation for error handling
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
