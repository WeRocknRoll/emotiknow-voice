// /api/did-talk.js
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed (use POST)' });
    }

    const DID_KEY = process.env.DID_API_KEY;
    if (!DID_KEY) {
      return res.status(500).json({ error: 'Missing DID_API_KEY' });
    }

    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (e) {
      return res.status(400).json({ error: 'Body must be JSON' });
    }

    const { agentId, text } = body || {};
    if (!agentId || !text) {
      return res.status(400).json({ error: 'Missing agentId or text' });
    }

    const url = `https://api.d-id.com/agents/${encodeURIComponent(agentId)}/talks`;

    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DID_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: text
        // You can add voice/style options here if you want
      })
    });

    const contentType = r.headers.get('content-type') || '';
    const isJSON = contentType.includes('application/json');

    if (!r.ok) {
      const errPayload = isJSON ? await r.json() : { errorText: await r.text() };
      return res.status(r.status).json({
        error: 'D-ID request failed',
        status: r.status,
        details: errPayload
      });
    }

    const data = isJSON ? await r.json() : {};
    // D-ID returns a talk object; normalize a couple fields we’ll use on the client.
    return res.status(200).json({
      ok: true,
      talk: data,
      // some responses include a direct result url; others include an asset
      videoUrl:
        data?.result_url ||
        data?.result?.url ||
        data?.assets?.video || null
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error', message: String(err?.message || err) });
  }
}
