"""
Partner routing intelligence — explicitly balances spatial proximity with institutional risk.
Enforces fund utilization quotas and non-performing asset (NPA) risk thresholds to ensure
beneficiary loan applications are never routed to distressed or overdue channel partners.
"""
import math
from sqlalchemy.orm import Session
from app.models import Partner, PartnerOperationalMetrics

WEIGHTS = {
    "scheme_fit": 0.25,
    "distance": 0.25,
    "capacity": 0.15,
    "npa_health": 0.15,
    "fund_availability": 0.10,
    "processing_performance": 0.10,
}

MAX_REASONABLE_DISTANCE_KM = 100
MAX_PERMISSIBLE_NPA_RATE = 0.10          # 10% ceiling
MAX_FUND_UTILIZATION_PCT = 95.0          # Quota exhaustion threshold


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return round(2 * R * math.asin(math.sqrt(a)), 2)


def _check_fund_and_risk_eligibility(partner: Partner, metrics: PartnerOperationalMetrics, scheme_id: str) -> tuple[bool, str]:
    if not partner.is_operationally_active:
        return False, "Partner branch is temporarily operationally inactive"
    if scheme_id not in (partner.authorized_schemes or []):
        return False, f"Not authorized for scheme '{scheme_id}'"
    if metrics.has_overdues:
        return False, "Disqualified: Branch has active institutional overdues with state corporation"
    if (metrics.npa_rate or 0.0) > MAX_PERMISSIBLE_NPA_RATE:
        return False, f"Disqualified: High NPA ratio ({((metrics.npa_rate or 0.0) * 100):.1f}%) exceeds scheme safety limit (10%)"
    if (metrics.fund_utilization_pct or 0.0) >= MAX_FUND_UTILIZATION_PCT:
        return False, f"Disqualified: Allocated scheme fund quota is fully exhausted ({metrics.fund_utilization_pct}%)"
    return True, ""


def _score_partner(partner: Partner, metrics: PartnerOperationalMetrics, user_lat: float, user_lng: float, scheme_id: str) -> dict:
    is_eligible, disqualification_reason = _check_fund_and_risk_eligibility(partner, metrics, scheme_id)
    reasons = []

    distance_km = None
    distance_score = 0.5
    if user_lat is not None and user_lng is not None:
        distance_km = haversine_km(user_lat, user_lng, partner.lat, partner.lng)
        distance_score = max(0.0, 1.0 - (distance_km / MAX_REASONABLE_DISTANCE_KM))
        if distance_km < 15:
            reasons.append(f"Near applicant ({distance_km} km)")

    if is_eligible:
        scheme_fit = 1.0
        capacity = (metrics.capacity_pct or 0.0) / 100.0
        if capacity > 0.5:
            reasons.append("Available application bandwidth")

        npa = metrics.npa_rate if metrics.npa_rate is not None else 0.05
        npa_score = max(0.0, 1.0 - (npa / MAX_PERMISSIBLE_NPA_RATE))
        if npa <= 0.05:
            reasons.append(f"Healthy credit portfolio ({round(npa * 100, 1)}% NPA)")

        utilization = metrics.fund_utilization_pct if metrics.fund_utilization_pct is not None else 65.0
        fund_score = max(0.0, 1.0 - (utilization / 100.0))
        if utilization < 85:
            reasons.append(f"Active scheme subsidy quota available ({round(100 - utilization, 1)}% remaining)")

        processing_score = max(0.0, min(1.0, 1.0 - (metrics.avg_processing_days or 10.0) / 20.0))
        if metrics.avg_processing_days and metrics.avg_processing_days < 8:
            reasons.append("Fast document processing track")

        score = (
            scheme_fit * WEIGHTS["scheme_fit"]
            + distance_score * WEIGHTS["distance"]
            + capacity * WEIGHTS["capacity"]
            + npa_score * WEIGHTS["npa_health"]
            + fund_score * WEIGHTS["fund_availability"]
            + processing_score * WEIGHTS["processing_performance"]
        ) * 100
    else:
        score = 0.0
        reasons.append(disqualification_reason)

    return {
        "partner_id": partner.partner_id,
        "partner_name": partner.name,
        "partner_type": partner.partner_type,
        "score": round(score, 1),
        "distance_km": distance_km,
        "lat": partner.lat,
        "lng": partner.lng,
        "reasons": reasons,
        "is_simulated_data": partner.is_simulated_data or metrics.is_simulated_data,
        "npa_rate": metrics.npa_rate,
        "fund_utilization_pct": metrics.fund_utilization_pct,
        "has_overdues": metrics.has_overdues,
        "is_eligible": is_eligible,
        "disqualification_reason": disqualification_reason if not is_eligible else None,
    }


def route_partners(
    scheme_id: str,
    db: Session,
    user_lat: float = None,
    user_lng: float = None,
) -> dict:
    partners = db.query(Partner).all()
    all_evaluated = []

    for partner in partners:
        metrics = (
            db.query(PartnerOperationalMetrics)
            .filter(PartnerOperationalMetrics.partner_id == partner.partner_id)
            .first()
        )
        if not metrics:
            continue
        all_evaluated.append(_score_partner(partner, metrics, user_lat, user_lng, scheme_id))

    eligible = [p for p in all_evaluated if p["is_eligible"]]
    if not eligible:
        raise ValueError(
            f"No eligible partner with available fund quota and acceptable NPA found for '{scheme_id}'. "
            "Applicant has an active credit-access gap."
        )

    # Best algorithmic recommendation (highest composite score)
    eligible.sort(key=lambda p: -p["score"])
    recommended_partner = eligible[0]

    # Strictly closest partner by physical distance
    with_distance = [p for p in all_evaluated if p["distance_km"] is not None]
    with_distance.sort(key=lambda p: p["distance_km"])
    closest_partner = with_distance[0] if with_distance else recommended_partner

    # Alternatives include all other evaluated branches in the district
    alternatives = [p for p in all_evaluated if p["partner_id"] != recommended_partner["partner_id"]]

    return {
        "recommended_partner": recommended_partner,
        "closest_partner": closest_partner,
        "alternatives": alternatives,
    }