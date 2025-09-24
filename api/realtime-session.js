// /api/realtime-session.js
export default async function handler(req, res) {
  // --- CORS: allow your site (or all during testing) ---
  const allowOrigin = process.env.CORS_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).end("Method Not Allowed");

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: "Missing OPENAI_API_KEY env var" });
  }

  try {
    // Parse query
    const url = new URL(req.url, `https://${req.headers.host}`);
    const requestedVoice = (url.searchParams.get("voice") || "").toLowerCase();
    const maxMins = Math.max(
      1,
      Math.min(120, parseInt(url.searchParams.get("max") || "20", 10))
    );

    // Voices supported by the Realtime API as of now
    const SUPPORTED_VOICES = [
      "alloy",
      "ash",
      "ballad",
      "coral",
      "echo",
      "sage",
      "shimmer",
      "verse",
      "marin",
      "cedar",
    ];
    const voice = SUPPORTED_VOICES.includes(requestedVoice)
      ? requestedVoice
      : "shimmer";

    // Prefer cheaper model first; fall back to the full one
    const PRIMARY_MODEL = "gpt-4o-mini-realtime-preview";
    const FALLBACK_MODEL = "gpt-4o-realtime-preview";

    async function createSession(model) {
      const body = {
        // WebRTC session token; the browser will use this with RTCPeerConnection
        model,
        // Ask the server to auto-detect when the user is speaking
        turn_detection: {
          type: "server_vad",
          threshold: 0.45,
          prefix_padding_ms: 300,
          silence_duration_ms: 1600, // shorter = more responsive, longer = fewer cuts
        },
        // Friendly default persona
        instructions:
          "You are Emma, a warm, supportive voice companion for EmotiKnow. " +
          "Greet the user briefly when the call connects, then listen and " +
          "respond naturally. Keep replies concise unless asked for more detail. " +
          "Be encouraging and positive.",
        // Let the server enforce a max session duration (soft limit)
        // (not all backends use this; the client still enforces max too)
        // session_max_duration_minutes: maxMins, // optional; safe to omit
        voice, // must be one of the supported voices above
      };

      const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          // Required to use the Realtime sessions endpoint
          "OpenAI-Beta": "realtime=v1",
        },
        body: JSON.stringify(body),
      });

      if (!r.ok) {
        const text = await r.text().catch(() => "");
        const err = new Error(`OpenAI session error: ${r.status} ${text}`);
        err.status = r.status;
        throw err;
      }
      return r.json();
    }

    // Try cheaper model, then fall back if needed
    let data, usedModel = PRIMARY_MODEL;
    try {
      data = await createSession(PRIMARY_MODEL);
    } catch (e) {
      // Only fall back on 4xx/5xx from OpenAI; otherwise bubble up
      usedModel = FALLBACK_MODEL;
      data = await createSession(FALLBACK_MODEL);
    }

    // Minimal response the client needs: client_secret + id + context
    res.status(200).json({
      id: data.id,
      client_secret: data.client_secret,
      model: usedModel,
      voice,
      max_minutes: maxMins,
    });
  } catch (err) {
    console.error("realtime-session handler error:", err);
    res
      .status(500)
      .json({ error: "FUNCTION_INVOCATION_FAILED", detail: String(err?.message || err) });
  }
}
