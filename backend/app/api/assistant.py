from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

from app.services.rag_service import ask

router = APIRouter(prefix="/api/assistant", tags=["assistant"])


class AskRequest(BaseModel):
    question: str
    language: str = "en"


class Source(BaseModel):
    doc_id: str
    title: str


class AskResponse(BaseModel):
    answer: str
    sources: List[Source]


@router.post("/ask", response_model=AskResponse)
def ask_assistant(payload: AskRequest):
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="question must not be empty")
    return ask(payload.question, payload.language)
