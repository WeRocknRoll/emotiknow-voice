# server/tts.py
import asyncio, time, re
from typing import AsyncGenerator, Dict, Any

V_MAP = {
  'A': set(list("aɑɐɒæʌ")), 'E': set(list("eɛɜ")), 'I': set(list("iɪ")), 'O': set(list("oɔ")),
  'U': set(list("uʊ")), 'F': set(list("fv")), 'L': set(list("l")), 'S': set(list("szʃʒθð")),
  'M': set(list("mbp")), 'X': set(list("")) # default/closed
}

def to_viseme(char: str) -> str:
    ch = char.lower()
    for k, bag in V_MAP.items():
        if ch in bag: return k
    return 'X'

async def synth_stream_with_visemes(text: str) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Yields {"type":"viseme","atMs":...,"id":...} and {"type":"audio","bytes":...}
    For MVP we fake timings: emit a viseme every 120ms and emit small audio chunks.
    Replace with real TTS SDK that gives word/phoneme timestamps.
    """
    # FAKE: split into characters and drive visemes
    t0 = time.time()
    for ch in re.sub(r'\s+',' ', text):
        v = to_viseme(ch)
        yield {"type":"viseme","atMs": int((time.time()-t0)*1000), "id": v}
        await asyncio.sleep(0.12)
    # FAKE: emit silent audio chunks to test playback (replace with real TTS bytes)
    for _ in range(6):
        yield {"type":"audio","bytes": b'\x00'*3200}
        await asyncio.sleep(0.08)
