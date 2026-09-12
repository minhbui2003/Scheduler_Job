# Kiểm tra Scheduler Job — 12/09/2026

## Đã sửa

- Nút hoàn thành mở form đánh giá trước khi lưu. Lưu thành công mới đánh dấu phỏng vấn hoàn thành.
- Phỏng vấn đã hoàn thành có nút xem/bổ sung đánh giá; Reviews cho mở lại toàn bộ đánh giá để sửa offer, kết quả, ghi chú.
- Lưu cả ưu/nhược điểm và phúc lợi đang gõ dù chưa bấm nút thêm. Sửa lỗi cập nhật state làm mất phúc lợi tùy chỉnh; hiển thị lại phúc lợi đã thêm.
- Reviews hiển thị ưu/nhược điểm, ghi chú, mức lương chính xác; bảng so sánh thêm lương trao đổi, Gross/Net, thử việc và phúc lợi. Chọn 2–4 job; bộ lọc loại lựa chọn không còn hiển thị.
- Sắp xếp lương theo nhóm tiền tệ và Gross/Net, không coi các con số khác tiền tệ là tương đương. Không tự quy đổi tỷ giá. Điểm chưa chấm không hiển thị như điểm 0.
- API kiểm tra ID, mức lương không âm/hữu hạn, thử việc 0–100%, quan hệ interview–job–company và sự tồn tại của job/company. Chặn review lịch hủy/vắng mặt và review trùng. Hoàn thành qua review xóa các reminder đang chờ.
- Nút, select và ô nhập dễ chạm hơn, focus bàn phím rõ ràng; hỗ trợ giảm chuyển động. Modal có giới hạn chiều cao và phần lưu cố định khi cuộn; chặn đóng lúc đang lưu.
- Thanh điều hướng dưới cho mobile; thông báo không vượt viewport; thanh chuyển tuần vừa màn hình 320px. Lịch hiển thị cả khung 00:00–05:59 vốn bị bỏ sót.
- Scheduler, Applications và Reviews có thông báo lỗi/thử lại; tránh response cũ ghi đè dữ liệu khi đổi bộ lọc hoặc tuần nhanh. Chặn ngày không hợp lệ trong URL làm hỏng lịch.

## Đã kiểm tra

- `npm run lint`: qua.
- `npm run build`: qua cả biên dịch, TypeScript và tạo trang.
- `node --test tests/reviews.test.mjs`: 4 nhóm test qua, gồm validate, cập nhật một trường không xóa trường khác, hoàn thành/xóa reminder, chặn dữ liệu sai và review trùng.
- `tests/review-flow.cjs`: Edge headless chạy trên bản production local. Qua luồng hoàn thành → ghi lương/ghi chú/ưu nhược/phúc lợi → lưu → sửa offer → so sánh → mở lại từ lịch đã hoàn thành → lỗi tải và thử lại.
- Kiểm tra không tràn ngang Reviews, Scheduler, Applications, Profile, Settings ở 320, 390, 768, 1440px. Các bảng so sánh có vùng cuộn ngang riêng.
- Ảnh kiểm tra ở `artifacts/review-mobile.png` và `artifacts/reviews-*.png`.

Browser test dùng API giả lập; test handler dùng model giả lập. Không ghi dữ liệu thử vào MongoDB thật và không gửi email/thông báo thật. Đây không phải kiểm thử toàn hệ thống với dịch vụ ngoài hoặc chứng nhận mọi thiết bị mobile.

Chạy browser test với local server ở port 3100 (`node node_modules/next/dist/bin/next start --port 3100`), có Playwright và Edge. Script đọc JWT_SECRET từ môi trường local, chỉ tạo cookie trong browser test. Có thể đặt PLAYWRIGHT_MODULE tới module Playwright đã cài; sau đó chạy `node tests/review-flow.cjs`.

## Phần chưa hoàn chỉnh / cần xác minh tiếp

- Settings vẫn là placeholder cho tùy chỉnh thông báo, ngôn ngữ và múi giờ.
- Cron mới xử lý thông báo trong ứng dụng; gửi nhắc lịch email/Telegram/Discord còn TODO.
- Chưa kiểm thử end-to-end với MongoDB, đăng ký/xác minh email, AI provider, cron và tài khoản thật.
- Lưu review và cập nhật interview/application là nhiều lệnh DB riêng, chưa có transaction; chưa kiểm thử lỗi DB giữa các lệnh. Kết quả review và trạng thái application chưa có cơ chế đồng bộ kết quả OFFER/FAILED tự động.
- Next.js báo convention `middleware` deprecated; build vẫn qua. Cần chuyển sang `proxy` trong đợt xử lý authentication, cùng việc kiểm tra refresh token khi access token hết hạn.
