const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function saveToDb(result: Record<string, unknown>) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    // Fallback: try DB URL
    const dbUrl = Deno.env.get("SUPABASE_DB_URL");
    return;
  }
  try {
    await fetch(`${supabaseUrl}/rest/v1/_gemini_test?on_conflict=id`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
        "apikey": serviceKey,
        "Prefer": "resolution=merge-duplicates",
      },
      body: JSON.stringify({ id: 1, result }),
    });
  } catch (e) {
    // Store the error too
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  const hasKey = typeof apiKey === "string" && apiKey.length > 0;

  if (!hasKey) {
    const result = {
      success: false,
      error: "GEMINI_API_KEY is not set or empty",
      hasKey: false,
      timestamp: new Date().toISOString(),
    };
    await saveToDb(result);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const configuredModel = (Deno.env.get("GEMINI_MODEL") ?? "").trim() || "gemini-1.5-flash";
  const models = [
    ...(configuredModel !== "gemini-1.5-flash" ? [configuredModel] : []),
    "gemini-1.5-flash",
    "gemini-2.0-flash",
    "gemini-flash-latest",
  ];

  const weatherContext = [
    "- City: London",
    "- Condition: Rain (light rain)",
    "- Temperature: 12°C",
    "- Feels Like: 10°C",
    "- Min/Max: 10/14°C",
    "- Humidity: 85%",
    "- Wind: 6 m/s SW",
    "- Pressure: 1008 hPa",
    "- Visibility: 5.0 km",
    "- Cloudiness: 90%",
  ].join("\n");

  const prompt = "You are a friendly weather assistant for everyday users.\n" +
    "Analyse the current weather readings below and reply with JSON ONLY " +
    "(no markdown fences, no extra text) using exactly these keys:\n" +
    '{"summary","clothing","travel","health","activity","alert"}\n' +
    "Each value must be one or two short, practical sentences in simple English.\n" +
    'If there is no rain or heat risk, set "alert" to a calm reassurance.\n\n' +
    `Current readings:\n${weatherContext}\n`;

  const results: Record<string, unknown>[] = [];

  for (const modelName of models) {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const res = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const status = res.status;
      let bodyText = "";
      try { bodyText = await res.text(); } catch { /* ignore */ }

      let parsed: unknown = null;
      try { parsed = JSON.parse(bodyText); } catch { /* not JSON */ }

      let extractedText = "";
      if (res.ok) {
        try {
          const data = parsed as Record<string, unknown>;
          const candidates = data.candidates as Array<Record<string, unknown>> | undefined;
          const content = candidates?.[0]?.content as Record<string, unknown> | undefined;
          const partsArr = content?.parts as Array<Record<string, unknown>> | undefined;
          extractedText = partsArr?.map((p) => p.text ?? "").join("") ?? "";
        } catch { /* ignore */ }
      }

      results.push({
        model: modelName,
        httpStatus: status,
        ok: res.ok,
        extractedTextLength: extractedText.length,
        extractedTextPreview: extractedText.slice(0, 500),
        errorSnippet: res.ok ? "" : bodyText.slice(0, 500),
      });

      if (res.ok && extractedText.length > 0) {
        const cleaned = extractedText.replace(/^```(?:json)?\s*/gm, "").replace(/```\s*$/gm, "").trim();
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            const parsedJson = JSON.parse(match[0]);
            const keys = Object.keys(parsedJson);
            const requiredKeys = ["summary", "clothing", "travel", "health", "activity", "alert"];
            const hasAllKeys = requiredKeys.every(k => keys.includes(k));

            const result = {
              success: true,
              hasKey: true,
              keyLength: apiKey.length,
              keyPrefix: apiKey.slice(0, 6),
              workingModel: modelName,
              configuredModel,
              modelsTried: results,
              parsedKeys: keys,
              hasAllRequiredKeys: hasAllKeys,
              fullInsights: parsedJson,
              rawResponse: extractedText.slice(0, 1000),
              timestamp: new Date().toISOString(),
            };

            await saveToDb(result);
            return new Response(JSON.stringify(result, null, 2), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          } catch {
            // JSON parse failed, continue trying
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown error";
      results.push({
        model: modelName,
        httpStatus: 0,
        ok: false,
        error: `fetch_error: ${msg}`,
      });
    }
  }

  const failResult = {
    success: false,
    hasKey: true,
    keyLength: apiKey.length,
    keyPrefix: apiKey.slice(0, 6),
    configuredModel,
    error: "All models failed to return valid JSON insights",
    modelsTried: results,
    timestamp: new Date().toISOString(),
  };

  await saveToDb(failResult);
  return new Response(JSON.stringify(failResult, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
