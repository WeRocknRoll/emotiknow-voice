// /api/realtime-session.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { personality = "ballad" } = (req.body && typeof req.body === "object") ? req.body : {};

    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Realtime model
        model: "gpt-4o-mini-realtime-preview",

        // ✅ must include text with audio
        modalities: ["audio", "text"],

        // Voice & latency
        voice: personality === "ballad" ? "ballad" : "shimmer",
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        turn_detection: { // react faster
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 200,
          silence_duration_ms: 200
        },

        // Persona
        instructions:
          "You are Emma—warm, kind, encouraging, and concise. " +
          "Speak like a caring companion. Be supportive and upbeat. " +
          "When the user greets you, greet them back right away.",

        // Optional tools later (keep empty for now)
        tools: []
      })
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: "session_create_failed", raw: text });
    }

    // Proxy the session JSON back to the client
    const json = await r.json();
    // CORS for local/production
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).json(json);
  } catch (e) {
    return res.status(500).json({ error: "server_error", message: String(e) });
  }
}
