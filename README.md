# Riki Scene

Ứng dụng desktop tạo video giải nghĩa từ tự động với giọng đọc TTS tiếng Việt.

## 🚀 Khởi chạy nhanh (Click-to-Run)

> Chỉ cần có **Node.js** là đủ — mọi thứ còn lại sẽ được tự động cài đặt.

| Hệ điều hành | File cần double-click |
|---|---|
| **Windows** | `start.bat` |
| **macOS** | `start.command` *(cần cấp quyền lần đầu — xem bên dưới)* |

### Windows
Double-click vào file `start.bat` — cửa sổ terminal sẽ tự chạy từng bước và mở ứng dụng.

### macOS
Lần đầu tiên, cần cấp quyền thực thi trong Terminal:
```bash
chmod +x start.command
```
Sau đó double-click `start.command` trong Finder để khởi chạy.

---

## Yêu cầu hệ thống

| Thành phần | Tối thiểu |
|-----------|-----------|
| Node.js | v18 trở lên |
| npm | v8 trở lên |
| RAM | 4 GB |
| Kết nối Internet | Cần thiết khi chạy `npm run setup` lần đầu |

> Node.js tải về tại: https://nodejs.org

---

## Cài đặt (lần đầu)

Chạy **3 lệnh** theo thứ tự trong terminal:

```bash
# 1. Cài đặt Electron, sharp, ffmpeg-static
npm install

# 2. Tải uv (trình quản lý Python) và cài đặt môi trường TTS
npm run setup

# 3. Khởi động ứng dụng
npm start
```

> **Lưu ý:** `npm run setup` sẽ tải về ~15–30 MB dữ liệu (uv binary + Python + thư viện TTS).  
> Chỉ cần chạy một lần duy nhất. Lần sau chỉ cần `npm start`.

---

## Sử dụng

1. Mở ứng dụng bằng `npm start`.
2. Nhập nội dung kịch bản vào ô **Script**.
3. Tải lên ảnh minh họa và ảnh nhân vật (tuỳ chọn).
4. Chọn giọng đọc và tuỳ chỉnh màu sắc.
5. Nhấn nút **Xuất video** để render.

---

## Cấu trúc dự án

```
riki-scene/
├── bin/                  # uv binary (tự động tạo khi chạy npm run setup)
├── local-tts/
│   └── VieNeu-TTS/       # Engine TTS tiếng Việt (submodule)
├── prototype-v4/         # Giao diện ứng dụng
├── renderer/             # Bộ render video (sharp + ffmpeg)
├── electron-main.js      # Electron main process
├── setup-binaries.js     # Script cài đặt tự động
└── package.json
```

---

## Xử lý sự cố

| Lỗi | Cách khắc phục |
|-----|----------------|
| `Cannot find module 'sharp'` | Chạy lại `npm install` |
| `uv not found` | Chạy lại `npm run setup` |
| `TTS failed` | Kiểm tra kết nối Internet và chạy lại `npm run setup` |
| Video render lỗi | Kiểm tra `output/` để xem log |
