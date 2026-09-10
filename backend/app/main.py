from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api import schemes, profile, intent, eligibility, calculator, partners, applications, documents, assistant, dashboard
from app.db.session import SessionLocal, engine, Base
from app.db.seed import seed_schemes, seed_partners

app = FastAPI(
    title="SETU-AI",
    description="Scheme-to-Enterprise Unified Intelligence — AI-driven credit-delivery orchestration for PS26092",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    # 1. Create tables first
    Base.metadata.create_all(bind=engine)
    
    # 2. Seed data
    db = SessionLocal()
    try:
        seed_schemes(db)
        seed_partners(db)
    except Exception as e:
        print(f"Seeding note or already seeded: {e}")
    finally:
        db.close()


app.include_router(schemes.router)
app.include_router(profile.router)
app.include_router(intent.router)
app.include_router(eligibility.router)
app.include_router(calculator.router)
app.include_router(partners.router)
app.include_router(applications.router)
app.include_router(documents.router)
app.include_router(assistant.router)
app.include_router(dashboard.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "setu-ai-backend"}