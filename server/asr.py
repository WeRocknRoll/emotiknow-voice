# server/asr.py
import asyncio

async def transcribe_stream_simple(raw_bytes: bytes) -> str:
    # TODO: integrate faster-whisper for real ASR
    # For now: pretend it's "Hi, I'm Emma..."
    await asyncio.sleep(0.1)
    return "Hi, I'm Emma. How can I help you today?"
