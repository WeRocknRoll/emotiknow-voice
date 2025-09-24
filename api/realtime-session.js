// api/realtime-session.js
export default async function handler(req, res) {
  // --- CORS (allow your site or "*" while testing) ---
  const allowOrigin = process.env.CORS_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, OpenAI-Beta"
  );
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY in environment" });
    }

    // Read ?voice=... (optional) and clamp to supported set
    const url = new URL(req.url, `https://${req.headers.host}`);
    const requestedVoice = url.searchParams.get("voice") || "shimmer";
    const SUPPORTED_VOICES = [
      "alloy","ash","ballad","coral","echo","sage","shimmer","verse","marin","cedar"
    ];
    const voice = SUPPORTED_VOICES.includes(requestedVoice) ? requestedVoice : "shimmer";

    // Cheapest realtime model for now
    const model = "gpt-4o-mini-realtime-preview";

    // Create a Realtime session
    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "realtime=v1",
      },
      body: JSON.stringify({
        model,
        voice,
        // Voice Activity Detection to keep calls natural and cheap
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 400,
          silence_duration_ms: 2800
        },
        // Keep responses tight unless user requests more
        max_response_output_tokens: 350,
        instructions:
          "You are Emma, EmotiKnow’s warm, helpful voice companion. " +
          "Engage naturally, ask brief follow-ups, and keep answers concise unless asked for detail. " +
          "If the user is quiet, prompt gently.",
      }),
    });

    // Forward real error body, don’t crash the function
    const text = await r.text().catch(() => "");
    if (!r.ok) {
      try {
        const asJson = JSON.parse(text);
        return res.status(r.status).json({ error: "OpenAI error", body: asJson });
      } catch {
        return res.status(r.status).send(text || "OpenAI returned an error without a body");
      }
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(500).json({ error: "Failed to parse OpenAI response as JSON", body: text });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({
      error: "Server error in /api/realtime-session",
      message: err?.message || String(err),
      stack: err?.stack || null,
    });
  }
}
