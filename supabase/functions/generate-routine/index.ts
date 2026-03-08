import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { goals, equipment, daysPerWeek, fitnessLevel, focusAreas } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a fitness routine generator. Based on user preferences, create a structured weekly workout routine.

Return a JSON object using this EXACT structure (no markdown, just raw JSON):
{
  "name": "Routine Name",
  "days": [
    {
      "label": "Day 1 - Push",
      "exercises": [
        { "name": "Bench Press", "muscleGroup": "Chest", "defaultReps": 10, "defaultSets": 3 }
      ]
    }
  ]
}

Exercise library to choose from:
- Glutes/Hams: Hip Thrusts, RDLs, Bulgarian Split Squats, Cable Kickbacks, Hamstring Curls, Glute Bridge, Cable Abductions
- Shoulders: Shoulder Press (DB), Shoulder Press (BB), Arnold Press, Lateral Raises, Rear Delt Fly, Face Pulls
- Back: Lat Pulldown, Chest-Supported Row, Seated Cable Row, Pull-Ups
- Quads: Squats (BB), Squats (Machine), Leg Press, Walking Lunges, Step Ups, Leg Extension
- Chest: Bench Press, Incline DB Press, Machine Chest Press
- Arms: Tricep Pushdowns, Overhead Extensions, Hammer Curls, Bicep Curls
- Core: Hanging Leg Raises, Russian Twists, Cable Crunches, Weighted Plank

Rules:
- Use ONLY exercises from the library above
- Each day should have 4-6 exercises
- Adjust volume based on fitness level (beginner=fewer sets, advanced=more)
- Match the number of days to user's schedule
- Focus on user's selected focus areas
- Use proper muscleGroup labels matching the categories above`;

    const userPrompt = `Create a workout routine for:
- Goals: ${goals.join(", ")}
- Equipment: ${equipment}
- Days per week: ${daysPerWeek}
- Fitness level: ${fitnessLevel}
- Focus areas: ${focusAreas.join(", ")}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";
    
    // Strip markdown code fences if present
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    const routine = JSON.parse(content);

    return new Response(JSON.stringify(routine), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-routine error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
