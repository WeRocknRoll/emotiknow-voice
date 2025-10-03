// /api/realtime-session.js
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // 1) Read the browser's OFFER SDP
    const { sdp, voice } = req.body || {};
    if (!sdp) {
      res.status(400).json({ error: 'Missing offer SDP' });
      return;
    }

    // 2) Forward the OFFER directly to OpenAI Realtime as application/sdp
    //    (Replace with your Realtime model & account endpoint if needed)
    const upstream = await fetch('https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/sdp',
      },
      // IMPORTANT: body is the RAW OFFER (NO JSON.stringify)
      body: sdp,
    });

    if (!upstream.ok) {
      const txt = await upstream.text();
      res.status(upstream.status).json({ error: JSON.parse(txt).error || txt });
      return;
    }

    // 3) Get the ANSWER SDP as plain text
    const answerSDP = await upstream.text();

    // 4) Return JSON {answer: "<RAW_ANSWER_SDP>"} to the browser
    res.status(200).json({ answer: answerSDP });

  } catch (err) {
    res.status(500).json({ error: (err && err.message) || String(err) });
  }
}
