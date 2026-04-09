# SPEC — AI Product Hackathon

**Nhóm:** Vinmec Flow
**Track:** ☐ VinFast · ☒ Vinmec · ☐ VinUni-VinSchool · ☐ XanhSM · ☐ Open
**Problem statement (1 câu):** Khách hàng mất thời gian chờ đợi tổng đài để đặt lịch khám và thường không rõ mình cần khám chuyên khoa nào; AI giúp tư vấn khoa phù hợp qua hội thoại và đặt lịch trực tiếp vào hệ thống trong 30 giây.

---

## 1. AI Product Canvas

|   | Value | Trust | Feasibility |
|---|-------|-------|-------------|
| **Câu hỏi** | User nào? Pain gì? AI giải gì? | Khi AI sai thì sao? User sửa bằng cách nào? | Cost/latency bao nhiêu? Risk chính? |
| **Trả lời** | *Khách hàng Vinmec ngại gọi điện — AI hiểu triệu chứng, gợi ý chuyên khoa & bác sĩ, đặt lịch 24/7.* | *AI gợi ý sai khoa → User chọn lại từ danh sách gợi ý. Hệ thống ghi chú đây là "AI-suggested" để lễ tân kiểm tra lại.* | *~$0.02/phiên, latency <3s, risk: Không nhận diện được tình trạng cấp cứu để điều hướng kịp thời.* |

**Automation hay augmentation?** ☒ Automation · ☐ Augmentation
Justify: *Automation — Tự động hóa hoàn toàn luồng lấy thông tin và kiểm tra lịch trống để tối ưu tốc độ cho khách hàng.*

**Learning signal:**

1. User correction đi vào đâu? *Lưu vào bảng logs "Misclassified Symptoms" để tinh chỉnh bộ logic phân loại khoa.*
2. Product thu signal gì để biết tốt lên hay tệ đi? *Tỷ lệ đặt lịch thành công (Conversion rate) và tỷ lệ user phải yêu cầu gặp người thật.*
3. Data thuộc loại nào? ☐ User-specific · ☒ Domain-specific · ☒ Real-time · ☐ Human-judgment · ☐ Khác: ___
   Có marginal value không? (Model đã biết cái này chưa?) *Có, model cần hiểu danh mục bác sĩ và bảng giá/quy trình riêng biệt của Vinmec.*

---

## 2. User Stories — 4 paths

### Feature: *AI Smart Booking (Đặt lịch thông minh)*

**Trigger:** *User nhắn tin mô tả tình trạng sức khỏe hoặc yêu cầu bác sĩ cụ thể.*

| Path | Câu hỏi thiết kế | Mô tả |
|------|-------------------|-------|
| Happy — AI đúng, tự tin | User thấy gì? Flow kết thúc ra sao? | *AI xác định đúng chuyên khoa, hiện lịch trống của bác sĩ phù hợp, user nhấn chọn và nhận tin nhắn xác nhận.* |
| Low-confidence — AI không chắc | System báo "không chắc" bằng cách nào? User quyết thế nào? | *AI hỏi: "Triệu chứng của bạn có thể thuộc khoa Nội tiết hoặc Tim mạch, bạn muốn tham khảo bác sĩ ở khoa nào?"* |
| Failure — AI sai | User biết AI sai bằng cách nào? Recover ra sao? | *AI gợi ý khoa Da liễu cho triệu chứng đau bụng → User thấy sai, nhấn "Chọn lại chuyên khoa" hoặc "Chat với tổng đài".* |
| Correction — user sửa | User sửa bằng cách nào? Data đó đi vào đâu? | *User chọn lại khoa đúng từ Menu → Dữ liệu này được gán nhãn lại để training cho model nhận diện triệu chứng tốt hơn.* |

---

## 3. Eval metrics + threshold

**Optimize precision hay recall?** ☐ Precision · ☒ Recall
Tại sao? *Ưu tiên Recall để đảm bảo mọi nhu cầu khám đều được ghi nhận. Thà gợi ý dư chuyên khoa để user chọn còn hơn bỏ sót khiến khách rời đi.*

