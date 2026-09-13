# 🚀 SETU-AI
**Scheme-to-Enterprise Unified Intelligence Platform**  
**Smart India Hackathon (SIH) 2026** | **Problem Statement:** SIH26092  

[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-black?logo=vercel&style=for-the-badge)](https://setu-ai-tau.vercel.app/)

## 🎯 Our Vision
Bridging the credit access gap for marginalized entrepreneurs in India. SETU-AI replaces fragmented welfare discovery with an omnichannel, voice-first platform featuring deterministic policy matching, automated document validation, and precise geospatial bank routing.

---

## ✨ Key Technical Features

- **🎙️ Multilingual AI Voice Intake:** Utilizes Google Gemini LLM with strict JSON guardrails to extract precise applicant parameters (intent, income, category) from Hindi/English audio without hallucinations.
- **⚙️ Deterministic Policy Engine:** A math-backed matching engine that evaluates NBCFDC schemes, ranks eligibility, and dynamically generates complete EMI repayment schedules.
- **🗺️ Intelligent Geospatial Routing:** PostgreSQL-powered mapping that evaluates branch distance, scheme fit, and historical capacity to recommend the optimal Channel Partner/Bank.
- **📄 Automated OCR Pipeline:** Integrated Tesseract OCR to automatically scan and validate regional income and category certificates upon citizen upload.
- **✉️ Automated Email Escalation Engine:** Instantly triggers localized email updates to the citizen whenever an application state changes (e.g., Pending, Approved, Rejected).
- **💼 Channel Partner Dashboard:** A secure, dedicated workspace for loan officers to monitor live application queues and execute application actions seamlessly.

---

## 🛠️ Tech Stack Architecture

**Frontend (Citizen & Partner Portals)**
- Next.js (React Framework)
- Tailwind CSS (Styling)
- Deployed on **Vercel**

**Backend (Core Intelligence & API)**
- FastAPI (Python)
- Uvicorn (ASGI server)
- Deployed on **Render**

**Database & AI Integration**
- PostgreSQL (Geospatial & Relational Data)
- Google Gemini API (NLP & Intent Extraction)
- Tesseract OCR (Document Verification)
- WhatsApp Business API & SMTP (Notification Engine)

---

## 💻 Local Setup Instructions

Follow these instructions to run SETU-AI locally on your machine.

### 1. Clone the Repository
```bash
git clone [https://github.com/abhayd04/setu-ai.git](https://github.com/abhayd04/setu-ai.git)
cd setu-ai
2. Backend Setup (FastAPI)
Open a terminal and navigate to the backend folder:

Bash
cd backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
Backend Environment Variables:
Create a .env file in the backend directory and add:

Code snippet
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=your_postgresql_connection_string
Run the Backend Server:

Bash
uvicorn main:app --reload
# The API will be running at http://localhost:8000
3. Frontend Setup (Next.js)
Open a new terminal window and navigate to the frontend folder:

Bash
cd frontend

# Install dependencies
npm install
Frontend Environment Variables:
Create a .env.local file in the frontend directory:

Code snippet
NEXT_PUBLIC_API_URL=http://localhost:8000
Run the Frontend Development Server:

Bash
npm run dev
# The frontend will be running at http://localhost:3000
🚀 Scaling Roadmap (Our Vision)
Phase 1: Core Prototype (Current) - Multilingual voice intake, deterministic policy engine, and dynamic map routing.

Phase 2: Omnichannel Expansion - Integrating a Meta WhatsApp AI Chatbot for discovery and applications natively inside WhatsApp.

Phase 3: Grassroots Pilot - Targeted physical rollout in Indore/Bhopal, deploying the voice-first platform to hardware kiosks at Common Service Centres (CSCs).

Phase 4: Pan-India Scaling - Scaling LLM processing natively to all 22 scheduled Indian languages, and deploying Master Nodal Dashboards for government NPA tracking.

Built with ❤️ for Smart India Hackathon 2026