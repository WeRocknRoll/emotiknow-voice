// /api/realtime-session.js
// Vercel Serverless Function – creates a Realtime session with OpenAI
// Works for both POST (from your app) and GET (for quick browser testing)

const allowOrigin = process.env.ALLOWED_ORIGIN || "*";
const MODEL = process.env.REALTIME_MODEL || "gpt-4o-mini-realtime-preview";
const DEFAULT_VOICE = process.env.REALTIME_VOICE || "shimmer";

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization,Accept"
  );
}

export default async function handler(req, res) {
  cors(res);

  // Preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // This was the reason for your 500s earlier
    return res.status(500).json({
      error: "Missing OPENAI_API_KEY env var on the server.",
    });
  }

  try {
    // Allow client to override voice/model if desired
    const body =
      req.method === "POST" && req.headers["content-type"]?.includes("application/json")
        ? req.body ?? {}
        : {};

    // Create a short-lived Realtime session
    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: body.model || MODEL,
        // Voice is needed for TTS replies
        voice: body.voice || DEFAULT_VOICE,

        // (Optional but nice) make lips feel warmer/less snappy on TTS
        // You can tune these later in the front end as well
        modalities: ["text", "audio"],
        // Turn detection handled server-side (OpenAI VAD)
        turn_detection: { type: "server_vad" },
      }),
    });

    const data = await r.json();

    if (!r.ok) {
      // Bubble up clean JSON error instead of HTML (that was the “Unexpected token T” you saw)
      return res.status(r.status).json({
        error: data?.error || data,
      });
    }

    // Return only the bits your front-end needs
    // (client_secret.value is the session token for the WebRTC handshake)
    return res.status(200).json({
      id: data.id,
      model: data.model,
      voice: data.voice,
      client_secret: data.client_secret, // { type, value, expires_at }
      expires_at: data.client_secret?.expires_at,
    });
  } catch (err) {
    return res.status(500).json({
      error: "Failed to create Realtime session",
      detail: String(err?.message || err),
    });
  }
}
