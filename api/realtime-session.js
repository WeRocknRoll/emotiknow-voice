// /api/realtime-token.js
export const config = { runtime: "edge" };

export default async function handler(req) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response("Missing OPENAI_API_KEY", { status: 500 });
  }

  let model = "gpt-4o-mini-realtime-preview";
  let voice = "verse"; // warmer by default
  try {
    if (req.method === "POST" && req.headers.get("content-type")?.includes("application/json")) {
      const body = await req.json();
      if (body?.model) model = String(body.model);
      if (body?.voice) voice = String(body.voice);
    }
  } catch {}

  const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      voice,
      modalities: ["audio", "text"], // allow speech out + text
      // You can inject friendly system instructions here too:
      // instructions: "Sound warm, kind, encouraging, and patient."
    }),
  });

  const txt = await r.text();
  if (!r.ok) return new Response(txt, { status: r.status, headers: { "Content-Type": "text/plain" } });

  return new Response(txt, { status: 200, headers: { "Content-Type": "application/json" } });
}
