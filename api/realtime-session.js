// /api/realtime-session.ts
// Vercel serverless function: exchanges WebRTC SDP with OpenAI Realtime API.

export const config = {
  runtime: "edge", // lowest-latency on Vercel
};

const MODEL = "gpt-4o-realtime-preview"; // OpenAI Realtime model

export default async function handler(req: Request) {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // Accept BOTH:
    // 1) JSON: { sdp: "v=0..." }
    // 2) Raw text body: "v=0..." (Content-Type: application/sdp)
    let offerSdp = "";
    const ct = req.headers.get("content-type") || "";

    if (ct.includes("application/json")) {
      const json = await req.json().catch(() => ({}));
      offerSdp = (json?.sdp || json?.offer || "").toString().trim();
    } else {
      // fall back to text/plain or application/sdp
      offerSdp = (await req.text()).trim();
    }

    if (!offerSdp || !offerSdp.startsWith("v=")) {
      return new Response(
        JSON.stringify({
          error: {
            message:
              "Invalid SDP offer. Send {sdp: 'v=0...'} JSON or raw SDP as body.",
            code: "invalid_offer",
          },
        }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: { message: "OPENAI_API_KEY is not set", code: "no_api_key" },
        }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }

    // Proxy the offer to OpenAI Realtime (WebRTC over HTTP/SDP)
    const openaiRes = await fetch(
      `https://api.openai.com/v1/realtime?model=${encodeURIComponent(MODEL)}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/sdp",
          "OpenAI-Beta": "realtime=v1",
        },
        body: offerSdp,
      }
    );

    if (!openaiRes.ok) {
      const text = await openaiRes.text();
      return new Response(
        JSON.stringify({
          error: {
            message: "Upstream OpenAI error",
            code: "openai_error",
            detail: text,
          },
        }),
        { status: 502, headers: { "content-type": "application/json" } }
      );
    }

    const answerSdp = await openaiRes.text();

    // You can return either raw SDP or JSON; your client expects JSON {sdp:"..."}
    return new Response(JSON.stringify({ sdp: answerSdp }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: { message: err?.message || "Unknown error", code: "server_error" },
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
