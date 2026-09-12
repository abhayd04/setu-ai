"""
Run once after migrations: `python -m app.db.seed`
Loads data/schemes.json and data/partners.json into Postgres/SQLite.
Idempotent: uses merge() to update existing rows instead of duplicating.
"""
import json
import os
from sqlalchemy import text

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
    # Safely inject our new columns if they don't exist yet
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE partners ADD COLUMN email VARCHAR"))
            conn.commit()
        except Exception:
            conn.rollback() # <-- CLEARS THE POSTGRES ERROR
            
        # ---> Inject the address column safely <---
        try:
            conn.execute(text("ALTER TABLE partners ADD COLUMN address VARCHAR"))
            conn.commit()
        except Exception:
            conn.rollback() # <-- CLEARS THE POSTGRES ERROR

        try:
            conn.execute(text("ALTER TABLE partner_operational_metrics ADD COLUMN npa_rate FLOAT DEFAULT 0.05"))
            conn.execute(text("ALTER TABLE partner_operational_metrics ADD COLUMN fund_utilization_pct FLOAT DEFAULT 65.0"))
            conn.execute(text("ALTER TABLE partner_operational_metrics ADD COLUMN has_overdues BOOLEAN DEFAULT FALSE"))
            conn.commit()
        except Exception:
            conn.rollback() # <-- CLEARS THE POSTGRES ERROR

        # ---> Clean up stale ghost branches so they stop appearing in routing <---
        try:
            conn.execute(text("DELETE FROM partners WHERE partner_id IN ('psb_sbi_indore_palasia', 'rrb_narmada_jhabua_bhawarkua')"))
            conn.commit()
        except Exception:
            conn.rollback()

    with open(os.path.join(DATA_DIR, "partners.json")) as f:
        partners = json.load(f)
        
    for p in partners:
        p_copy = dict(p)
        metrics = p_copy.pop("metrics")
        
        # Merge the main partner data (updates coordinates/names/emails/addresses)
        db.merge(Partner(**p_copy))
        db.commit()
        
        # Merge the operational metrics
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
        
    print(f"Seeded {len(partners)} partners + metrics with updated coordinates, emails, and addresses.")


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_schemes(db)
        seed_partners(db)
    finally:
        db.close()