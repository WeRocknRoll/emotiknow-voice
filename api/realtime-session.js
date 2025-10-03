export default async function handler(req, res) {
  try {
    // Allow only POST
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Read body either as raw SDP or JSON { sdp }
    const ct = (req.headers['content-type'] || '').toLowerCase();
    let sdpOffer = '';
    let respondAs = 'sdp'; // or 'json'

    if (ct.includes('application/sdp')) {
      // Raw SDP body
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      sdpOffer = Buffer.concat(buffers).toString('utf8');
      respondAs = 'sdp';
    } else {
      // JSON body: { sdp: string, voice?: string }
      const { sdp } = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      if (!sdp) return res.status(400).json({ error: 'Missing sdp' });
      sdpOffer = sdp;
      respondAs = 'json';
    }

    // Forward the SDP offer to OpenAI Realtime
    const upstream = await fetch('https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/sdp',
      },
      body: sdpOffer,
    });

    const text = await upstream.text();

    if (!upstream.ok) {
      // Bubble up OpenAI error body for easier debugging
      return res.status(upstream.status).send(text);
    }

    // Reply in the same format we received
    if (respondAs === 'sdp') {
      res.setHeader('Content-Type', 'application/sdp');
      return res.status(200).send(text);
    } else {
      // Frontend that expects JSON {answer: "...sdp..."}
      return res.status(200).json({ answer: text });
    }
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
}
