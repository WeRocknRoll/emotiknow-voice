// api/realtime-session.js
export default async function handler(req, res) {
  // CORS for local testing; tighten when you go live (set your domain).
  const allowOrigin = process.env.CORS_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, OpenAI-Beta"
  );
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).end();

  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    // Allow ?voice=... but clamp to supported names
    const url = new URL(req.url, `https://${req.headers.host}`);
    const requestedVoice = url.searchParams.get("voice") || "shimmer";
    const SUPPORTED_VOICES = [
      "alloy","ash","ballad","coral","echo","sage","shimmer","verse","marin","cedar"
    ];
    const voice = SUPPORTED_VOICES.includes(requestedVoice) ? requestedVoice : "shimmer";

    // Cheaper default; can upgrade on the client later if you want
    const model = "gpt-4o-mini-realtime-preview";

    // Ask OpenAI for an ephemeral client secret for WebRTC
    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "realtime=v1"
      },
      body: JSON.stringify({
        model,
        // keep Emma chatty & forgiving with pauses
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,           // slightly forgiving
          prefix_padding_ms: 400,   // pad before speech start
          silence_duration_ms: 2800 // wait ~2.8s before ending a turn
        },
        voice,                       // one of the supported list above
        max_response_output_tokens: 350,   // allow longer replies
        // Session duration (server may clamp); client can still hang up sooner
        max_minutes: 30,
        // Personality
        instructions:
`You are Emma, EmotiKnow’s warm, helpful voice companion. 
Engage naturally, ask clarifying follow-ups, and keep the conversation flowing.
Be concise unless asked for detail. If the user is silent, gently prompt them.
Avoid long monologues; be conversational.`
      })
    });

    if (!r.ok) {
      const text = await r.text().catch(() => "(no body)");
      return res.status(500).json({ error: "Failed to create session", body: text });
    }
    const data = await r.json();
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
}
