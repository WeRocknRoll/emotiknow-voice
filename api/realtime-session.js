// /api/realtime-session.js
// Vercel Serverless Function (Node.js)
// Requires env var: OPENAI_API_KEY

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sdp, voice } = req.body || {};
    if (!sdp || typeof sdp !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "sdp" in body' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Server missing OPENAI_API_KEY' });
    }

    // Choose the realtime model; adjust to the latest available in your account
    const model = 'gpt-4o-realtime-preview';

    // Forward the SDP offer to OpenAI Realtime; receive the SDP answer as plain text
    const resp = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/sdp',
        'OpenAI-Beta': 'realtime=v1',
        // Set the TTS voice to use on the server side
        'X-OpenAI-Audio-Voice': voice || 'alloy'
      },
      body: sdp
    });

    const answerText = await resp.text();

    if (!resp.ok) {
      // Pass through OpenAI error payload for easier debugging
      return res.status(resp.status).send(answerText);
    }

    // Return JSON with {answer: <SDP string>}
    return res.status(200).json({ answer: answerText });
  } catch (err) {
    return res.status(500).json({ error: String(err && err.message || err) });
  }
}
