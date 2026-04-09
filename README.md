# Vinmec AI Concierge - End-to-End MVP

Du an demo theo spec hackathon: AI tu van chuyen khoa + dat lich kham.

## 1) Kien truc tong quan

- backend: FastAPI + SQLite
- ai layer: OpenAI API (co fallback rule-based)
- guardrails: emergency redirect, safe messaging, PII masking trong logs
- metrics: triage, escalation, booking, correction events
- frontend: Next.js (tieng Viet) cho full flow tu trieu chung den xac nhan lich

## 2) Cau truc thu muc

- backend/
- frontend/
- team-spec-draft.md

## 3) Chay backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

API chinh:

- GET /health
- POST /api/chat/triage
- POST /api/bookings/confirm
- POST /api/feedback/correction
- GET /api/metrics/summary
- GET /api/meta/specialties
- GET /api/slots?specialty=...

## 4) Chay frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Mo trinh duyet tai http://localhost:3000

## 5) Bien moi truong quan trong

Backend (.env):

- OPENAI_API_KEY: key OpenAI (de trong van chay fallback)
- OPENAI_MODEL: mac dinh gpt-4o-mini
- DATABASE_URL: sqlite:///./vinmec_ai.db
- LOW_CONFIDENCE_THRESHOLD: mac dinh 0.65
- EMERGENCY_HOTLINE: mac dinh 115

Frontend (.env.local):

- NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

## 6) Luong nghiep vu duoc ho tro

- Happy path: AI goi y dung khoa va co slot
- Low-confidence: AI dua nhieu lua chon khoa cho user quyet dinh
- Failure/No-slot: escalate sang tong dai vien
- Correction loop: user chon lai khoa -> luu correction event
- Emergency: phat hien keyword nguy kich -> dieu huong hotline ngay

## 7) Ghi chu mo rong production

- thay his_client.py bang adapter goi HIS that qua REST/gRPC
- bo sung auth (JWT + RBAC)
- bo sung redis cho caching va queue
- bo sung evaluation batch va dashboard metrics theo ngay
