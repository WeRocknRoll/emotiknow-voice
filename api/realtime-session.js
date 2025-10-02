// /api/realtime-session.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sdp, voice } = req.body || {};
    if (!sdp) {
      return res.status(400).json({ error: 'Missing SDP in request body' });
    }

    // TODO: Replace this with your real voice service:
    //  - Send `sdp` + `voice` to your Realtime/TTS server
    //  - Receive `answerSdp`
    //  - return res.status(200).json({ answer: answerSdp });

    return res
      .status(501)
      .json({ error: 'Voice backend not configured yet. Running local-only.' });

  } catch (e) {
    return res.status(500).json({ error: e?.message || 'server error' });
  }
}
