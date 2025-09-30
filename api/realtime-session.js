/**
 * Minimal Realtime session token endpoint for Vercel “/api/realtime-session”.
 * POST only. Returns { id, client_secret:{ value, expires_at }, model, voice }.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    // Pick a model and a default voice that actually exist for the preview.
    const MODEL = "gpt-4o-mini-realtime-preview";
    // Voices that work with the preview (examples): "shimmer", "verse".
    // You can override from the client via ?voice=shimmer|verse if you’d like.
    const voice = (req.query.voice || "shimmer").toString();

    // IMPORTANT: keep the payload minimal for the preview. Do NOT add
    // modalities, turn_detection, or other options that triggered 400s.
    const createRes = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "realtime=v1"
      },
      body: JSON.stringify({
        model: MODEL,
        voice
      })
    });

    if (!createRes.ok) {
      const text = await createRes.text();
      return res.status(createRes.status).json({ error: text });
    }

    const token = await createRes.json();
    // Mirror back the model/voice for the client UI.
    token.model = MODEL;
    token.voice = voice;

    return res.status(200).json(token);
  } catch (err) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
