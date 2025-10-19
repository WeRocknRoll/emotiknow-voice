from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="EKP Realtime API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000","http://localhost:3001","http://localhost:3002"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status":"ok"}

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    try:
        await ws.send_text("👋 Connected to EKP server. Type a message!")
        while True:
            msg = await ws.receive_text()  # for now, text only
            await ws.send_text(f"Emma (demo): you said → {msg}")
    except WebSocketDisconnect:
        pass
