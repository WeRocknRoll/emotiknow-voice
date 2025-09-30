// /api/realtime-session.js
// Vercel /api function (CommonJS). No "app/" or "pages/" required.

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    const { voice, instructions } = (req.body && typeof req.body === "object")
      ? req.body
      : {};

    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-realtime-preview",
        voice: voice || "shimmer",
        // Warm, kind, caring defaults; page can override with its own "instructions"
        instructions: instructions || "You are Emma—warm, kind, caring, encouraging, and concise. Reply quickly in a friendly tone. Keep answers brief unless the user asks for detail."
      })
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: text || "session_create_failed" });
    }

    const session = await r.json();
    return res.status(200).json(session);
  } catch (err) {
    return res.status(500).json({ error: "FUNCTION_INVOCATION_FAILED" });
  }
};
