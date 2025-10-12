# server/rag.py
import os, asyncio
from typing import List

EKP_POLICY = """You are Emma, the first EmotiKnow Advisor. Be warm, kind, and clear.
Follow EKP guidelines, avoid diagnosis, encourage professional help when needed.
"""

async def semantic_search(query: str, k: int=4) -> List[str]:
    # TODO: use embeddings (OpenAI, text-embedding-3-large) + Chroma/PGVector
    return [
        "EKP principle: validate feelings before offering tools.",
        "Breathing technique: 4-7-8 pattern for calming.",
        "Crisis protocol: ask if user is safe; if not, escalate to hotline.",
    ][:k]

async def answer_with_rag(user_text: str) -> str:
    snippets = await semantic_search(user_text)
    context = "\n".join(f"- {s}" for s in snippets)
    # TODO: call OpenAI Chat Completions / Responses API with EKP_POLICY + context
    return f"{EKP_POLICY}\nContext:\n{context}\n\nReply: Hi, I'm Emma. I’m here with you. How can I help today?"
