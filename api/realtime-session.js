// /api/realtime-session.js
export const config = { runtime: 'edge' };

export default async function handler(req) {
  try {
    const { sdp, voice } = await req.json();

    // Call OpenAI Realtime REST endpoint with your API key.
    // (Model string may vary; use the Realtime model you are enabled for)
    const r = await fetch('https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/sdp'
      },
      body: sdp
    });

    if (!r.ok) {
      const txt = await r.text();
      return new Response(JSON.stringify({ error: txt }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const answerSDP = await r.text();         // OpenAI returns raw SDP
    return new Response(JSON.stringify({ sdp: answerSDP }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
