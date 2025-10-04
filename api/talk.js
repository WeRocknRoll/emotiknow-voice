// /api/did-talk.js
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).send('Method not allowed');

    const { agentId, text } = req.body || {};
    if (!agentId || !text) return res.status(400).json({ error: 'Missing agentId or text' });

    const DID_KEY = process.env.DID_API_KEY;
    if (!DID_KEY) return res.status(500).json({ error: 'Missing DID_API_KEY' });

    const url = `https://api.d-id.com/agents/${encodeURIComponent(agentId)}/talks`;

    const r = await fetch(url, {
      method:'POST',
      headers:{
        'Authorization': `Bearer ${DID_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: { text }     // you can also provide voice/style options here if desired
      })
    });

    if (!r.ok) {
      const t = await r.text();
      return res.status(r.status).send(t);
    }
    const data = await r.json();

    // D-ID usually returns result_url (or a polling url if async plan)
    return res.json({ result_url: data.result_url || data.url || null, raw: data });
  } catch (e) {
    res.status(500).json({ error: e.message || e.toString() });
  }
}
