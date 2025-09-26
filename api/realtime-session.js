// /api/realtime-session.js
export const config = { runtime: 'edge' };

/**
 * Supports:
 *  - GET  => create ephemeral client_secret (same as you have now)
 *  - POST => exchange SDP offer with OpenAI, return { answer }
 *
 * ENV required on Vercel:
 *  - OPENAI_API_KEY
 *
 * Query/body:
 *  - voice: shimmer | ballad | verse ...
 */
export default async function handler(req) {
  const { method } = req;

  if (method === 'GET') {
  const { searchParams } = new URL(req.url);
  const voice = searchParams.get('voice') || 'shimmer';
  const model = searchParams.get('model') || 'gpt-4o-mini-realtime-preview';

  // You can make this text even more “you” later.
  const instructions =
    `You are Emma, a caring, upbeat voice companion. 
     Speak in warm, natural, short sentences (8–14 words).
     Be encouraging and emotionally intelligent. 
     Ask one gentle follow-up at a time, then pause to listen.
     Keep a friendly smile in your voice. 
     Avoid controversy; be helpful and kind.`;

  const r = await fetch('https://api.openai.com/v1/realtime/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'realtime=v1'
    },
    body: JSON.stringify({ model, voice, instructions })
  });

  if (!r.ok) {
    const t = await r.text().catch(() => '');
    return new Response(
      JSON.stringify({ error: 'session_create_failed', status: r.status, body: t }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const j = await r.json();
  return new Response(JSON.stringify(j), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

  if (method === 'POST') {
    // Body: { sdp: string, voice?: string, model?: string }
    const body = await req.json().catch(() => null);
    if (!body?.sdp) {
      return new Response(JSON.stringify({ error: 'missing_sdp' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }
    const voice = body.voice || 'shimmer';
    const model = body.model || 'gpt-4o-mini-realtime-preview';

    // Forward the SDP offer to OpenAI Realtime REST; get back SDP answer
    const upstream = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}&voice=${encodeURIComponent(voice)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/sdp',
        'OpenAI-Beta': 'realtime=v1'
      },
      body: body.sdp
    });

    if (!upstream.ok) {
      const t = await upstream.text().catch(() => '');
      return new Response(
        JSON.stringify({ error: 'sdp_exchange_failed', status: upstream.status, body: t }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const answer = await upstream.text();
    return new Response(JSON.stringify({ answer }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response('Method Not Allowed', { status: 405 });
}
