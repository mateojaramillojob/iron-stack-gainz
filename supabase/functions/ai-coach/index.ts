import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sessions, profileName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const userName = profileName || "athlete";

    const systemPrompt = `You are an encouraging personal trainer AI coach analyzing workout data for ${userName}.

Given a user's workout session history, provide PROACTIVE, PERSONALIZED insights. Be specific with real numbers from the data.

Rules:
- Address the user by name (${userName}).
- If weekly volume is trending DOWN compared to previous weeks, acknowledge it and encourage a high-volume session.
- If PRs were hit (new max weights), celebrate them specifically by exercise name.
- If consistency is dropping (fewer sessions per week), motivate them to get back on track.
- If volume is trending UP, congratulate the progression.
- Compare this week vs last week concretely.

Return JSON with this structure (no markdown):
{
  "summary": "2-3 sentences of personalized performance summary with specific numbers",
  "takeaways": ["3-4 bullet points comparing recent performance, calling out specific exercises, weights, and trends"],
  "motivation": "1-2 sentences of encouraging, personalized closing using their name"
}`;

    const userPrompt = `Here are the recent workout sessions for ${userName} (most recent first):
${JSON.stringify(sessions.slice(0, 20), null, 2)}

Analyze trends in volume, frequency, weight progression, and consistency. Be specific about exercises, weights, and weekly comparisons.`;

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
        return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const analysis = JSON.parse(content);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-coach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
