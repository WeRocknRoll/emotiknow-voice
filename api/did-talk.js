// /api/did-talk.js

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).send('Method not allowed');
    }

    const { agentId, text } = req.body || {};
    if (!agentId || !text) {
      return res.status(400).json({ error: 'Missing agentId or text' });
    }

    const DID_KEY = process.env.DID_API_KEY;
    if (!DID_KEY) {
      return res.status(500).json({ error: 'Missing DID_API_KEY' });
    }

    const url = `https://api.d-id.com/agents/${encodeURIComponent(agentId)}/talks`;

    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DID_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text }
      }),
    });

    const json = await r.json();
    if (!r.ok) {
      return res.status(r.status).json(json);
    }

    // Return standardized response with url + raw payload
    return res.status(200).json({
      ok: true,
      url: json?.result_url || json?.stream_url || json?.output_url || null,
      raw: json,
    });
  } catch (err) {
    console.error('Error in did-talk:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}
