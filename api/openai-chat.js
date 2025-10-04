// /api/openai-chat.js
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing OPENAI_API_KEY" });

    // Simple, safe text completion/chat (adjust model & system as you like)
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are Emma, a warm, concise companion. Keep responses friendly and brief." },
          { role: "user", content: prompt }
        ],
        temperature: 0.6
      })
    });

    const j = await r.json();
    if (!r.ok) {
      const msg = j?.error?.message || JSON.stringify(j);
      return res.status(r.status).json({ error: msg });
    }

    const text = j.choices?.[0]?.message?.content || "";
    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
