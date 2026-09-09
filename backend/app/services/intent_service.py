"""
Turns raw user text (typed, or transcribed from voice client-side) into the
structured beneficiary profile fields the policy engine needs.

IMPORTANT (project principle #1/#2): this service ONLY extracts and
structures information. It never decides eligibility — that's
policy_engine.py's job, using deterministic rules over this output.
"""
from app.services.llm_client import generate_json

REQUIRED_FIELDS_BY_PURPOSE = {
    "business": ["income", "category", "purpose", "business_type", "project_cost", "requested_amount"],
    "education": ["income", "category", "purpose", "education_status", "requested_amount"],
}

EXTRACTION_PROMPT_TEMPLATE = """You are an information-extraction engine for an Indian government
credit-scheme platform. You DO NOT decide eligibility or recommend schemes.
Your only job is to extract structured facts from the user's message.

Extract these fields if present in the message (use null if not mentioned,
do not guess or invent values):
- purpose: "business" or "education" or null
- business_type: short description if purpose is business, else null
- income: annual family income in INR (a number, convert lakh notation e.g.
  "3.2 lakh" -> 320000), else null
- requested_amount: loan amount requested in INR, else null
- project_cost: estimated total project/course cost in INR, else null
- category: social category if explicitly mentioned (e.g. "SC"), else null
- gender: "male", "female", or null if not mentioned or unclear — do not
  guess from name alone, only extract if the user states it
- education_status: course/level if purpose is education, else null
- location: city/district if mentioned, else null
- name: name if mentioned, else null
- language: detected language of the message as an ISO code, e.g. "hi" or "en"

Return ONLY a JSON object with exactly these keys. No prose, no markdown.

User message:
\"\"\"{user_text}\"\"\"
"""


def extract_intent(user_text: str) -> dict:
    """
    Returns {"profile": {...extracted fields...}, "missing_fields": [...]}.
    missing_fields is computed deterministically in Python, not by the LLM,
    so the "what do we still need to ask" logic stays auditable.
    """
    prompt = EXTRACTION_PROMPT_TEMPLATE.format(user_text=user_text)
    extracted = generate_json(prompt)

    # normalize keys we always expect, even if the model omits one
    profile = {
        "purpose": extracted.get("purpose"),
        "business_type": extracted.get("business_type"),
        "income": extracted.get("income"),
        "requested_amount": extracted.get("requested_amount"),
        "project_cost": extracted.get("project_cost"),
        "category": extracted.get("category"),
        "gender": extracted.get("gender"),
        "education_status": extracted.get("education_status"),
        "location": extracted.get("location"),
        "name": extracted.get("name"),
        "language": extracted.get("language") or "hi",
        "raw_input_text": user_text,
    }

    purpose = profile.get("purpose")
    required = REQUIRED_FIELDS_BY_PURPOSE.get(purpose, REQUIRED_FIELDS_BY_PURPOSE["business"])
    missing_fields = [f for f in required if not profile.get(f)]

    return {"profile": profile, "missing_fields": missing_fields}
