# 🚀 Hướng Dẫn Build Assets (JS/React)

Dự án hiện đã được cấu hình để đồng bộ code trực tiếp từ máy của bạn vào Docker. Tuy nhiên, vì code JS/React cần được biên dịch (build) qua Vite, bạn cần chạy lệnh build mỗi khi thay đổi frontend.

## 🛠️ Lệnh Build Assets (Khuyên dùng)

Nếu máy bạn **không cài sẵn Node.js**, hãy sử dụng lệnh này để tận dụng Docker:

```bash
docker run --rm -v $(pwd):/var/www -w /var/www node:20-alpine npm run build
```

**Giải thích lệnh:**
- `docker run --rm`: Chạy container tạm thời và tự xóa sau khi xong.
- `-v $(pwd):/var/www`: Gắn thư mục hiện tại vào container.
- `-w /var/www`: Thiết lập thư mục làm việc.
- `node:20-alpine`: Sử dụng môi trường Node.js bản nhẹ.
- `npm run build`: Lệnh thực hiện build assets.

---

## ⚡ Lệnh Build Nhanh (Nếu máy có sẵn Node.js)

Nếu máy bạn **đã cài sẵn Node.js và npm**, bạn có thể chạy trực tiếp:

```bash
npm run build
```

---

## 🔄 Khi nào cần chạy lệnh này?

1. **Chỉnh sửa UI/React**: Khi bạn thay đổi bất kỳ file nào trong `resources/js/`.
2. **Chỉnh sửa CSS**: Khi thay đổi `resources/css/` hoặc cấu hình Tailwind.
3. **Sau khi Pull code mới**: Nếu code mới có thay đổi về frontend.

---

## 💡 Lưu ý quan trọng

- **Code PHP:** Bạn **KHÔNG cần** chạy lệnh này. Chỉ cần lưu file, container sẽ nhận diện ngay.
- **Xóa Cache:** Sau khi build, nếu không thấy thay đổi, hãy chạy lệnh xóa cache Laravel:
  ```bash
  docker exec api-laido_app_1 php artisan optimize:clear
  ```
- **Trình duyệt:** Sử dụng `Ctrl + F5` để đảm bảo trình duyệt không dùng bản cache cũ.