| Metric | Threshold | Red flag (dừng khi) |
|--------|-----------|---------------------|
| *Tỷ lệ phân loại đúng khoa* | *≥90%* | *<80% trong 2 ngày liên tục* |
| *Thời gian hoàn tất đặt lịch* | *<1 phút* | *>3 phút (người dùng sẽ bỏ cuộc)* |
| *Tỷ lệ chuyển đổi (Conversion)* | *≥40%* | *<20%* |

---

## 4. Top 3 failure modes

| # | Trigger | Hậu quả | Mitigation |
|---|---------|---------|------------|
| 1 | *User nhập triệu chứng nguy kịch (đau ngực, đột quỵ)* | *AI vẫn thực hiện quy trình đặt lịch thông thường* | *Hard-coded keyword: Phát hiện dấu hiệu cấp cứu → Hiện số hotline cứu thương ngay lập tức.* |
| 2 | *Hệ thống lịch khám (HIS) bị delay cập nhật* | *User đặt vào giờ bác sĩ vừa mới kín lịch* | *Buffer time: Luôn để trống 10-15 phút giữa các ca và kiểm tra API real-time trước khi confirm.* |
| 3 | *User dùng tiếng lóng/tiếng địa phương* | *AI không hiểu chuyên khoa cần thiết* | *Dùng LLM (GPT/Claude) có khả năng hiểu phương ngữ tốt thay vì dùng chatbot kịch bản cũ.* |

---

## 5. ROI 3 kịch bản

|   | Conservative | Realistic | Optimistic |
|---|-------------|-----------|------------|
| **Assumption** | *50 booking/ngày, 50% qua AI* | *200 booking/ngày, 70% qua AI* | *1000 booking/ngày, 85% qua AI* |
| **Cost** | *$5/ngày (API cost)* | *$20/ngày* | *$100/ngày* |
| **Benefit** | *Giảm 1 nhân sự trực chat* | *Giảm 4 nhân sự, trực 24/7* | *Giảm 70% chi phí vận hành tổng đài booking* |
| **Net** | *Dương nhẹ* | *ROI ~300%* | *ROI ~800%* |

**Kill criteria:** *Khi tỷ lệ user phản hồi tiêu cực về việc sai chuyên khoa >15% hoặc hệ thống bị lỗi đồng bộ lịch quá 4h/lần.*

---

## 6. Mini AI spec (1 trang)

**Sản phẩm: Vinmec AI Concierge**

Sản phẩm là một trợ lý ảo thông minh tích hợp trên Website/App Vinmec và Zalo. Thay vì một menu nút bấm thô cứng, AI sử dụng ngôn ngữ tự nhiên để trò chuyện với bệnh nhân. 

1.  **Cơ chế hoạt động:** Sử dụng LLM để phân tích triệu chứng (từ kiến thức của Thư) để thực hiện "Triage" (Phân loại bệnh nhân) cơ bản, sau đó truy vấn vào hệ thống quản lý bệnh viện (phần logic của Minh) để tìm slot trống theo thời gian thực.
2.  **Giá trị cốt lõi:** Giải quyết sự "ngại" của khách hàng khi phải gọi điện tổng đài và chờ đợi. AI hoạt động 24/7, xử lý hàng ngàn yêu cầu cùng lúc.
3.  **An toàn y khoa:** AI được thiết lập rào chắn (Guardrails) để không bao giờ đưa ra chẩn đoán bệnh mà chỉ dừng lại ở mức gợi ý chuyên khoa khám phù hợp dựa trên danh mục JCI của Vinmec.
4.  **Vòng lặp dữ liệu:** Mỗi lần bác sĩ hoặc lễ tân điều chỉnh lại khoa mà AI đã chọn, hệ thống sẽ tự động ghi nhận đó là một bài học để nâng cao độ chính xác cho lần sau.
