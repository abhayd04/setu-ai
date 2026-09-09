"""
Document upload -> OCR -> field extraction -> validation, per spec's
"Document Intelligence" section. Extraction is regex/keyword-based (not
LLM) for the same reason the policy engine is deterministic: a rejected
document needs a traceable reason, not a black-box guess.
"""
import re
import pytesseract
from PIL import Image

# very deliberately simple patterns — good enough to demo, not a general
# document-AI system. Extend per real document formats your team collects.
# very deliberately simple patterns — good enough to demo, not a general
# document-AI system. Extend per real document formats your team collects.
# NOTE: tested against real pytesseract OCR output on a synthetic income
# certificate — OCR rendered "Rs." as "Fs" due to a font artifact, which
# broke an earlier stricter version of this pattern. This version tolerates
# a short noisy prefix between the label and the digits instead of matching
# an exact currency-symbol set.
INCOME_PATTERN = re.compile(r"(?:income|आय)[:\s]*(?:[^\d\n]{0,6})?([\d,]{4,})", re.IGNORECASE)
NAME_PATTERN = re.compile(r"(?:name|नाम)[:\s]*([A-Za-z\u0900-\u097F ]{2,50})", re.IGNORECASE)


def run_ocr(image_path: str) -> str:
    image = Image.open(image_path)
    # Hindi + English — requires the 'hin' tesseract language pack installed
    # on the deployment machine; falls back to English-only if unavailable.
    try:
        return pytesseract.image_to_string(image, lang="eng+hin")
    except pytesseract.TesseractError:
        return pytesseract.image_to_string(image, lang="eng")


def extract_fields(raw_text: str) -> dict:
    fields = {}
    income_match = INCOME_PATTERN.search(raw_text)
    if income_match:
        fields["income"] = int(income_match.group(1).replace(",", ""))
    name_match = NAME_PATTERN.search(raw_text)
    if name_match:
        fields["name"] = name_match.group(1).strip()
    return fields


def validate_document(doc_type: str, extracted_fields: dict, profile: dict) -> dict:
    """
    Cross-checks extracted fields against the profile the user already gave
    (e.g. income certificate should roughly match stated income).
    Returns a validation_status + list of check results for the UI.
    """
    checks = []
    status = "valid"

    if not extracted_fields:
        return {"validation_status": "invalid", "checks": [{"check": "text_extraction", "passed": False, "detail": "No readable text found in document"}]}

    checks.append({"check": "document_readable", "passed": True, "detail": "Text extracted successfully"})

    if doc_type == "income_certificate":
        if "income" in extracted_fields:
            declared = profile.get("income")
            extracted = extracted_fields["income"]
            if declared and abs(extracted - declared) / max(declared, 1) < 0.1:
                checks.append({"check": "income_match", "passed": True, "detail": f"Extracted income Rs.{extracted:,} matches declared income"})
            else:
                checks.append({"check": "income_match", "passed": False, "detail": f"Extracted income Rs.{extracted:,} does not match declared income Rs.{declared:,}" if declared else "No declared income to compare against"})
                status = "needs_review"
        else:
            checks.append({"check": "income_field_found", "passed": False, "detail": "Could not locate income figure in document"})
            status = "needs_review"

    if all(c["passed"] for c in checks):
        status = "valid"
    elif status != "invalid":
        status = "needs_review"

    return {"validation_status": status, "checks": checks}


def get_required_documents(scheme_required_docs: list[str], uploaded_doc_types: list[str]) -> dict:
    missing = [d for d in scheme_required_docs if d not in uploaded_doc_types]
    return {
        "all_present": len(missing) == 0,
        "missing_documents": missing,
        "uploaded_documents": uploaded_doc_types,
    }
