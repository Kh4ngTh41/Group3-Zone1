# Vinmec AI Concierge - Backend + UI Prototype MVP

Du an demo theo spec hackathon: AI tu van chuyen khoa + dat lich kham.

Trang thai hien tai:
- Backend FastAPI + SQLite dang la core API.
- UI chinh dang su dung thu muc UI/chatbot-app (khong con phu thuoc luong Next.js de demo).
- Du lieu bac si/chuyen khoa lay tu CSV that tai Data/vinmec_doctors_full.csv.

## 1) Kien truc tong quan

- backend: FastAPI + SQLAlchemy + SQLite
- ai layer: OpenAI API (co fallback rule-based)
- guardrails: emergency redirect, safe messaging, PII masking trong logs
- metrics: triage, escalation, booking, correction events
- data adapter: his_client doc CSV that trong Data/
- ui: static web app tai UI/chatbot-app (HTML/CSS/JS)

## 2) Cau truc thu muc chinh

- backend/
- Data/
- UI/chatbot-app/
- frontend/ (con trong repo, khong phai UI chinh cho luong demo hien tai)
- team-spec-draft.md

## 3) Chay backend

Tu root repo:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cd backend
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Health check:

```bash
curl http://127.0.0.1:8000/health
```

## 4) Chay UI prototype

Mo them 1 terminal moi tu root repo:

```bash
cd UI/chatbot-app
python3 -m http.server 5500
```

Mo trinh duyet tai:
- http://127.0.0.1:5500

Luu y CORS:
- Backend can cho phep origin 127.0.0.1:5500 hoac localhost:5500 trong ALLOW_ORIGINS.

## 5) API chinh

- GET /health
- POST /api/chat/triage
- GET /api/slots?specialty=...
- POST /api/bookings/confirm
- POST /api/feedback/correction
- GET /api/meta/specialties
- GET /api/home/highlights
- GET /api/metrics/summary

## 6) Bien moi truong quan trong (backend/.env)

- OPENAI_API_KEY: key OpenAI (de trong van chay fallback)
- OPENAI_MODEL: mac dinh gpt-4o-mini
- DATABASE_URL: sqlite:///./vinmec_ai.db
- APP_ENV: dev/prod
- ALLOW_ORIGINS: danh sach origin cach nhau boi dau phay
- LOW_CONFIDENCE_THRESHOLD: mac dinh 0.65
- EMERGENCY_HOTLINE: mac dinh 115
- VINMEC_HOTLINE: mac dinh 1900 2345

## 7) Luong nghiep vu dang ho tro

- Triage trieu chung -> goi y chuyen khoa va slots
- Low-confidence -> de xuat nhieu chuyen khoa de user chon
- Correction loop -> user chon lai khoa, luu correction event
- Emergency -> thong diep khan cap + 2 hotline (115 va 1900 2345)
- Chon bac si + chon gio -> bat buoc nhap ho ten va so dien thoai trong chat -> moi xac nhan booking thanh cong
- Dat lich tu card Bac si tieu bieu:
	- Neu bac si 1 chuyen khoa: vao thang buoc chon gio
	- Neu bac si da chuyen khoa: chatbot hien buoc chon chuyen khoa truoc, sau do vao chon gio
- Card bac si co link ho so bac si (vinmec.com + profile endpoint)
- Nut mo rong chat la fullscreen rieng khung chat (khong fullscreen toan bo website)

## 8) Ghi chu production roadmap

- thay his_client.py bang adapter goi HIS that qua REST/gRPC
- bo sung auth (JWT + RBAC)
- bo sung redis cho caching va queue
- bo sung idempotency key cho booking flow
- bo sung dashboard metrics va evaluation batch theo ngay
