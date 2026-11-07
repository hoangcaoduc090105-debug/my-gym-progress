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

## Lịch sử schema IndexedDB (Dexie)

| Version | Thay đổi | Nâng cấp dữ liệu cũ |
|---|---|---|
| 1 | Schema ban đầu | — |
| 2 (v1.7.0) | Bảng `photoBlobs` (`id`, `data`) tách bytes ảnh gốc khỏi `photos`; `photos` còn siêu dữ liệu + `thumb` (JPEG 320 px) + `bytes`; `sessions` thêm chỉ mục kép `[status+date]` | `upgrade()` chuyển `data` của từng ảnh sang `photoBlobs` trong cùng giao dịch, đặt `thumb = null`; `ensureThumbnails()` (src/db/migrations.ts) tạo thumbnail nền sau khi app mở, mỗi lượt tối đa 5 ảnh |

Tệp sao lưu giữ nguyên định dạng v1.6 (ảnh = siêu dữ liệu + `dataBase64`), nên tệp cũ nhập được vào bản mới và ngược lại.

## Cập nhật ứng dụng

Service worker dùng chế độ `prompt`. Khi có bản mới, app chỉ hiện thông báo và người dùng chọn thời điểm cập nhật. IndexedDB nằm tách biệt với cache của service worker nên cập nhật không chạm vào dữ liệu.
