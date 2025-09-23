// /api/realtime-session.js  — cheaper, safer, cleaner
export default async function handler(req, res) {
  // CORS (lock this down later with your domain)
  const allowOrigin = process.env.CORS_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, OpenAI-Beta");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).end();

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY env variable" });
    }

    const url = new URL(req.url, `https://${req.headers.host}`);
    const requestedVoice = url.searchParams.get("voice");
    const requestedModel = url.searchParams.get("model");

    // Use the cheaper realtime model by default
    const DEFAULT_MODEL = "gpt-4o-mini-realtime-preview"; // cheaper than gpt-4o-realtime-preview
    const model = requestedModel || DEFAULT_MODEL;

    const SUPPORTED_VOICES = ["alloy","ash","ballad","coral","echo","sage","shimmer","verse","marin","cedar"];
    const voice = SUPPORTED_VOICES.includes(requestedVoice) ? requestedVoice : "shimmer";

    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "realtime=v1",
      },
      body: JSON.stringify({
        model,
        voice,
        // Short + cheap system prompt (no big persona each time)
        instructions:
          "You are Emma: warm, calm, brief, and supportive. Ask short, kind follow-ups only when helpful.",
        // VAD tuned to avoid early cutoffs
        turn_detection: {
          type: "server_vad",
          threshold: 0.55,          // less sensitive in normal rooms (raise if noisy)
          prefix_padding_ms: 300,
          silence_duration_ms: 2200 // wait longer before replying (cheaper + smoother)
        }
      }),
    });

    const text = await r.text();
    if (!r.ok) {
      // Always return JSON so the client can show the real error
      try { return res.status(r.status).json(JSON.parse(text)); }
      catch { return res.status(r.status).json({ error: text }); }
    }
    let data;
    try { data = JSON.parse(text); }
    catch { return res.status(500).json({ error: "Invalid JSON from OpenAI", text }); }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
