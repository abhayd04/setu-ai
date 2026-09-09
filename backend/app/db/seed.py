"""
Run once after migrations: `python -m app.db.seed`
Loads data/schemes.json and data/partners.json into Postgres.
Idempotent-ish: uses merge() so re-running updates existing rows instead of duplicating.
"""
import json
import os

from app.db.session import SessionLocal, Base, engine
from app.models import Scheme, Partner, PartnerOperationalMetrics

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")


def seed_schemes(db):
    with open(os.path.join(DATA_DIR, "schemes.json")) as f:
        schemes = json.load(f)
    for s in schemes:
        db.merge(Scheme(**s))
    db.commit()
    print(f"Seeded {len(schemes)} schemes.")


def seed_partners(db):
    with open(os.path.join(DATA_DIR, "partners.json")) as f:
        partners = json.load(f)
    for p in partners:
        metrics = p.pop("metrics")
        db.merge(Partner(**p))
        db.commit()
        existing = (
            db.query(PartnerOperationalMetrics)
            .filter_by(partner_id=p["partner_id"])
            .first()
        )
        if existing:
            for k, v in metrics.items():
                setattr(existing, k, v)
        else:
            db.add(PartnerOperationalMetrics(partner_id=p["partner_id"], **metrics))
        db.commit()
    print(f"Seeded {len(partners)} partners + metrics.")


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)  # safety net if alembic hasn't run yet
    db = SessionLocal()
    try:
        seed_schemes(db)
        seed_partners(db)
    finally:
        db.close()
