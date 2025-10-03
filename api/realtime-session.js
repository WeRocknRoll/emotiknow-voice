// /api/realtime-session.js (Vercel Edge/Node function)
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method Not Allowed');
  }

  try {
    // Expect RAW SDP in the request body
    const offerSdp = await getRawBody(req);
    if (!offerSdp || !offerSdp.includes('v=')) {
      return res.status(400).send('Bad SDP offer');
    }

    const r = await fetch('https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/sdp',
        'Accept': 'application/sdp',
        'OpenAI-Beta': 'realtime=v1'
      },
      body: offerSdp
    });

    const answerSdp = await r.text();
    if (!r.ok) {
      res.status(r.status).send(answerSdp);
      return;
    }

    // Return RAW SDP back to the browser
    res.setHeader('Content-Type', 'application/sdp');
    res.status(200).send(answerSdp);
  } catch (err) {
    res.status(500).send((err && err.message) || String(err));
  }
}

// Read raw text body helper
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => data += chunk);
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
