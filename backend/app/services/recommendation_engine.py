"""
Orchestrates: fetch active schemes -> run deterministic eligibility on each
-> rank the eligible ones -> attach an LLM-generated plain-language
explanation on top (explanation only, never the eligibility decision
itself — project principle #1).
"""
from sqlalchemy.orm import Session

from app.models import Scheme
from app.services.policy_engine import check_eligibility


def _match_score(profile: dict, scheme: Scheme) -> float:
    """
    Simple, explainable ranking score (0-100) for eligible schemes only.
    Not ML — deliberately readable so it can be justified to a judge.
    Weights: closeness of requested amount to scheme max (40%),
    lower interest rate is better (30%), higher project-cost coverage is
    better (20%), longer moratorium is better for the beneficiary (10%).
    """
    requested = profile.get("requested_amount") or 0
    amount_fit = 1 - abs(scheme.max_loan_amount - requested) / max(scheme.max_loan_amount, requested, 1)
    amount_fit = max(0, min(1, amount_fit))

    # normalize interest rate against a reasonable 4-16% band seen across schemes
    rate_score = max(0, min(1, (16 - scheme.interest_rate) / (16 - 4)))

    coverage_score = scheme.project_cost_coverage_pct / 100

    moratorium_score = min(1, scheme.moratorium_months / 24)

    score = (
        amount_fit * 40
        + rate_score * 30
        + coverage_score * 20
        + moratorium_score * 10
    )
    return round(score, 1)


def recommend_schemes(profile: dict, db: Session) -> list[dict]:
    schemes = db.query(Scheme).filter(Scheme.active == True).all()  # noqa: E712

    results = []
    for scheme in schemes:
        eligibility = check_eligibility(profile, scheme)
        entry = {
            "scheme_id": scheme.scheme_id,
            "scheme_name": scheme.scheme_name,
            "eligible": eligibility["eligible"],
            "reasons": eligibility["reasons"],
            "failed_rules": eligibility["failed_rules"],
            "policy_version": eligibility["policy_version"],
            "max_loan_amount": scheme.max_loan_amount,
            "interest_rate": scheme.interest_rate,
            "tenure_months": scheme.tenure_months,
            "moratorium_months": scheme.moratorium_months,
            "project_cost_coverage_pct": scheme.project_cost_coverage_pct,
            "match_score": _match_score(profile, scheme) if eligibility["eligible"] else 0,
            "description": scheme.description,
            "url": scheme.url,
        }
        results.append(entry)

    # eligible schemes first, ranked by match_score descending; ineligible
    # ones still returned (with failed_rules) so the UI can show "why not"
    results.sort(key=lambda r: (not r["eligible"], -r["match_score"]))
    return results