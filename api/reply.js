// /api/reply.js
export const config = { runtime: 'edge' };

export default async function handler(req) {
  try {
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    const { prompt } = await req.json();
    if (!prompt) return new Response('Missing prompt', { status: 400 });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return new Response('Missing OPENAI_API_KEY', { status: 500 });

    // Simple system prompt – tweak Emma’s personality here
    const system = `You are Emma: warm, kind, concise. Speak naturally.`;

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user',   content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 180
      })
    });

    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: t }), { status: r.status });
    }

    const data = await r.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || '…';
    return Response.json({ reply });
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message || String(err) }), { status: 500 });
  }
}
