# Prototype — Vinmec AI Concierge

## Mô tả prototype
Prototype mô phỏng trợ lý AI đặt lịch khám cho Vinmec theo hội thoại tự nhiên: người dùng nhập triệu chứng, hệ thống phân luồng chuyên khoa, hiển thị bác sĩ và khung giờ trống để đặt lịch ngay. Luồng hiện có guardrails an toàn (cấp cứu + ngoài phạm vi), bước nhập địa chỉ trước khi chọn bác sĩ, chọn phương tiện di chuyển (XanhSM hoặc tự đi), và đánh giá sau khi hoàn tất. Toàn bộ flow chạy được với backend API thật và dữ liệu bác sĩ từ trang chủ Vinmec.

## Level: Working
- Backend FastAPI + SQLite chạy thật với các endpoint triage, slots, booking, transport.
- UI chatbot web (HTML/CSS/JS) chạy thật end-to-end với trạng thái hội thoại và validation.
- Có fallback rule-based khi AI API không sẵn sàng.

## Links
- GitHub repo: https://github.com/<your-org-or-user>/AI_in_Action-VinUni_Group3-Zone1
- Backend local: http://127.0.0.1:8000
- UI local demo: http://127.0.0.1:5500
- Video demo:

    ![demo](./assets/demo.gif)

## Tools và API đã dùng
- Frontend: HTML, CSS, Vanilla JavaScript (UI/chatbot-app)
- Backend: FastAPI, SQLAlchemy, SQLite, Uvicorn
- AI: OpenAI API (mặc định gpt-4o-mini)
- Data source: Data/vinmec_doctors_full.csv (danh sách bác sĩ/chuyên khoa/khung giờ/... được crawl trực tiếp từ Vinmec)

## Phân công
| Thành viên | Phần | Output |
|-----------|------|--------|
| Minh | spec + connect backend-frontend | spec-final, demo |
| Thành | frontend + slide | slide, UI |
| Luân | backend + prototype | backend, prototype |
| Khánh | data + xanhsm feature | data, backend feature |