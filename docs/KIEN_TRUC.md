# Kiến trúc

```
src/
├── app/         App, router (HashRouter), Layout + điều hướng 7 mục, hook dữ liệu chung
├── db/          Dexie schema (db.ts), Zod schema (schemas.ts), repository CRUD (repo.ts), seed
├── domain/      Phép tính thuần, có kiểm thử: 1RM, volume, progression, records, bodyTrends, nutrition, schedule
├── data/        Thư viện bài tập gốc, giáo án mặc định
├── backup/      Xuất/nhập JSON (validate trước khi ghi, một giao dịch), CSV, base64
├── features/    dashboard, workout, library, body, nutrition, analytics, settings, onboarding
├── components/  UI dùng chung, biểu đồ, toast và hộp xác nhận, ErrorBoundary
├── lib/         ngày giờ (giờ địa phương), định dạng số, tải tệp, xử lý ảnh, lưu trữ
└── pwa/         thông báo cập nhật phiên bản
```

## Nguyên tắc dữ liệu

- **Ghi ngay**: mỗi thao tác khi đang tập được ghi vào IndexedDB theo hàng đợi tuần tự, nên tải lại trang không mất hiệp đã ghi.
- **Kiểm tra mọi đầu vào** bằng Zod, dùng chung cho form và cho tệp nhập.
- **Xóa mềm** buổi tập, số đo và ảnh (vào Thùng rác). Chỉ người dùng mới xóa vĩnh viễn được.
- **Nhật ký ăn lưu bản chụp số liệu dinh dưỡng** tại thời điểm ghi. Sửa hay xóa thực phẩm sau đó không làm sai lịch sử.
- **Nâng cấp schema**: thêm `db.version(n+1).stores(...).upgrade(...)` trong `src/db/db.ts`. Không sửa phiên bản cũ. Bản sao lưu có `formatVersion` để chuyển đổi khi định dạng thay đổi.
- **Seed** chỉ nạp thư viện bài tập và giáo án mặc định, không bao giờ tạo dữ liệu cá nhân.

## Cập nhật ứng dụng

Service worker dùng chế độ `prompt`. Khi có bản mới, app chỉ hiện thông báo và người dùng chọn thời điểm cập nhật. IndexedDB nằm tách biệt với cache của service worker nên cập nhật không chạm vào dữ liệu.
