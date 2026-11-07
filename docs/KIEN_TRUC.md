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

Tệp sao lưu v1.7 giữ nguyên định dạng v1.6 (ảnh = siêu dữ liệu + `dataBase64`), nên tệp cũ nhập được vào bản mới và ngược lại.

### v1.8.0 — chỉ thêm trường tùy chọn (không đổi chỉ mục, không cần Dexie version 3)

| Bảng / kiểu | Trường mới | Ý nghĩa | Bản ghi cũ |
|---|---|---|---|
| `SessionExercise` | `replacedFrom?: string` | Bài đã được "Thay bài" giữa buổi (exerciseId cũ) | vắng = chưa thay |
| `SetEntry` | `replacedFrom?: string` | Hiệp làm TRƯỚC khi thay bài thuộc về bài cũ; thống kê gán hiệp theo `set.replacedFrom ?? exerciseId` (`domain/sets.splitByExercise`) | vắng = thuộc bài hiện tại |
| `ProgramExercise`, `SessionExercise` | `groupId?: string` | Superset: bài cùng `groupId` nằm liên tiếp (nhãn A1/A2 — `domain/superset.ts`) | vắng = bài lẻ |
| `WorkoutSession` | `isDeload?: boolean` | Buổi nhẹ: loại khỏi gợi ý tăng tạ, kỷ lục, phát hiện chững | vắng = buổi thường |
| `Settings` | `barbell { barWeightKg, platesKg[] }` | Máy tính đĩa tạ (lưu kg) | điền mặc định khi đọc (`withSettingsDefaults`) |
| `Settings` | `weightUnit: 'kg' \| 'lb'` | Đơn vị hiển thị/nhập; **lưu trữ luôn là kg** (`lib/units.ts`) | mặc định `'kg'` |
| `Settings` | `dueNotifications: boolean` | Thông báo buổi đến hạn khi mở app | mặc định `false` |
| `meta` | khóa `csvNameMap` | Bảng ghép tên bài khi nhập CSV Strong/Hevy (tên chuẩn hóa → exerciseId) | — |

Schema Zod khai báo các trường trên là `optional()` để không bị loại bỏ khi lưu/nhập.

**Tệp sao lưu `formatVersion: 2`** (v1.8): cùng cấu trúc với bản 1, có thể chứa các trường mới ở trên. Tệp `formatVersion: 1` vẫn nhập được (trường mới vắng mặt = mặc định). Tệp có `formatVersion` lớn hơn bản app hỗ trợ bị từ chối kèm thông báo cập nhật app.

### Mô-đun mới (v1.8)

- `domain/`: `swap.ts` (thay bài), `exerciseHistory.ts`, `superset.ts`, `plates.ts` (quy hoạch động theo gram), `stagnation.ts`, `deload.ts`; `schedule.ts` thêm `openSchedules`/`dueSchedules` (một nơi tính "đến hạn").
- `db/history.ts` (tải lười): `sessionsWithExercise` (quét ngược chỉ mục `[status+date]`, con trỏ `ngày|id`), `prSessionIdsFor`, `stagnationFor`. `db/importWorkouts.ts`: ghi dữ liệu CSV trong một giao dịch.
- `backup/csvParse.ts` (RFC 4180), `backup/workoutImport.ts` (Strong/Hevy → buổi tập). `lib/units.ts`, `lib/ics.ts` (RFC 5545). `app/useUnits.ts`, `app/dueReminders.ts`. `public/sw-notify.js` được nạp vào service worker (`workbox.importScripts`) để xử lý bấm thông báo.
- Trang ghi buổi tập, hộp thoại Thay bài / Đĩa tạ / 3 buổi gần nhất, trang Nhập CSV đều tải lười (chunk riêng).

## Cập nhật ứng dụng

Service worker dùng chế độ `prompt`. Khi có bản mới, app chỉ hiện thông báo và người dùng chọn thời điểm cập nhật. IndexedDB nằm tách biệt với cache của service worker nên cập nhật không chạm vào dữ liệu.

### v1.9.0 — chỉ thêm trường tùy chọn (vẫn Dexie version 2, định dạng sao lưu 2)

| Nơi | Trường mới | Ý nghĩa | Bản ghi cũ |
|---|---|---|---|
| `Settings` | `weeklyTarget: number \| null` | Mục tiêu buổi/tuần cho chuỗi tuần tập đều (`domain/streak.ts`); null = theo số buổi của giáo án đang dùng | `withSettingsDefaults` điền null |
| Tệp sao lưu | `extras.csvNameMap?` | Bảng ghép tên bài CSV (meta `csvNameMap`); replace thay toàn bộ, merge gộp (tệp đè) | vắng = không đụng meta |
| `meta` | `fix.typo.czhinh` | Đã chạy `fixKnownTypos()` một lần (sửa mô tả giáo án seed cũ) | — |

Giáo án mẫu (`src/data/programTemplates.ts`) là dữ liệu tĩnh tải lười, tạo giáo án mới với id riêng qua `repo.addProgramFromTemplate`; không nằm trong seed.
