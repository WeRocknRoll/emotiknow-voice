export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const requestedVoice = url.searchParams.get("voice");

    const SUPPORTED_VOICES = [
      "alloy","ash","ballad","coral","echo",
      "sage","shimmer","verse","marin","cedar"
    ];
    const voice = SUPPORTED_VOICES.includes(requestedVoice)
      ? requestedVoice
      : "shimmer";

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY env variable" });
    }

    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "realtime=v1",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview",
        voice,
        turn_detection: {
          type: "server_vad",
          threshold: 0.50,
          prefix_padding_ms: 350,
          silence_duration_ms: 2000,
        },
        instructions: `You are Emma, EmotiKnow’s calm, supportive companion.
Speak clearly and warmly. Keep answers concise unless asked for depth.
Support English + Traditional Chinese + Spanish + Korean.`,
      }),
    });

    const text = await r.text(); // always read raw
    if (!r.ok) {
      return res.status(r.status).json({ error: text });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(500).json({ error: "Invalid JSON from OpenAI", text });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
