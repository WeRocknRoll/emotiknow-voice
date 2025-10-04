// /api/ask.js
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).send('Method not allowed');
    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });

    // simple chat completion (compatible with Responses API style)
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method:'POST',
      headers:{
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role:'system', content:'You are Emma, warm and kind. Keep answers short and friendly.' },
          { role:'user', content: prompt }
        ],
        temperature: 0.7
      })
    });

    if (!r.ok) {
      const t = await r.text();
      return res.status(r.status).send(t);
    }
    const data = await r.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || "Hi!";

    res.json({ reply });
  } catch (e) {
    res.status(500).json({ error: e.message || e.toString() });
  }
}
