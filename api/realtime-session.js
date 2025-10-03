// api/realtime-session.js
// Node.js serverless function for Vercel.
// Accepts JSON { sdp: "v=0..." } and returns { sdp: "answer..." } from OpenAI Realtime.

const MODEL = "gpt-4o-realtime-preview";

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const offerSdp = (req.body && (req.body.sdp || req.body.offer) || "").toString().trim();

    if (!offerSdp || !offerSdp.startsWith("v=")) {
      res.status(400).json({
        error: {
          message: "Invalid SDP offer. Send JSON: { sdp: 'v=0...' }",
          code: "invalid_offer"
        }
      });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(500).json({
        error: { message: "OPENAI_API_KEY is not set", code: "no_api_key" }
      });
      return;
    }

    const openaiResp = await fetch(
      `https://api.openai.com/v1/realtime?model=${encodeURIComponent(MODEL)}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/sdp",
          "OpenAI-Beta": "realtime=v1"
        },
        body: offerSdp
      }
    );

    if (!openaiResp.ok) {
      const detail = await openaiResp.text().catch(() => "");
      res.status(502).json({
        error: { message: "OpenAI upstream error", code: "openai_error", detail }
      });
      return;
    }

    const answerSdp = await openaiResp.text();
    res.status(200).json({ sdp: answerSdp });
  } catch (err) {
    res.status(500).json({
      error: { message: err?.message || "Server error", code: "server_error" }
    });
  }
};
