export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { voice, instructions } = req.body || {};
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing OPENAI_API_KEY" });

    const payload = {
      model: "gpt-4o-mini-realtime-preview",
      voice: voice || "shimmer",
      instructions: instructions || "Speak kindly and warmly, with concise supportive replies.",
      modalities: ["audio"]
    };

    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const txt = await r.text();
      return res.status(r.status).send(txt);
    }
    const json = await r.json();
    res.status(200).json(json);
  } catch (err) {
    res.status(500).json({ error: "FUNCTION_INVOCATION_FAILED", detail: String(err) });
  }
}
