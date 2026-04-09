# Vinmec AI Concierge (VinCare AI)

AI-powered triage and booking prototype for Vinmec. The system helps users describe symptoms in natural language, routes them to a suitable specialty, and completes appointment booking through a conversational flow.

## Architecture

The project is built as a backend-first MVP with a lightweight web chatbot UI.

- Backend: FastAPI + SQLAlchemy + SQLite
- AI layer: OpenAI API with rule-based fallback
- Guardrails: emergency redirect, out-of-scope handling, safe messaging, and PII masking in logs
- Data adapter: doctor/specialty/slot source from Vinmec website
- Metrics: triage, escalation, booking, correction events
- Frontend (active prototype): static HTML/CSS/JavaScript app in UI/chatbot-app

## Directory Structure

- backend/
	- app/ (API routes, AI service, schemas, DB models, guardrails)
	- requirements.txt
- Data/
	- vinmec_doctors_full.csv
- UI/chatbot-app/
	- index.html, style.css, js/

## Setup

## Requirements

- Python 3.10+
- pip

## Python Environment

From repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

## Environment Variables

Create or update backend/.env.

Recommended variables:

- OPENAI_API_KEY=
- OPENAI_MODEL=gpt-4o-mini
- DATABASE_URL=sqlite:///./vinmec_ai.db
- APP_ENV=dev
- ALLOW_ORIGINS=http://127.0.0.1:5500,http://localhost:5500,http://127.0.0.1:3000,http://localhost:3000
- LOW_CONFIDENCE_THRESHOLD=0.65
- EMERGENCY_CONFIDENCE_THRESHOLD=0.85
- EMERGENCY_HOTLINE=115
- VINMEC_HOTLINE=1900 2345

Notes:

- If OPENAI_API_KEY is missing, the backend falls back to rule-based triage.
- ALLOW_ORIGINS must include your frontend origin to avoid CORS errors.

## API Summary

Core endpoints:

- GET /health
- GET /api/meta/specialties
- GET /api/home/highlights
- POST /api/chat/triage
- GET /api/slots
- POST /api/bookings/confirm
- POST /api/transport/choose
- POST /api/feedback/correction
- GET /api/metrics/summary

Interactive API docs:

- http://127.0.0.1:8000/docs

## How to Run

## Run Backend

From repository root:

```bash
source .venv/bin/activate
cd backend
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Health check:

```bash
curl http://127.0.0.1:8000/health
```

## Run Frontend (Prototype UI)

Open a second terminal from repository root:

```bash
cd UI/chatbot-app
python3 -m http.server 5500
```

Then open:

- http://127.0.0.1:5500

## Main Workflow

The current end-to-end chat flow includes:

1. User describes symptoms.
2. AI triage determines confidence and suggested specialty.
3. If confidence is low, chatbot asks clarifying details before continuing.
4. If emergency signals are detected, chatbot immediately redirects with hotline actions.
5. Before doctor suggestion, chatbot requires user address input.
6. Chatbot shows available doctors and slots for the selected specialty.
7. User selects slot and submits patient name and phone to confirm booking.
8. User selects transport mode (XanhSM or self-transport), available time, and pickup address if needed.
9. Transport time is validated to be earlier than booked appointment time.
10. Chatbot shows post-booking rating prompt.

Additional UX capabilities already implemented:

- Featured doctor quick-book flow (including multi-specialty handling)
- Chat panel fullscreen mode
- Chat reset action to restart conversation cleanly

## Current Scope Notes

- This is a working prototype for hackathon/demo usage, not a production deployment.
- Data source is CSV-based for local simulation and can be replaced by real HIS integration.
