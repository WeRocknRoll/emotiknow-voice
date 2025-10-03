export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  try {
    // expecting JSON: { sdp: "<offer sdp string>" }
    const { sdp } = req.body || {};
    if (!sdp) return res.status(400).send("Missing 'sdp' in body");

    const upstream = await fetch(
      // choose the latest realtime model your key has access to
      "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/sdp",
        },
        body: sdp, // forward the raw SDP offer
      }
    );

    const answer = await upstream.text(); // OpenAI returns raw SDP
    if (!upstream.ok) {
      // bubble the OpenAI error (very helpful when debugging)
      return res.status(upstream.status).send(answer);
    }

    // wrap as JSON for the browser
    res.status(200).json({ answer });
  } catch (err) {
    console.error("realtime-session error:", err);
    res.status(500).send("Server error");
  }
}
