# Riki Scene - Checklist plan cong viec

## Phase 0 - Nen tang du an

- [ ] Tao repository va cau truc thu muc chinh.
- [ ] Chon stack backend: Node.js hoac Python.
- [ ] Chon stack frontend: vanilla TypeScript hoac React.
- [ ] Thiet lap lint/format co ban.
- [ ] Tao script chay dev local.
- [ ] Tao file config moi truong.
- [ ] Kiem tra FFmpeg local.
- [ ] Kiem tra Playwright local.

## Phase 1 - Data model va project manager

- [ ] Dinh nghia schema `project.json`.
- [ ] Tao API tao project moi.
- [ ] Tao API doc danh sach project.
- [ ] Tao API doc chi tiet project.
- [ ] Tao API cap nhat project.
- [ ] Tao API xoa project.
- [ ] Tao thu muc assets rieng cho moi project.
- [ ] Tao thu muc output rieng cho moi project.
- [ ] Them co che autosave.

## Phase 2 - UI editor noi dung

- [ ] Tao layout 3 vung: preview, editor, script.
- [ ] Tao header voi ten project va nut render.
- [ ] Tao preview phone 9:16.
- [ ] Tao form nhap tieu de ben trai/ben phai.
- [ ] Tao picker mau cho hai ben.
- [ ] Tao upload anh ben trai/ben phai.
- [ ] Tao crop/zoom anh.
- [ ] Tao noi dung giai thich cho hai ben.
- [ ] Dong bo editor voi `project.json`.

## Phase 3 - Script va segment

- [ ] Tao script panel.
- [ ] Moi dong script thanh mot segment.
- [ ] Them/xoa/sua segment.
- [ ] Sap xep segment.
- [ ] Tu tinh timing theo do dai cau.
- [ ] Luu `start` va `end` vao project.
- [ ] Gan segment voi subtitle preview.
- [ ] Canh bao khi script rong.

## Phase 4 - Nhan vat, pose va SFX

- [ ] Dinh nghia danh sach pose mac dinh.
- [ ] Tao asset nhan vat mau.
- [ ] Gan pose cho tung segment.
- [ ] Hien pose trong preview.
- [ ] Tao thu vien SFX co san.
- [ ] Upload SFX custom.
- [ ] Gan SFX cho tung segment.
- [ ] Nghe thu SFX.

## Phase 5 - Voiceover va audio

- [ ] Upload voiceover.
- [ ] Doc duration audio bang FFmpeg/ffprobe.
- [ ] Chia timing theo audio duration.
- [ ] Tich hop TTS provider dau tien.
- [ ] Luu audio vao project.
- [ ] Xu ly speed audio.
- [ ] Xu ly volume audio.
- [ ] Mix voiceover, SFX va background music.

## Phase 6 - Scene renderer

- [ ] Tao `scene.html` doc lap.
- [ ] Tao `scene.js` doc `project.json` hoac `render-topic.json`.
- [ ] Implement layout video 9:16.
- [ ] Render hai anh so sanh.
- [ ] Render subtitle theo timestamp.
- [ ] Render nhan vat va pose theo timestamp.
- [ ] Implement `prepareOfflineRender()`.
- [ ] Implement `renderFrame(time)`.
- [ ] Dam bao preview va render dung chung scene renderer.

## Phase 7 - Render worker

- [ ] Tao API bat dau render job.
- [ ] Tao API lay trang thai job.
- [ ] Tao API huy job.
- [ ] Playwright mo `scene.html` headless.
- [ ] Chup screenshot tung frame.
- [ ] Pipe PNG vao FFmpeg.
- [ ] Encode MP4 H.264/AAC.
- [ ] Ghi log render.
- [ ] Cap nhat progress cho UI.
- [ ] Tao link output sau khi render xong.

## Phase 8 - Render UX

- [ ] Tao render modal/drawer.
- [ ] Chon resolution.
- [ ] Chon FPS.
- [ ] Hien log render.
- [ ] Hien progress theo buoc.
- [ ] Nut cancel render.
- [ ] Nut mo output.
- [ ] Xu ly loi render than thien.

## Phase 9 - Chat luong va on dinh

- [ ] Test project mau voi audio ngan.
- [ ] Test project mau voi audio dai.
- [ ] Test anh dung, ngang, trong suot.
- [ ] Test script dai.
- [ ] Test cancel render.
- [ ] Test render lai nhieu lan.
- [ ] Kiem tra output MP4 tren VLC/browser.
- [ ] Kiem tra duong dan co dau tieng Viet.

## Phase 10 - Dong goi va phat hanh noi bo

- [ ] Viet README chay local.
- [ ] Tao script cai dependency.
- [ ] Tao script build.
- [ ] Dong goi runtime FFmpeg.
- [ ] Dong goi Playwright browser.
- [ ] Tao ban desktop bang Tauri hoac Electron.
- [ ] Tao release note MVP.
- [ ] Tao sample project di kem.

## Definition of Done MVP

- [ ] Tao project so sanh moi duoc.
- [ ] Upload duoc 2 anh.
- [ ] Viet script thanh segment duoc.
- [ ] Gan pose va SFX duoc.
- [ ] Co voiceover hop le.
- [ ] Preview gan dung video that.
- [ ] Render ra MP4 thanh cong.
- [ ] Mo lai project va render lai duoc.
