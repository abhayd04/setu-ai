from fastapi import APIRouter, HTTPException
from app.services.intent_service import extract_intent
from app.schemas.intent import IntentExtractRequest, IntentExtractResponse

router = APIRouter(prefix="/api/intent", tags=["intent"])


@router.post("/extract", response_model=IntentExtractResponse)
def extract(payload: IntentExtractRequest):
    if not payload.text or not payload.text.strip():
        raise HTTPException(status_code=400, detail="text must not be empty")
    try:
        result = extract_intent(payload.text)
    except RuntimeError as e:
        # e.g. missing GEMINI_API_KEY - surface a clear error, don't crash silently
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Extraction failed: {e}")
    return result
