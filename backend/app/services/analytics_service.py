"""
Government/MoSJE dashboard analytics. Everything here is computed from
real rows in the prototype's own database (applications your team's demo
actually creates) - not fabricated numbers. On a fresh/empty database this
will correctly show zeros, which is the honest behavior for a prototype
that hasn't processed any applications yet.
"""
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import Application, ApplicationStatus, RoutingDecision, Document, Scheme


def get_overview(db: Session) -> dict:
    total_applications = db.query(Application).count()

    eligible = db.query(Application).filter(Application.scheme_id.isnot(None)).count()

    routed = db.query(Application).filter(Application.partner_id.isnot(None)).count()

    pending = (
        db.query(Application)
        .filter(
            Application.status.in_(
                [
                    ApplicationStatus.PROFILE_CREATED,
                    ApplicationStatus.ELIGIBILITY_CHECKED,
                    ApplicationStatus.DOCUMENTS_PENDING,
                ]
            )
        )
        .count()
    )

    by_scheme_rows = (
        db.query(Scheme.scheme_name, func.count(Application.application_id))
        .join(Application, Application.scheme_id == Scheme.scheme_id)
        .group_by(Scheme.scheme_name)
        .all()
    )
    by_scheme = [{"scheme_name": name, "count": count} for name, count in by_scheme_rows]

    from app.models import BeneficiaryProfile

    by_district_query = (
        db.query(BeneficiaryProfile.location, func.count(Application.application_id))
        .join(Application, Application.profile_id == BeneficiaryProfile.profile_id)
        .group_by(BeneficiaryProfile.location)
        .all()
    )
    by_district = [{"district": loc or "Unknown", "count": count} for loc, count in by_district_query]

    # Credit Access Gap per spec: eligible beneficiaries without a viable
    # delivery route / eligible beneficiaries. "No viable route" = has a
    # scheme but no partner attached (routing found nothing).
    eligible_no_route = (
        db.query(Application)
        .filter(Application.scheme_id.isnot(None), Application.partner_id.is_(None))
        .count()
    )
    credit_access_gap = round(eligible_no_route / eligible, 3) if eligible > 0 else None

    doc_total = db.query(Document).count()
    doc_invalid = db.query(Document).filter(Document.validation_status != "valid").count()
    doc_rejection_rate = round(doc_invalid / doc_total, 3) if doc_total > 0 else None

    return {
        "total_applications": total_applications,
        "eligible_applications": eligible,
        "routed_applications": routed,
        "pending_applications": pending,
        "by_scheme": by_scheme,
        "by_district": by_district,
        "credit_access_gap": credit_access_gap,
        "document_rejection_rate": doc_rejection_rate,
        "data_note": "All figures computed live from this prototype's own database. On a fresh install with no applications created yet, these will correctly show zero/null - that is not a bug.",
    }


def get_partner_workload(db: Session) -> list[dict]:
    from app.models import Partner, PartnerOperationalMetrics

    rows = (
        db.query(Partner, PartnerOperationalMetrics, func.count(Application.application_id))
        .join(PartnerOperationalMetrics, PartnerOperationalMetrics.partner_id == Partner.partner_id)
        .outerjoin(Application, Application.partner_id == Partner.partner_id)
        .group_by(Partner.partner_id, PartnerOperationalMetrics.id)
        .all()
    )
    return [
        {
            "partner_id": partner.partner_id,
            "partner_name": partner.name,
            "applications_routed_here": app_count,
            "capacity_pct": metrics.capacity_pct,
            "avg_processing_days": metrics.avg_processing_days,
            "doc_rejection_rate": metrics.doc_rejection_rate,
            "is_simulated_data": partner.is_simulated_data or metrics.is_simulated_data,
        }
        for partner, metrics, app_count in rows
    ]
