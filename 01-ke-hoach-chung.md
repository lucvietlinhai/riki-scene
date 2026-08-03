# Riki Scene - Ke hoach chung

## Muc tieu san pham

Riki Scene la cong cu tao video so sanh dang doc 9:16, chay local tren may nguoi dung. Nguoi dung nhap hai khai niem hoac hai doi tuong can so sanh, tai len hai hinh anh minh hoa, viet kich ban thuyet minh theo tung dong, chon nhan vat va pose theo tung phan doan, tao hoac tai len voiceover, sau do render ra mot file MP4 hoan chinh.

San pham uu tien trai nghiem don gian: nguoi dung thay ngay preview nhu video that, chinh noi dung o giua, quan ly kich ban o ben phai, va bam render de nhan MP4.

## Pham vi MVP

MVP tap trung vao mot template so sanh that on dinh truoc khi mo rong nhieu template.

- Tao va mo lai project local.
- Nhap tieu de project va hai muc so sanh.
- Upload, crop, zoom hai anh minh hoa.
- Nhap script, moi dong la mot segment.
- Chon pose nhan vat cho tung segment.
- Gan am thanh hieu ung co san hoac upload custom SFX.
- Upload voiceover hoac goi TTS API.
- Preview video trong giao dien 9:16.
- Render MP4 bang Playwright va FFmpeg.
- Luu output vao thu muc project.

## Kien truc du kien

```text
Local Web UI
-> Local Backend
-> Project JSON + Assets
-> Scene HTML Renderer
-> Playwright Headless Chromium
-> PNG frame stream
-> FFmpeg encode
-> final_video.mp4
```

## Thanh phan chinh

- Frontend editor: giao dien quan ly project, noi dung, anh, script, pose, am thanh va render.
- Scene renderer: trang HTML doc lap dung de preview va render tung frame theo thoi gian.
- Backend local: API quan ly project, upload file, TTS, render job va tien do.
- Render worker: Playwright dieu khien Chromium headless, chup frame va dua vao FFmpeg.
- Audio worker: xu ly voiceover, speed, volume, limiter, mix background music va SFX.
- Data layer: cau truc project, assets, output, cache va job logs.

## Cong nghe de xuat

- UI: HTML/CSS/TypeScript hoac React neu can scale nhanh.
- Backend: Node.js voi Fastify/Express hoac Python voi FastAPI.
- Render: Playwright + Chromium headless.
- Encode: FFmpeg local.
- Dong goi desktop ve sau: Tauri hoac Electron.
- Luu tru: file system local, moi project la mot folder rieng.

## Cau truc thu muc du kien

```text
riki-scene/
  docs/
  app/
    frontend/
    backend/
    renderer/
    workers/
  projects/
  runtime/
  outputs/
```

## Nguyen tac thiet ke ky thuat

- Preview va render dung chung mot scene renderer de tranh lech ket qua.
- Moi thay doi noi dung deu luu vao `project.json`.
- Render job phai co log, progress, cancel va output ro rang.
- Khong phu thuoc vao code cua phan mem khac; chi hoc mo hinh ky thuat va xay lai tu dau.
- MVP uu tien on dinh, de debug, sau do moi toi uu toc do render.

## Luong render muc tieu

```text
Nguoi dung bam Render
-> Backend tao render job
-> Kiem tra project.json va assets
-> Chuan bi voiceover
-> Tinh timing segment
-> Tao render-topic.json
-> Playwright mo scene.html?render=1
-> Goi window.prepareOfflineRender()
-> Lap tung frame: window.renderFrame(time)
-> Chup screenshot PNG
-> Pipe PNG vao FFmpeg
-> Mix audio va encode MP4
-> Tra outputUrl va log cho UI
```

## Rui ro can kiem soat

- Render cham voi video dai hoac may yeu.
- Sai lech timing neu chua co alignment bang Whisper.
- FFmpeg license va codec khi dong goi thuong mai.
- TTS API co chi phi va phu thuoc mang.
- Anh/nhac/SFX nguoi dung upload co ban quyen rieng.

## Dinh huong sau MVP

- Nhieu template video so sanh.
- Multi-scene timeline.
- Auto script generation.
- Auto subtitle alignment bang Whisper local.
- Nhieu nhan vat va pose custom.
- Export preset cho TikTok, YouTube Shorts, Facebook Reels.
- Dong goi thanh desktop app bang Tauri.
