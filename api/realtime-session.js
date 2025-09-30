// Vercel serverless function – Node (Edge not required)
// POST /api/realtime-session -> { client_secret: { value: "ek_..." }, model, voice }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'OPENAI_API_KEY missing on Vercel' });
      return;
    }

    // Accept optional voice/model from the client; set safe defaults.
    let body = {};
    try { body = (await (req.body ? Promise.resolve(req.body) : Promise.resolve({}))) || {}; } catch (_) {}
    // If Content-Type is JSON, Vercel parses automatically; otherwise:
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (_) { body = {}; }
    }

    const voice = (body.voice || 'shimmer').toLowerCase();
    // Use the currently available realtime mini preview
    const model = body.model || 'gpt-4o-mini-realtime-preview';

    // Create a short-lived session token (client_secret) we can use for the SDPPOST.
    const resp = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        voice
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      res.status(resp.status).json({ error: 'Upstream error', details: errText });
      return;
    }

    const json = await resp.json();
    // Return the entire session JSON (includes client_secret.value and expires_at).
    res.status(200).json(json);
  } catch (e) {
    res.status(500).json({ error: 'FUNCTION_INVOCATION_FAILED', details: String(e) });
  }
}
