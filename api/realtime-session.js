// /api/realtime-session.js  (Vercel "pages" API)
export default async function handler(req, res) {
  // Only POST is allowed
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Basic CORS for browser POST
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });
  }

  try {
    // Create a *client* secret for the browser to start a Realtime WebRTC session.
    // This does not expose your main API key to the browser.
    const r = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Voice realtime model
        model: 'gpt-4o-realtime-preview-2024-12-17',
        // We want audio out; the UI sends audio in via WebRTC
        voice: 'shimmer',              // soft, feminine; options: shimmer, verse, aria
        // Don’t pass any unknown params (e.g., turn_detection.prefix_ms) – they cause 400s
      })
    });

    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return res.status(r.status).json({ error: 'session_create_failed', detail: text });
    }

    const session = await r.json();
    // Return the short-lived client_secret to the browser
    return res.status(200).json({
      id: session.id,
      model: session.model,
      voice: session.voice,
      client_secret: session.client_secret   // { value, expires_at }
    });
  } catch (err) {
    return res.status(500).json({ error: 'FUNCTION_INVOCATION_FAILED', detail: String(err) });
  }
}
