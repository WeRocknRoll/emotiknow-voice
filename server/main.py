# server/main.py
import os, asyncio, base64, json
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.websockets import WebSocketDisconnect
import uvicorn

from rag import answer_with_rag
from tts import synth_stream_with_visemes
from asr import transcribe_stream_simple

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"]
)

@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    try:
        # 1) Collect a short utterance (MVP: simple buffer)
        raw_chunks = []
        while True:
            try:
                data = await ws.receive_bytes()
                raw_chunks.append(data)
                # heuristic: stop after ~3s of audio collected
                if sum(len(c) for c in raw_chunks) > 16000 * 2 * 3:
                    break
            except WebSocketDisconnect:
                return

        # 2) ASR (replace with faster-whisper for real use)
        user_text = await transcribe_stream_simple(b"".join(raw_chunks))
        if not user_text.strip():
            user_text = "Hello Emma"
        print("USER:", user_text)

        # 3) RAG + ChatGPT
        reply_text = await answer_with_rag(user_text)
        print("EMMA:", reply_text)

        # 4) TTS streaming + visemes
        async for evt in synth_stream_with_visemes(reply_text):
            if evt["type"] == "viseme":
                await ws.send_text(json.dumps(evt))
            elif evt["type"] == "audio":
                await ws.send_text(json.dumps({
                    "type":"audio",
                    "chunk": base64.b64encode(evt["bytes"]).decode("ascii")
                }))
        await ws.send_text(json.dumps({"type":"done"}))

    except Exception as e:
        await ws.send_text(json.dumps({"type":"error","message":str(e)}))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
