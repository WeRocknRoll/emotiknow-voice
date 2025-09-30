// api/realtime-session.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { voice = "shimmer" } = req.body || {};
    const model = "gpt-4o-mini-realtime-preview";

    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        // Voice options: "shimmer", "verse", "alloy", etc. (keep shimmer for female)
        voice,
        // Audio only; the front-end will render the portrait + mouth
        modalities: ["audio"],
        // Give the model a gentle, kind baseline
        instructions: "You are Emma. Speak warmly, kindly, and concisely. Be caring and supportive."
      })
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: text || "Failed to create session" });
    }

    const json = await r.json();
    // Pass the raw session JSON straight to the browser
    return res.status(200).json(json);
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Server error" });
  }
}
