// /api/realtime-session.js  (Vercel Serverless Function)
export default async function handler(req, res) {
  // Basic CORS (tighten CORS_ORIGIN when you go live)
  const allowOrigin = process.env.CORS_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, OpenAI-Beta"
  );
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).end();

  try {
    // Allow ?voice=aria (falls back to "aria")
    const url = new URL(req.url, `https://${req.headers.host}`);
    const requestedVoice = url.searchParams.get("voice");

    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "realtime=v1",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview",
        voice: requestedVoice || "aria", // <-- default feminine voice
        // Hands-free turn detection (tuned to avoid early cutoffs)
        turn_detection: {
          type: "server_vad",
          threshold: 0.6,
          prefix_padding_ms: 250,
          silence_duration_ms: 1200, // bump down/up if it still cuts early/late
        },
        instructions: `You are Emma, EmotiKnow’s calm, supportive companion.
Speak clearly and warmly. Keep answers concise unless asked for depth.
Support English + Traditional Chinese + Spanish + Korean.`,
      }),
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(500).json({ error: text });
    }
    const data = await r.json(); // includes ephemeral client_secret
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
