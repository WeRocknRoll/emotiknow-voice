// /api/realtime-session.js
// Vercel Node runtime (not Edge). Proxies the browser's SDP offer to OpenAI
// and returns the SDP answer as plain text.

export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const offerSdp = await req.text(); // SDP offer from the browser (text/plain)
    if (!offerSdp || !offerSdp.includes("\nv=")) {
      return res.status(400).json({ error: "Bad SDP offer" });
    }

    // Optional query params: ?model=gpt-4o-mini-realtime-preview&voice=shimmer
    const url = new URL(req.url, `http://${req.headers.host}`);
    const model = url.searchParams.get("model") || "gpt-4o-mini-realtime-preview";
    const voice = url.searchParams.get("voice") || "shimmer";

    const openaiResp = await fetch(
      `https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}&voice=${encodeURIComponent(voice)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/sdp",
        },
        body: offerSdp,
      }
    );

    const answerSdp = await openaiResp.text();

    if (!openaiResp.ok || !answerSdp.includes("\nv=")) {
      // If OpenAI returned JSON (error), forward it so you can see it in logs
      try {
        const maybeJson = JSON.parse(answerSdp);
        return res.status(openaiResp.status).json(maybeJson);
      } catch {
        return res
          .status(openaiResp.status)
          .send(answerSdp || "Failed to fetch SDP answer from OpenAI.");
      }
    }

    // Return *plain text* SDP, or the browser will fail with “missing_sdp”
    res.setHeader("Content-Type", "application/sdp");
    res.status(200).send(answerSdp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error", detail: String(err) });
  }
}
