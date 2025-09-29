// api/realtime-session.js
export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' }
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing OPENAI_API_KEY' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  // You can accept persona overrides via query/body later if desired.
  const model = 'gpt-4o-mini-realtime-preview';

  // This route returns the shape your frontend expects:
  // NOTE: For the current Realtime preview, the browser uses this token directly.
  const body = {
    model,
    client_secret: { value: apiKey },
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
