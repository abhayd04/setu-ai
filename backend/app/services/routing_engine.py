"""
Partner routing intelligence — deliberately NOT "nearest partner wins."
Two-stage: hard filter (authorization/scheme/operational eligibility),
then weighted scoring on the survivors. Weights are configurable constants
below, not scattered magic numbers, per project principle "make weights
configurable."
"""
import math
from sqlalchemy.orm import Session

from app.models import Partner, PartnerOperationalMetrics

# Spec's example weighting (project doc, "Partner Intelligence" section)
WEIGHTS = {
    "scheme_fit": 0.30,
    "capacity": 0.20,
    "operational_status": 0.20,
    "distance": 0.15,
    "processing_performance": 0.10,
    "reliability": 0.05,
}

MAX_REASONABLE_DISTANCE_KM = 100  # beyond this, distance score floors to 0


def haversine_km(lat1, lng1, lat2, lng2) -> float:
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def _hard_filter(partner: Partner, scheme_id: str) -> tuple[bool, str]:
    if not partner.is_operationally_active:
        return False, "Partner is not currently operationally active"
    if scheme_id not in (partner.authorized_schemes or []):
        return False, f"Partner is not authorized for scheme '{scheme_id}'"
    return True, ""


def _score_partner(partner: Partner, metrics: PartnerOperationalMetrics, user_lat, user_lng, scheme_id) -> dict:
    reasons = []

    scheme_fit = 1.0  # already hard-filtered on authorization; full credit if it passed
    reasons.append(f"Authorized for scheme '{scheme_id}'")

    capacity = (metrics.capacity_pct or 0) / 100
    if capacity > 0.5:
        reasons.append("Good remaining capacity")

    operational_status = 1.0 if partner.is_operationally_active else 0.0
    if operational_status:
        reasons.append("Operationally active")

    distance_km = None
    distance_score = 0.5  # neutral default if no user location provided
    if user_lat is not None and user_lng is not None:
        distance_km = haversine_km(user_lat, user_lng, partner.lat, partner.lng)
        distance_score = max(0, 1 - (distance_km / MAX_REASONABLE_DISTANCE_KM))
        if distance_km < 15:
            reasons.append(f"Close to applicant ({distance_km:.1f} km)")

    # lower avg_processing_days is better; normalize against a 0-20 day band
    processing_score = max(0, min(1, 1 - (metrics.avg_processing_days or 10) / 20))
    if metrics.avg_processing_days and metrics.avg_processing_days < 7:
        reasons.append("Faster than average processing time")

    # lower doc_rejection_rate is better (reliability proxy)
    reliability_score = max(0, 1 - (metrics.doc_rejection_rate or 0))
    if metrics.doc_rejection_rate is not None and metrics.doc_rejection_rate < 0.1:
        reasons.append("Low document rejection rate")

    score = (
        scheme_fit * WEIGHTS["scheme_fit"]
        + capacity * WEIGHTS["capacity"]
        + operational_status * WEIGHTS["operational_status"]
        + distance_score * WEIGHTS["distance"]
        + processing_score * WEIGHTS["processing_performance"]
        + reliability_score * WEIGHTS["reliability"]
    ) * 100

    return {
        "partner_id": partner.partner_id,
        "partner_name": partner.name,
        "partner_type": partner.partner_type,
        "score": round(score, 1),
        "distance_km": round(distance_km, 1) if distance_km is not None else None,
        "lat": partner.lat,
        "lng": partner.lng,
        "reasons": reasons,
        "is_simulated_data": partner.is_simulated_data or metrics.is_simulated_data,
    }


def route_partners(
    scheme_id: str,
    db: Session,
    user_lat: float = None,
    user_lng: float = None,
) -> dict:
    """
    Returns {"recommended_partner": {...}, "alternatives": [...]}.
    Raises ValueError if no partner survives the hard filter (caller should
    surface this as a real "no delivery route available" state, not hide it
    — this maps directly to the spec's "Credit Access Gap" metric).
    """
    partners = db.query(Partner).all()
    scored = []

    for partner in partners:
        ok, _reason = _hard_filter(partner, scheme_id)
        if not ok:
            continue
        metrics = (
            db.query(PartnerOperationalMetrics)
            .filter(PartnerOperationalMetrics.partner_id == partner.partner_id)
            .first()
        )
        if not metrics:
            continue
        scored.append(_score_partner(partner, metrics, user_lat, user_lng, scheme_id))

    scored.sort(key=lambda p: -p["score"])

    if not scored:
        raise ValueError(
            f"No eligible, authorized, operationally active partner found for scheme '{scheme_id}'. "
            "This applicant has a credit-access gap for this scheme."
        )

    return {
        "recommended_partner": scored[0],
        "alternatives": scored[1:4],  # cap alternatives shown
    }
