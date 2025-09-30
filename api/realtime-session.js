// /api/realtime-session.js
// Vercel/Pages API route: proxies your WebRTC SDP offer to OpenAI Realtime
// and returns the SDP answer. Voice is passed as a query param (?voice=aria).

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      res.status(500).json({ error: "Missing OPENAI_API_KEY env var" });
      return;
    }

    // Allow selecting voice via query: /api/realtime-session?voice=aria
    const voice = (req.query.voice || "aria").toString();

    // We expect raw SDP in the body
    const sdpOffer = typeof req.body === "string" ? req.body : req.body?.toString?.();

    if (!sdpOffer || !sdpOffer.includes("v=0")) {
      res.status(400).json({ error: "Expected SDP offer in body (Content-Type: application/sdp)" });
      return;
    }

    // Proxy the offer to OpenAI Realtime REST
    // NOTE: Model name here – the preview realtime model that supports voice
    const model = "gpt-4o-mini-realtime-preview";

    const upstream = await fetch(
      `https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}&voice=${encodeURIComponent(voice)}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/sdp"
        },
        body: sdpOffer
      }
    );

    // OpenAI returns SDP answer as text (not JSON)
    const sdpAnswer = await upstream.text();

    if (!upstream.ok) {
      // Helpful surfacing
      console.error("[OpenAI Realtime error]", upstream.status, sdpAnswer);
      res.status(upstream.status).send(sdpAnswer);
      return;
    }

    res.setHeader("Content-Type", "application/sdp");
    res.status(200).send(sdpAnswer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "FUNCTION_INVOCATION_FAILED" });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "2mb",
      type: () => true // allow raw text
    },
  },
};
