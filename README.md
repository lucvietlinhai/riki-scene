# 🎬 Riki Scene — Công cụ tạo video so sánh
### *App Builder by linhlvtn@gmail.com with Riki Nihongo*

**Riki Scene** là ứng dụng Desktop cross-platform (chạy trên cả **Windows** và **macOS**) hỗ trợ biên tập và kết xuất video ngắn dạng dọc (tỷ lệ chuẩn **9:16 - 1080x1920**) dùng cho Tiktok, Shorts, Reels. Ứng dụng tích hợp 2 bộ đọc giọng nói tiếng Việt mượt mà chạy **offline hoàn toàn trên CPU (VieNeu-TTS ONNX & Kokoro-Vietnamese ONNX)** mà không cần kết nối internet hay GPU đắt tiền.

---

## 🛠️ Tài nguyên & Thư viện Sử dụng

Ứng dụng được thiết kế theo kiến trúc khép kín **All-in-One**, không yêu cầu người dùng phải cài đặt riêng lẻ từng công cụ phụ trợ:

### 1. Khung ứng dụng & Giao diện (Frontend & Desktop App)
- **[Electron](https://www.electronjs.org/)**: Khung đóng gói ứng dụng Desktop cross-platform.
- **HTML5 & Vanilla CSS3**: Thiết kế hệ thống theo chuẩn BEM & SCSS Design Tokens (màu sắc HSL, hiệu ứng glassmorphism, responsive).
- **Vanilla JavaScript (ES6+)**: Xử lý logic giao diện, tương tác chuột (Pointer Events), phát thử âm thanh Web Audio, hệ thống Bug Log & Logger toàn cục.

### 2. Bộ máy Thuyết minh Tiếng Việt & Đa ngữ (TTS Engines)
- **[VieNeu-TTS](https://github.com/vie-neu/vieneu)**: Mô hình trí tuệ nhân tạo đọc giọng nói Tiếng Việt tự nhiên (14 giọng đọc Bắc/Trung/Nam).
- **[Kokoro-Vietnamese](https://github.com/iamdinhthuan/Kokoro-Vietnamese)**: Bộ đọc TTS tiếng Việt thế hệ mới chạy ONNX CPU (14 giọng đọc đa dạng Nam/Nữ: Điểm Trịnh, Mai Linh, Hùng Thịnh, Tuấn Ngọc...).
- **Edge-TTS (Online Fallback)**: Đọc từ/cụm từ ngoại ngữ chèn trong ngoặc `[ja:...]`, `[en:...]`, `[zh:...]`.
- **ONNX Runtime (CPU / int8)**: Tối ưu hóa mô hình AI đọc nhanh, tiêu tốn ít tài nguyên CPU.
- **[uv](https://github.com/astral-sh/uv)**: Trình quản lý môi trường Python siêu nhanh (tự động tích hợp trong thư mục `bin/`).

### 3. Bộ Kết xuất & Xử lý Đồ họa Video (Video Renderer)
- **[Sharp](https://sharp.pixelplumbing.com/)**: Thư viện xử lý ảnh đồ họa hiệu năng cực cao (ghép nhân vật, ảnh minh họa, vẽ SVG vector frame).
- **[FFmpeg Static](https://github.com/eugeneware/ffmpeg-static)**: Công cụ ghép nối danh sách ảnh frame (24 FPS) và lồng ghép file âm thanh WAV (48kHz mono 16-bit PCM) thành video MP4 hoàn chỉnh.

---

## 📐 Sơ đồ Luồng Hoạt động Vận hành (Operational Flow Diagram)

Dưới đây là sơ đồ luồng dữ liệu từ khi người dùng nhập kịch bản tới khi xuất ra file video `.mp4`:

```mermaid
flowchart TD
    A[📄 Người dùng nhập Kịch bản & Cấu hình UI] --> B[🖥️ Electron Main Process]
    
    subgraph STAGE1["Giai đoạn 1: Tạo Âm thanh Thuyết minh (TTS Engine)"]
        B -->|Gọi Python via uv| C[🔊 vieneu_scene_tts.py / preview_voice.py]
        C -->|VieNeu-TTS / Kokoro-Vietnamese ONNX| D[🎵 Xuất các file WAV theo từng phân cảnh]
        C -->|Edge-TTS Online| D
    end
    
    subgraph STAGE2["Giai đoạn 2: Tạo Khung hình Đồ họa (Frames)"]
        B -->|Gọi Node.js Renderer| E[🎨 render-vieneu-highlight.js]
        E -->|Tính toán Y & Font Size| F[📐 Tạo SVG Vector Layout]
        F -->|Sharp Compositing| G[🖼️ Ghép Ảnh minh họa & Nhân vật PNG]
        G --> H[📁 Lưu chuỗi ảnh Frame 24 FPS vào TMP]
    end

    subgraph STAGE3["Giai đoạn 3: Đóng gói MP4"]
        D --> I[🎬 FFmpeg Video & Audio Encoder]
        H --> I
        I --> J[🎉 Video hoàn chỉnh tại d:\riki-scene\output\]
    end
```

---

## 📂 Cấu trúc Dự án (Project Structure)

```text
riki-scene/
├── bin/                       # Nơi chứa công cụ thực thi uv (Tự động tải về khi setup)
├── local-tts/
│   └── VieNeu-TTS/            # Môi trường Python venv & VieNeu-TTS / Kokoro-Vietnamese ONNX
├── prototype-v4/              # Giao diện người dùng (UI Preview, CSS Styles, App Logic)
│   ├── index.html             # Màn hình chính ứng dụng (Biên soạn, Thuyết minh, Bug Log)
│   ├── styles.css             # Hệ thống CSS Design System (BEM, hidden override)
│   └── app.js                 # Logic biên soạn, interactive preview, TTS config & AppLogger
├── renderer/                  # Bộ xử lý đồ họa & render video MP4
│   ├── render-vieneu-highlight.js # Engine kết xuất khung hình Sharp & FFmpeg
│   ├── vieneu_scene_tts.py    # Script Python gọi VieNeu / Kokoro-Vietnamese sinh âm thanh
│   └── preview_voice.py       # Script Python tạo câu chào nghe thử giọng đọc
├── output/                    # Thư mục mặc định chứa các video .mp4 xuất ra
├── electron-main.js           # Tiến trình chính Electron (IPC Main Process & Window management)
├── preload.js                 # Cầu nối an toàn IPC Bridge giữa UI và Node.js
├── setup-binaries.js          # Script tự động cài đặt uv & môi trường TTS (VieNeu + Kokoro)
├── start.bat                  # File tự động cài đặt & khởi chạy (Dành cho lần đầu)
├── start.command              # (Dành cho macOS)
├── run.bat                    # File khởi chạy nhanh ứng dụng (Cho các lần sử dụng sau)
├── run.command                # (Dành cho macOS)
└── package.json               # Khai báo thư viện & các lệnh npm script
```

---

## 💻 Hướng dẫn Cài đặt & Sử dụng

> **Yêu cầu duy nhất**: Máy tính cần cài sẵn **Node.js (v18 trở lên)**.  
> Tải Node.js tại: [https://nodejs.org](https://nodejs.org)

### 🪟 Dành cho Windows

#### Cài đặt lần đầu (hoặc khi cần cài đặt lại)
Double-click vào file **`start.bat`** tại thư mục dự án. Cửa sổ terminal sẽ tự động cài đặt thư viện cần thiết và mở ứng dụng.

#### Khởi chạy nhanh (Cho các lần sử dụng tiếp theo)
Double-click trực tiếp vào file **`run.bat`** để khởi chạy ngay ứng dụng mà không cần qua các bước kiểm tra và cài đặt lại.

---

### 🍎 Dành cho macOS

#### Cài đặt lần đầu (hoặc khi cần cài đặt lại)
1. Lần đầu tiên mở dự án, cần cấp quyền thực thi cho file `start.command` trong Terminal:
   ```bash
   chmod +x start.command
   ```
2. Sau đó, double-click file **`start.command`** trong Finder để khởi chạy và tự động thiết lập.

#### Khởi chạy nhanh (Cho các lần sử dụng tiếp theo)
1. Cấp quyền thực thi cho file `run.command` trong Terminal:
   ```bash
   chmod +x run.command
   ```
2. Sau đó, double-click file **`run.command`** để khởi chạy ngay lập tức.

---

## ⚡ Các Tính năng Nổi bật Trong Ứng dụng

1. **2 Bộ máy Thuyết minh Tiếng Việt Offline (TTS Engine)**:
   - **VieNeu-TTS (ONNX CPU)**: 14 giọng đọc tự nhiên (Minh Đức, Phạm Tuyên, Thái Sơn, Trúc Ly, Ngọc Linh...) hỗ trợ 3 phong cách (Tin tức, Tự nhiên, Đọc truyện).
   - **Kokoro-Vietnamese (ONNX CPU)**: 14 giọng đọc chất lượng cao thế hệ mới (Điểm Trịnh, Mai Linh, Hùng Thịnh, Tuấn Ngọc, Mỹ Yến, Ngọc Huyền...).
   - **Tự động chuyển đổi cấu hình động**: Giao diện chỉ hiển thị đúng các ô cài đặt của bộ máy TTS đang chọn.

2. **Trình biên soạn & Tương tác trực tiếp trên Preview (Interactive Preview)**:
   - **Sửa tiêu đề tại chỗ (Inline Edit)**: Double-click vào tiêu đề vế trái / vế phải ngay trên màn hình điện thoại xem trước để sửa chữ trực tiếp.
   - **Chọn tư thế nhân vật gọn gàng**: Click chuột phải vào nhân vật trên Preview để mở bảng menu chọn pose nhanh.
   - **Tải ảnh minh họa 1-click**: Đưa chuột lên ô ảnh trên Preview để bấm tải ảnh nhanh.

3. **🚨 Nút Bug Log & Hệ thống Giám sát Nhật ký (System Logger & Error Tracker)**:
   - Nút icon **Bug Log** đặt ngay ở header góc phải (bên cạnh nút Info).
   - **Tự động cảnh báo đỏ**: Khi vận hành ứng dụng xảy ra sự cố (lỗi Python TTS, lỗi JS runtime, Promise error), nút Bug Log tự động đổi sang màu đỏ rực kèm chấm đỏ phát sáng nhấp nháy.
   - **Bảng xem nhật ký chuyên nghiệp**: Hỗ trợ lọc theo tab (`All`, `Error`, `Warn`, `Info`), nút **Sao chép Log** 1-click và **Xóa Log**.

4. **🔊 Nghe thử Giọng đọc mẫu (Voice Preview)**:
   - Nghe thử trực tiếp câu chào từ giọng đọc được chọn (VieNeu hoặc Kokoro) trước khi bấm tạo video.

5. **Xem trước 1:1 Chuẩn Video MP4**:
   - Khung xem trước điện thoại mô phỏng chính xác 100% tỷ lệ bố cục và vị trí hiển thị video xuất ra tại `d:\riki-scene\output\`.
