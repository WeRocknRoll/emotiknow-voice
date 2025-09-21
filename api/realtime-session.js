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
   // allow ?voice=... but clamp to supported names
const url = new URL(req.url, `https://${req.headers.host}`);
const requestedVoice = url.searchParams.get("voice");
const SUPPORTED_VOICES = ["alloy","ash","ballad","coral","echo","sage","shimmer","verse","marin","cedar"];
const voice = SUPPORTED_VOICES.includes(requestedVoice) ? requestedVoice : "shimmer";

body: JSON.stringify({
  model: "gpt-4o-realtime-preview",
  voice,                     // <-- use the clamped value
  turn_detection: {
    type: "server_vad",
    threshold: 0.55,
    prefix_padding_ms: 300,
    silence_duration_ms: 1600
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
