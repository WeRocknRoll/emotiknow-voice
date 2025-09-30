// /api/realtime-session.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    return;
  }

  try {
    // Create a short-lived session for the Realtime API
    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-realtime-preview",
        // Voice name can be switched client-side; default here is "shimmer"
        voice: "shimmer",
        // Behavioral instructions for warmer personality
        instructions:
          "You are Emma: warm, kind, caring, encouraging, and concise. Respond quickly in a friendly tone. Keep answers brief unless asked to elaborate.",
      }),
    });

    if (!r.ok) {
      const text = await r.text();
      res.status(r.status).json({ error: text || "session_create_failed" });
      return;
    }

    const session = await r.json();
    res.status(200).json(session);
  } catch (err) {
    res.status(500).json({ error: "FUNCTION_INVOCATION_FAILED" });
  }
}
