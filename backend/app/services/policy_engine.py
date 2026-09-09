"""
Deterministic eligibility engine. Every rule here is explainable and
traceable to a specific scheme field — no LLM judgment involved anywhere
in this file (project principle #1/#4).
"""
from app.models import Scheme


def check_eligibility(profile: dict, scheme: Scheme) -> dict:
    """
    profile: dict with keys income, category, purpose, project_cost,
             requested_amount, education_status (subset of BeneficiaryProfile)
    scheme: a Scheme ORM row

    Returns:
    {
      "eligible": bool,
      "reasons": [...],       # rules that PASSED
      "failed_rules": [...],  # rules that FAILED
      "policy_version": scheme.policy_version
    }
    """
    reasons = []
    failed_rules = []

    # Rule 1: purpose match
    purpose = profile.get("purpose")
    if purpose and purpose in (scheme.eligible_purposes or []):
        reasons.append(f"Purpose '{purpose}' matches scheme purpose")
    else:
        failed_rules.append(f"Purpose '{purpose}' not in scheme's eligible purposes {scheme.eligible_purposes}")

    # Rule 2: income ceiling
    income = profile.get("income")
    if income is not None:
        if income <= scheme.income_limit:
            reasons.append(f"Income Rs.{income:,.0f} within limit Rs.{scheme.income_limit:,.0f}")
        else:
            failed_rules.append(f"Income Rs.{income:,.0f} exceeds limit Rs.{scheme.income_limit:,.0f}")
    else:
        failed_rules.append("Income not provided")

    # Rule 3: category match
    category = profile.get("category")
    if category and category in (scheme.eligible_categories or []):
        reasons.append(f"Category '{category}' is eligible")
    elif not scheme.eligible_categories:
        reasons.append("Scheme has no category restriction")
    else:
        failed_rules.append(f"Category '{category}' not in eligible categories {scheme.eligible_categories}")

    # Rule 4: requested amount within scheme's max loan amount
    requested = profile.get("requested_amount")
    if requested is not None:
        if requested <= scheme.max_loan_amount:
            reasons.append(f"Requested amount Rs.{requested:,.0f} within scheme max Rs.{scheme.max_loan_amount:,.0f}")
        else:
            failed_rules.append(f"Requested amount Rs.{requested:,.0f} exceeds scheme max Rs.{scheme.max_loan_amount:,.0f}")

    # Rule 5: project cost within scheme's project cost band (if scheme defines a band)
    project_cost = profile.get("project_cost")
    if project_cost is not None:
        if project_cost < scheme.min_project_cost:
            failed_rules.append(f"Project cost Rs.{project_cost:,.0f} below scheme minimum Rs.{scheme.min_project_cost:,.0f}")
        elif scheme.max_project_cost is not None and project_cost > scheme.max_project_cost:
            failed_rules.append(f"Project cost Rs.{project_cost:,.0f} exceeds scheme maximum Rs.{scheme.max_project_cost:,.0f}")
        else:
            reasons.append(f"Project cost Rs.{project_cost:,.0f} within scheme's supported range")

    # Rule 6: gender-restricted schemes (e.g. Mahila Samriddhi)
    if scheme.eligible_gender == "female":
        gender = profile.get("gender")
        if gender == "female":
            reasons.append("Gender matches scheme's eligibility (female-only scheme)")
        elif gender is None:
            failed_rules.append("Scheme is female-only and gender was not provided")
        else:
            failed_rules.append("Scheme is restricted to female applicants")

    eligible = len(failed_rules) == 0

    return {
        "eligible": eligible,
        "reasons": reasons,
        "failed_rules": failed_rules,
        "policy_version": scheme.policy_version,
    }
