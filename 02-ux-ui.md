# Riki Scene - Dinh huong UX/UI

## Nguyen tac trai nghiem

Riki Scene can cho nguoi dung cam giac dang bien y tuong thanh video that, khong phai dang cau hinh mot pipeline ky thuat. Giao dien nen ro, tap trung, co preview lon va cac thao tac quan trong luon nam trong tam mat.

Mot man hinh editor nen gom ba vung:

- Preview video 9:16 o ben trai.
- Editor noi dung va pose o giua.
- Script segment o ben phai.

## Bo cuc man hinh editor

```text
Header
  Logo / Ten project / Trang thai autosave / Nut Render MP4

Left Panel
  Phone preview 9:16
  Dieu huong scene hoac segment
  Nut play / pause / scrub timeline

Center Panel
  Tab Noi dung
  Tab Pose & am thanh
  Tab Render settings

Right Panel
  Script list
  Moi dong la mot nhip doc
  Trang thai timing va pose
```

## Tab Noi dung

Chuc nang:

- Nhap ten so sanh ben trai va ben phai.
- Chon mau nhan dien cho tung ben.
- Upload anh minh hoa cho tung ben.
- Crop, zoom, can anh.
- Nhap noi dung giai thich tung ben.
- Chon cau bat dau cho segment so sanh.

Trang thai can co:

- Anh dang trong.
- Anh dang upload.
- Anh upload loi.
- Anh da crop.
- Noi dung chua du de render.

## Tab Pose & am thanh

Chuc nang:

- Chon nhan vat thuyet minh.
- Gan pose mac dinh cho tung loai cau.
- Gan pose rieng cho tung dong script.
- Gan SFX cho tung pose hoac tung segment.
- Upload SFX custom.
- Nghe thu SFX.
- Tao hoac tai len voiceover.

Pose goi y:

- Chi trai - khong cuoi.
- Chi phai - khong cuoi.
- Thac mac - dau hoi.
- Chi trai - cuoi.
- Chi phai - cuoi.
- Trung lap - dung thang.

## Script Panel

Script panel la noi quan trong nhat de dieu khien timing. Moi dong script nen tuong ung mot segment.

Moi segment can hien:

- Thoi diem bat dau.
- Noi dung cau doc.
- Pose dang gan.
- SFX dang gan.
- Trang thai timing.

Hanh vi:

- Them dong moi.
- Xoa dong.
- Keo tha sap xep.
- Tach dong thanh hai segment.
- Gop hai dong.
- Tu chia timing khi script thay doi.

## Preview

Preview can gan voi output that nhat co the.

Thanh phan preview:

- Khung video doc 9:16.
- Tieu de hai ben so sanh.
- Hai anh minh hoa.
- Subtitle noi bat tung cau.
- Nhan vat thuyet minh.
- Pose thay doi theo segment.
- SFX va voiceover khi play.

Che do preview:

- Preview nhanh trong browser.
- Preview theo segment.
- Preview frame tai timestamp.
- Preview render-safe dung chung scene renderer.

## Render Screen / Render Drawer

Khi nguoi dung bam Render MP4, hien modal hoac drawer co:

- Project se render.
- Kich thuoc: 720x1280 hoac 1080x1920.
- FPS: mac dinh 24.
- Nguon voice: upload, TTS API, Edge TTS, local.
- Tuy chon watermark/branding.
- Nut Render.
- Log tien do.
- Nut Cancel.
- Link mo video sau khi xong.

## Phong cach hinh anh

Huong nhin nen than thien, tap trung vao creator tool, khong qua enterprise. Co the dung tong mau cam dat, kem am va xanh la nhe nhu UI tham chieu, nhung can tao nhan dien rieng cho Riki Scene.

De xuat:

- Nen sang, am, it gay moi mat.
- Button render noi bat.
- Border radius vua phai.
- Typography dam cho title video.
- Preview co bong do nhe de noi bat output.
- Editor giua ro rang, uu tien form va asset control.

## Nguyen tac copywriting

- Dung tu ngan gon.
- Nut hanh dong ro nghia: `Render MP4`, `Thay anh`, `Crop`, `Tao voice`, `Nghe thu`.
- Loi can chi ra cach sua.
- Khong dung qua nhieu giai thich ky thuat trong UI chinh.

## Accessibility va responsive

- Desktop la uu tien cho MVP.
- Toi thieu ho tro laptop 1366px.
- Phim tat sau MVP: play/pause, undo, duplicate segment, render.
- Mau phai co contrast tot.
- Input va button can de bam.

## Luong nguoi dung MVP

```text
Tao project
-> Nhap cap so sanh
-> Upload 2 anh
-> Viet script
-> Chon voice
-> Gan pose/SFX
-> Preview
-> Render MP4
-> Mo output
```

## Cac man hinh can thiet

- Project dashboard.
- New project.
- Editor.
- Render progress.
- Output viewer.
- Settings: TTS API, FFmpeg path, default render.
