// /api/talk.js
export const config = { runtime: 'edge' };

export default async function handler(req) {
  try {
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    const { text } = await req.json();
    if (!text) return new Response('Missing text', { status: 400 });

    const apiKey = process.env.DID_API_KEY;
    const emmaUrl = process.env.EMMA_IMAGE_URL;
    if (!apiKey)  return new Response('Missing DID_API_KEY', { status: 500 });
    if (!emmaUrl) return new Response('Missing EMMA_IMAGE_URL', { status: 500 });

    // 1) Create a talk
    const create = await fetch('https://api.d-id.com/talks', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(apiKey + ':')}`, // D-ID typically accepts Basic with key as username
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Your Emma photo
        source_url: emmaUrl,

        // The spoken script
        script: {
          type: 'text',
          input: text,
          // Choose a voice your plan allows. Examples:
          // Microsoft: en-US-JennyNeural, en-US-AriaNeural
          // Google: en-US-Neural2-C, etc.
          provider: { type: 'microsoft', voice_id: 'en-US-JennyNeural' }
        },

        // Optional render config (stitch/driver may vary by plan)
        config: { stitch: true }
      })
    });

    if (!create.ok) {
      const t = await create.text();
      return new Response(JSON.stringify({ error: t }), { status: create.status });
    }

    const created = await create.json();
    const talkId = created?.id;
    if (!talkId) return new Response(JSON.stringify({ error: 'No talk id' }), { status: 500 });

    // 2) Poll until ready
    let videoUrl = null;
    for (let i = 0; i < 60; i++) { // ~60 * 1s = 1 minute max
      await new Promise(r => setTimeout(r, 1000));
      const st = await fetch(`https://api.d-id.com/talks/${talkId}`, {
        headers: { 'Authorization': `Basic ${btoa(apiKey + ':')}` }
      });
      if (!st.ok) {
        const t = await st.text();
        return new Response(JSON.stringify({ error: t }), { status: st.status });
      }
      const info = await st.json();
      if (info?.status === 'done' && info?.result_url) {
        videoUrl = info.result_url;
        break;
      }
      if (info?.status === 'error') {
        return new Response(JSON.stringify({ error: info.error || 'render error' }), { status: 500 });
      }
    }

    if (!videoUrl) {
      return new Response(JSON.stringify({ error: 'Timeout waiting for D-ID video' }), { status: 504 });
    }

    return Response.json({ videoUrl });
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message || String(err) }), { status: 500 });
  }
}
