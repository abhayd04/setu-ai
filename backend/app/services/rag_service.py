"""
Retrieval-augmented answering over the NBCFDC scheme knowledge base.

Deliberate design choice: retrieval uses local TF-IDF/cosine-similarity
(scikit-learn), NOT an embeddings API call. This means retrieval works
even if the demo venue's wifi drops mid-Q&A - only the final answer
generation needs the LLM. If your team wants to swap in real embeddings
(pgvector/FAISS/Chroma) later for better semantic matching, only
_load_corpus() and retrieve() need to change; the API contract stays
the same.
"""
import json
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.services.llm_client import generate_json

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")

_vectorizer = None
_doc_matrix = None
_documents = None


def _load_corpus():
    global _vectorizer, _doc_matrix, _documents
    if _documents is not None:
        return
    with open(os.path.join(DATA_DIR, "knowledge_base.json")) as f:
        _documents = json.load(f)
    texts = [d["title"] + ". " + d["text"] for d in _documents]
    _vectorizer = TfidfVectorizer(stop_words="english")
    _doc_matrix = _vectorizer.fit_transform(texts)


def retrieve(query: str, top_k: int = 3) -> list[dict]:
    _load_corpus()
    query_vec = _vectorizer.transform([query])
    scores = cosine_similarity(query_vec, _doc_matrix).flatten()
    ranked_idx = scores.argsort()[::-1][:top_k]
    return [
        {**_documents[i], "relevance_score": round(float(scores[i]), 3)}
        for i in ranked_idx
        if scores[i] > 0  # don't return irrelevant docs just to fill top_k
    ]


ANSWER_PROMPT_TEMPLATE = """You are SETU-AI's scheme assistant. Answer the
user's question using ONLY the context below. If the context does not
contain the answer, say so plainly instead of guessing - do not invent
government policy.

Context:
{context}

User question: {question}

Return ONLY a JSON object: {{"answer": "...", "used_doc_ids": ["..."]}}
Keep the answer concise (2-4 sentences) and in {language}.
"""


def ask(question: str, language: str = "en") -> dict:
    retrieved = retrieve(question)
    if not retrieved:
        return {
            "answer": "I don't have information on that in the scheme knowledge base. Try asking about a specific scheme's eligibility, documents, or interest rate.",
            "sources": [],
        }

    context = "\n\n".join(f"[{d['doc_id']}] {d['title']}: {d['text']}" for d in retrieved)
    prompt = ANSWER_PROMPT_TEMPLATE.format(context=context, question=question, language=language)

    try:
        result = generate_json(prompt)
    except Exception as e:
        # Fail visibly rather than fabricating an answer if the LLM call breaks
        return {
            "answer": f"Could not generate an answer right now ({e}). Here's the most relevant scheme info found: {retrieved[0]['text'][:200]}...",
            "sources": [{"doc_id": d["doc_id"], "title": d["title"]} for d in retrieved],
        }

    return {
        "answer": result.get("answer", ""),
        "sources": [{"doc_id": d["doc_id"], "title": d["title"]} for d in retrieved],
    }
