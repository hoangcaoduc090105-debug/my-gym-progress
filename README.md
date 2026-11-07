# My Gym Progress

Ứng dụng web **local-first**, giao diện sáng (có chế độ tối), để theo dõi tập gym, tăng cơ, số đo cơ thể và dinh dưỡng. Chạy hoàn toàn trên thiết bị, **dùng được offline**, cài được lên điện thoại dưới dạng PWA.

- **Không backend, không tài khoản, không AI/LLM API, không API key.** Mọi phép tính chạy bằng JavaScript trên thiết bị.
- **Dữ liệu chỉ nằm trong IndexedDB của trình duyệt.** Repository này không chứa dữ liệu cá nhân nào. Hồ sơ được nhập ở lần mở đầu tiên.
- **Không gửi dữ liệu ra ngoài.** Chính sách CSP `connect-src 'self'` chặn mọi kết nối ra ngoài, và bước kiểm tra tự động trong CI quét bản build.

## Tính năng

| Module | Nội dung |
|---|---|
| Tổng quan | Cân nặng, chiều cao, thay đổi trong tuần, số buổi và số hiệp trong tuần, buổi kế tiếp, nhóm cơ đã tập, kỷ lục gần đây, nhắc đo vòng |
| Lịch tập | Giáo án (tạo/sửa/nhân bản), lịch theo ngày, ghi hiệp (kg, số lần, RIR), ghi chú, chép thông số buổi trước, đồng hồ nghỉ, gợi ý tăng tạ, lịch sử |
| Thư viện bài tập | 57 bài, 10 nhóm cơ, tên Việt/Anh, nhóm cơ chính/phụ, dụng cụ, hướng dẫn, lỗi thường gặp, bài thay thế, bài tự tạo |
| Tiến độ cơ thể | Cân nặng và 6 số đo vòng, biểu đồ theo ngày/tuần/tháng, ảnh tiến độ lưu trên máy, so sánh 2 ảnh |
| Dinh dưỡng | Thực phẩm tự nhập (có nhãn "Ước tính" hoặc "Đã xác minh"), nhật ký theo bữa, thực đơn mẫu, tiến độ protein |
| Phân tích | Số hiệp theo nhóm cơ, tổng khối lượng, e1RM, kỷ lục cá nhân (PR), số buổi mỗi tuần, xu hướng cân nặng và vòng eo, kèm giải thích cách tính |
| Cài đặt | Hồ sơ, mục tiêu, quy tắc tăng tạ, xuất/nhập JSON, xuất CSV, thùng rác, nguồn tham khảo |

## Chạy trên máy

```bash
npm install
npm run dev        # http://localhost:5173
```

## Kiểm thử

```bash
npm run check      # typecheck + unit/integration (Vitest) + build + quét kết nối ra ngoài
npm run test:e2e   # kiểm thử đầu-cuối trên bản build (Playwright/Chromium, gồm cả kiểm tra offline)
```

Lần đầu chạy E2E trên máy mới, cài trình duyệt Chromium cho Playwright bằng lệnh `npx playwright install chromium`.

## Tài liệu

- **Ứng dụng:** https://hoangcaoduc090105-debug.github.io/my-gym-progress/
- [Hướng dẫn sử dụng](docs/HUONG_DAN_SU_DUNG.md)
- [Hướng dẫn tập luyện cho người mới — từng động tác](docs/HUONG_DAN_TAP_LUYEN.md)
- [Thực đơn Việt Nam mẫu (số liệu Viện Dinh dưỡng)](docs/THUC_DON_VIET_NAM.md)
- [Triển khai lên GitHub Pages](docs/TRIEN_KHAI_GITHUB_PAGES.md)
- [Cách tính chỉ số và nguồn tham khảo](docs/CACH_TINH_CHI_SO.md)
- [Kiến trúc](docs/KIEN_TRUC.md)

## Công nghệ

React 18, TypeScript (strict), Vite 6, Tailwind CSS 3, Dexie 4 (IndexedDB), Recharts 2, Zod, vite-plugin-pwa (Workbox), Vitest, Playwright.
