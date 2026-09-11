"""
Thin wrapper around Gemini so the rest of the app never imports the SDK
directly. Keeps model name / config changes in one place.
"""
import json
import google.generativeai as genai

from app.core.config import settings

_configured = False


def _ensure_configured():
    global _configured
    if not _configured:
        if not settings.GEMINI_API_KEY:
            raise RuntimeError(
                "GEMINI_API_KEY is not set. Add it to backend/.env before "
                "calling any LLM-backed endpoint."
            )
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _configured = True


def generate_json(prompt: str, model_name: str = "gemini-3.6-flash") -> dict:
    """
    Calls Gemini with a prompt that demands JSON-only output, and parses it.
    Raises on malformed output rather than silently guessing — callers
    (intent_service) decide how to handle that failure.
    """
    _ensure_configured()
    model = genai.GenerativeModel(
        model_name,
        generation_config={"response_mime_type": "application/json"},
    )
    response = model.generate_content(prompt)
    text = response.text.strip()
    return json.loads(text)
