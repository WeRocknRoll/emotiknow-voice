// pages/api/realtime-session.js
// Vercel "pages" API route that mints a short-lived client_secret
// and configures the Realtime session (voice, fast VAD, personality, etc).

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
  }

  try {
    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-realtime-preview",
        voice: "shimmer",

        // Make Emma feel warm, kind, and caring by default
        instructions:
          "You are Emma. Be warm, kind, and caring. Reply in short, friendly sentences. " +
          "Acknowledge feelings briefly (e.g., 'I hear that was tough') and then help. " +
          "Start speaking promptly as soon as the user finishes.",

        // Faster, more responsive speech turn detection
        turn_detection: { type: "server_vad", silence_duration_ms: 400 },

        // Keep replies compact (speeds perception)
        max_response_output_tokens: 250,

        // Audio output only (we stream a remote audio track)
        modalities: ["audio"]
      }),
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: "session_create_failed", detail: text });
    }

    const json = await r.json();
    // Return the whole thing; the client uses client_secret.value
    return res.status(200).json(json);
  } catch (err) {
    console.error("realtime-session error:", err);
    return res.status(500).json({ error: "FUNCTION_INVOCATION_FAILED" });
  }
}
