// api/realtime-session.js
// Vercel: Serverless (Node) function for OpenAI Realtime ephemeral session tokens

export default async function handler(req, res) {
  // ---- CORS (adjust when you put this on your prod domain) ----
  const allowOrigin = process.env.CORS_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, OpenAI-Beta");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  // ---- Safety: API key required ----
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY is not set on the server" });
  }

  try {
    // ---- Read and clamp requested voice ----
    const url = new URL(req.url, `https://${req.headers.host}`);
    const requested = (url.searchParams.get("voice") || "").toLowerCase();

    const SUPPORTED_VOICES = [
      "alloy", "ash", "ballad", "coral", "echo",
      "sage", "shimmer", "verse", "marin", "cedar"
    ];
    const voice = SUPPORTED_VOICES.includes(requested) ? requested : "shimmer";

    // ---- Model + behavior settings ----
    // NOTE: Some fields (like "max_minutes") are *not* accepted by the Realtime endpoint,
    // so we keep that as a *client-side timer* only.
    const body = {
      model: "gpt-4o-mini-realtime-preview",
      voice,
      // Make Emma warm, supportive, and a touch more talkative
      instructions: `You are Emma, EmotiKnow’s warm, kind, and supportive voice companion.
Speak gently and with care, like a thoughtful friend or counselor.
Be encouraging, curious, and present. 
Use complete sentences and a calm pace. 
If the user pauses or seems unsure, softly invite them to continue.
Keep responses concise by default, but expand when asked for detail.`,

      // Keep hands-free: server side Voice Activity Detection
      turn_detection: {
        type: "server_vad",
        // Slightly less sensitive so small background noises don't interrupt
        threshold: 0.60,
        // A small buffer before model begins speaking (helps reduce cut-offs)
        prefix_padding_ms: 500,
        // Wait longer before deciding the user has finished
        silence_duration_ms: 2500
      }
    };

    // ---- Create an ephemeral Realtime session token ----
    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "realtime=v1"
      },
      body: JSON.stringify(body)
    });

    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return res.status(500).json({
        error: "Failed to create session",
        status: r.status,
        body: text
      });
    }

    const data = await r.json();

    // Return only what the client needs
    return res.status(200).json({
      id: data.id,
      client_secret: data.client_secret,  // { value, expires_at }
      model: body.model,
      voice
    });
  } catch (err) {
    return res.status(500).json({
      error: "Server error creating session",
      message: err?.message || String(err)
    });
  }
}
