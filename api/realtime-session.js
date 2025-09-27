// /api/realtime-session.js
export default async function handler(req, res) {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  const MODEL = "gpt-4o-mini-realtime-preview";

  if (!OPENAI_KEY) {
    res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    return;
  }

  // GET => hand back a simple token shape (no `.value`)
  if (req.method === "GET") {
    res.status(200).json({ client_secret: OPENAI_KEY });
    return;
  }

  // POST with application/sdp => forward offer to OpenAI, return answer
  if (req.method === "POST") {
    try {
      if (!req.headers["content-type"]?.includes("application/sdp")) {
        return res.status(400).send("Expected Content-Type: application/sdp");
      }

      const chunks = [];
      for await (const c of req) chunks.push(c);
      const offerSdp = Buffer.concat(chunks).toString("utf8");

      const r = await fetch(
        `https://api.openai.com/v1/realtime?model=${encodeURIComponent(MODEL)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_KEY}`,
            "Content-Type": "application/sdp",
            "OpenAI-Beta": "realtime=v1",
          },
          body: offerSdp,
        }
      );

      const answerSdp = await r.text();
      if (!r.ok || !answerSdp.includes("\nv=")) {
        // Try to forward JSON error if present
        try {
          const j = JSON.parse(answerSdp);
          return res.status(r.status).json(j);
        } catch {
          return res.status(r.status).send(answerSdp || "Realtime SDP error");
        }
      }
      res.setHeader("Content-Type", "application/sdp");
      res.status(200).send(answerSdp);
    } catch (e) {
      res.status(500).send(String(e?.message || e));
    }
    return;
  }

  res.setHeader("Allow", "GET, POST");
  res.status(405).send("Method Not Allowed");
}
