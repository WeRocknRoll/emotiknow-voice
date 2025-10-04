// /api/openai-talk.js
// Simple “brain” endpoint: takes { prompt } and returns { reply } using OpenAI.

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).send('Method not allowed');

    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });
    }

    // Minimal responses API call (chat-style)
    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        input: [
          {
            role: 'system',
            content:
              "You are Emma, a warm, kind voice companion. Keep answers friendly, concise, and easy to speak aloud."
          },
          { role: 'user', content: prompt }
        ]
      })
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);

    // `responses` returns the text in a couple of possible shapes; normalize:
    let reply = '';
    if (Array.isArray(data.output_text)) reply = data.output_text.join('\n');
    else if (typeof data.output_text === 'string') reply = data.output_text;
    else if (Array.isArray(data.output)) {
      reply = data.output.map(p => p.content?.map(c => c.text)?.join(' ') || '').join('\n');
    }
    reply ||= 'Hi there!';

    return res.status(200).json({ reply });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'openai-talk failed', details: err.message });
  }
}
