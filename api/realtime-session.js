// /api/realtime-session.js
// Vercel/Next Edge runtime – forwards the browser's SDP offer to OpenAI
// and returns the answer SDP as JSON { answer: "<sdp...>" }.

export const config = { runtime: 'edge' }; // important for streaming/low latency

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { sdp, voice } = await req.json();

    if (!sdp || typeof sdp !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing SDP offer' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Choose a realtime model. (Use the model your account has access to.)
    const MODEL = 'gpt-4o-realtime-preview-2024-12-17';

    // Forward the SDP offer to OpenAI Realtime:
    const r = await fetch('https://api.openai.com/v1/realtime?model=' + encodeURIComponent(MODEL), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/sdp',
        'OpenAI-Beta': 'realtime=v1'
      },
      // The body of this POST is the **raw** SDP string from the browser
      body: sdp
    });

    const answerSdp = await r.text();

    // Basic sanity check: real SDP answers contain a "v=" line
    if (!/^v=\d/m.test(answerSdp)) {
      return new Response(JSON.stringify({
        error: 'Upstream did not return a valid SDP',
        upstream: answerSdp.slice(0, 2000)
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Return JSON with the answer for the browser to consume.
    return new Response(JSON.stringify({ answer: answerSdp, voice: voice || null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
