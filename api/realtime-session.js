// File: /api/realtime-session.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }

  try {
    const { sdp, voice } = req.body || {};
    if (!sdp) return res.status(400).json({ error: 'Missing SDP in body' });

    const r = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview',   // <- if needed you can switch to 'gpt-4o-mini-realtime-preview'
        voice: voice || 'alloy',
        sdp
      })
    });

    if (!r.ok) {
      const text = await r.text();        // bubble up detailed error so you see it in your UI log
      return res.status(r.status).send(text);
    }

    const data = await r.json();          // { answer: "v=0\r\no=..." }
    return res.status(200).json(data);

  } catch (err) {
    console.error('realtime-session error:', err);
    return res.status(500).json({ error: err?.message || 'internal_error' });
  }
}
