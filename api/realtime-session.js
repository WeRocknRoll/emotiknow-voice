// Vercel Serverless Function — creates a short-lived client_secret for WebRTC
// Path: /api/realtime-session.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    // Allow a simple GET for quick health checks (optional)
    return res
      .status(405)
      .json({ error: "Method not allowed. Use POST to create a session." });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    // You can pass a desired voice/personality from the client if you want:
    const { voice = "shimmer", model = "gpt-4o-mini-realtime-preview-2024-12-17" } =
      (req.body && typeof req.body === "object") ? req.body : {};

    // IMPORTANT: the Realtime session must include BOTH audio and text
    const body = {
      model,
      voice,                             // "shimmer", "alloy", etc.
      modalities: ["audio", "text"],     // <-- the fix
      // Optional niceties:
      input_audio_format: "pcm16",
      output_audio_format: "pcm16",
      // Lower initial latency:
      turn_detection: { type: "server_vad", threshold: 0.7, prefix_ms: 250 },
      // A softer, caring vibe right from system prompt:
      instructions:
        "You are Emma: warm, gentle, kind. Be concise, friendly, and supportive. " +
        "Acknowledge feelings, keep responses natural, and speak at a calm pace."
    };

    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const err = await safeJson(r);
      return res.status(r.status).json({ error: err || `Upstream ${r.status}` });
    }

    const session = await r.json();

    // Allow browser usage from any origin (adjust if you want to restrict)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).json(session);
  } catch (e) {
    return res.status(500).json({ error: e?.message || "Server error" });
  }
}

function safeJson(r) {
  return r.text().then(t => {
    try { return JSON.parse(t); } catch { return t; }
  });
}
