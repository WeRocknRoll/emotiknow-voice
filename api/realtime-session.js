// Vercel Serverless Function: /api/realtime-session.js
export default async function handler(req, res) {
  // CORS (you can lock this to your domain later)
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
    // Allow ?voice=... from the client, default to a feminine voice
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
        voice: requestedVoice || "aria", // try "aria", "serena", or "alloy"

        // Turn detection tuned to avoid premature cut-offs
        turn_detection: {
          type: "server_vad",
          threshold: 0.55,          // slightly easier to detect your speech
          prefix_padding_ms: 300,   // keep more pre-speech
          silence_duration_ms: 1600 // wait longer before responding (raise to 1800-2000 if needed)
        },

        instructions: `You are Emma, EmotiKnow’s calm, supportive companion.
Speak clearly and warmly. Keep answers concise unless asked for depth.
Support English + Traditional Chinese + Spanish + Korean.`
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
