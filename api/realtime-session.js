// api/realtime-session.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Expect JSON body: { sdp: "<browser-offer-sdp>" }
    const { sdp } = (typeof req.body === "string") ? JSON.parse(req.body) : req.body || {};
    if (!sdp || typeof sdp !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'sdp' in request body" });
    }

    // Forward *raw* SDP to OpenAI Realtime endpoint.
    // IMPORTANT: keep 'application/sdp' and send the *text* body (no JSON).
    const upstream = await fetch(
      "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/sdp"
        },
        body: sdp
      }
    );

    if (!upstream.ok) {
      const text = await upstream.text();
      return res.status(upstream.status).send(text);
    }

    // OpenAI returns a *plain text* SDP answer; wrap it in JSON for the browser.
    const answer = await upstream.text();
    return res.status(200).json({ answer });
  } catch (err) {
    console.error("Error in /api/realtime-session:", err);
    return res.status(500).json({ error: err?.message || "Server error" });
  }
}
