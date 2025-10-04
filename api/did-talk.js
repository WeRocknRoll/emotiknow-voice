// /api/did-talk.js
// Creates a talk on a D-ID Agent and returns a playable video/stream URL.

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { agentId, text } = req.body || {};
    if (!agentId) return res.status(400).json({ error: "Missing agentId" });
    if (!text) return res.status(400).json({ error: "Missing text" });

    const didKey = process.env.DID_API_KEY;
    if (!didKey) return res.status(500).json({ error: "Missing DID_API_KEY" });

    // 1) Create a talk on the Agent
    const talkResp = await fetch(`https://api.d-id.com/agents/${encodeURIComponent(agentId)}/talks`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from(didKey + ":").toString("base64")}`, // D-ID uses Basic with the API key as username
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        input: {
          type: "text",
          text
        }
      })
    });

    const talkJson = await talkResp.json();
    if (!talkResp.ok) {
      const msg = talkJson?.error || JSON.stringify(talkJson);
      return res.status(talkResp.status).json({ error: msg });
    }

    // Common fields D-ID returns (names vary by endpoint/version).
    // Try to give the client a directly playable URL.
    const { id, result_url, url, streamUrl, streamingUrl } = talkJson;

    // If D-ID gave us something directly playable, return it
    const direct =
      streamUrl || streamingUrl || result_url || url;

    if (direct) {
      return res.status(200).json({ videoUrl: direct, talkId: id });
    }

    // Otherwise, simple poll for a result_url (fallback)
    let tries = 0;
    let finalUrl = null;

    while (tries < 15) {
      await new Promise(r => setTimeout(r, 1200));
      const s = await fetch(`https://api.d-id.com/agents/${encodeURIComponent(agentId)}/talks/${encodeURIComponent(id)}`, {
        headers: { "Authorization": `Basic ${Buffer.from(didKey + ":").toString("base64")}` }
      });
      const sj = await s.json();
      if (sj?.result_url || sj?.url || sj?.streamUrl || sj?.streamingUrl) {
        finalUrl = sj.result_url || sj.url || sj.streamUrl || sj.streamingUrl;
        break;
      }
      tries++;
    }

    if (!finalUrl) return res.status(202).json({ talkId: id, message: "Processing; try again shortly." });
    return res.status(200).json({ videoUrl: finalUrl, talkId: id });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
