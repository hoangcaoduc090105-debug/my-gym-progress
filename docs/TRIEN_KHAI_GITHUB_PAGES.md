# Triển khai lên GitHub Pages

Ứng dụng là các tệp tĩnh, không cần máy chủ hay biến môi trường bí mật. Workflow `.github/workflows/deploy.yml` tự kiểm thử, build, quét kết nối ra ngoài rồi đăng lên Pages.

## Các bước
1. Tạo repository mới trên GitHub, ví dụ `my-gym-progress` (Public hoặc Private đều được nếu gói tài khoản hỗ trợ Pages).
2. Đẩy mã nguồn lên nhánh `main`:
   ```bash
   git remote add origin https://github.com/<tên-tài-khoản>/my-gym-progress.git
   git push -u origin main
   ```
3. Trên GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Vào tab **Actions** và chờ workflow **Deploy to GitHub Pages** chạy xong (khoảng 2 phút).
5. Mở `https://<tên-tài-khoản>.github.io/my-gym-progress/` trên điện thoại, rồi cài lên màn hình chính (xem Hướng dẫn sử dụng).

Workflow tự đặt `BASE_PATH=/<tên-repo>/`, nên đổi tên repo không cần sửa code. Router dùng dạng `#/...` nên tải lại trang không bị lỗi 404.

## Cập nhật phiên bản
- Sửa code, tăng `version` trong `package.json`, rồi push lên `main`.
- Người dùng sẽ thấy thông báo **"Có phiên bản mới"** và bấm **Cập nhật**. Dữ liệu IndexedDB được giữ nguyên.
- Nếu đổi cấu trúc dữ liệu, thêm `db.version(n+1)` kèm hàm `upgrade` trong `src/db/db.ts` (xem `docs/KIEN_TRUC.md`).

## Lưu ý quyền riêng tư
- Repository **chỉ chứa mã nguồn**. `.gitignore` chặn tệp sao lưu (`my-gym-progress-*.json`, `*.csv`) và ảnh.
- **Không commit** tệp sao lưu cá nhân vào repo.
- Dữ liệu gắn với **địa chỉ trang**. Đổi tên repo hoặc tên miền là đổi địa chỉ, khi đó cần xuất JSON ở địa chỉ cũ rồi nhập lại ở địa chỉ mới.
