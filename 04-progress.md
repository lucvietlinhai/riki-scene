# Riki Scene - Kiem soat tien do

## Cach cap nhat

File nay dung de theo doi tien do dua tren checklist o [03-checklist-plan.md](./03-checklist-plan.md).

Quy uoc trang thai:

- `Not started`: Chua lam.
- `In progress`: Dang lam.
- `Blocked`: Dang bi chan.
- `Done`: Da hoan thanh va kiem tra.

## Tong quan tien do

| Phase | Ten phase | Trang thai | Tien do | Ghi chu |
| --- | --- | --- | --- | --- |
| 0 | Nen tang du an | Not started | 0% | Chua khoi tao codebase |
| 1 | Data model va project manager | Not started | 0% | Can chot stack backend |
| 2 | UI editor noi dung | Not started | 0% | Bam theo UI tham chieu |
| 3 | Script va segment | Not started | 0% | Moi dong la mot segment |
| 4 | Nhan vat, pose va SFX | Not started | 0% | Can asset nhan vat mau |
| 5 | Voiceover va audio | Not started | 0% | Can quyet dinh TTS provider dau tien |
| 6 | Scene renderer | Not started | 0% | Thanh phan cot loi cua render |
| 7 | Render worker | Not started | 0% | Playwright + FFmpeg |
| 8 | Render UX | Not started | 0% | Progress/log/cancel/output |
| 9 | Chat luong va on dinh | Not started | 0% | Test cac case thuc te |
| 10 | Dong goi va phat hanh noi bo | Not started | 0% | Sau khi MVP render on dinh |

## Moc tien do gan nhat

| Ngay | Noi dung | Ket qua | Ghi chu |
| --- | --- | --- | --- |
| 2026-07-30 | Khoi tao tai lieu ke hoach | Done | Tao 4 file MD nen tang |

## Viec dang lam

- Chua co hang muc dang lam.

## Viec bi chan

- Chua co blocker.

## Quyet dinh can chot

| Van de | Lua chon de xuat | Trang thai |
| --- | --- | --- |
| Backend | Node.js neu uu tien Playwright/FFmpeg workflow gon, Python neu uu tien AI/audio | Chua chot |
| Frontend | React + TypeScript cho editor phuc tap | Chua chot |
| TTS dau tien | Upload audio truoc, sau do them API TTS | Chua chot |
| Dong goi desktop | Tauri sau MVP web local | Chua chot |

## Tien do chi tiet theo phase

### Phase 0 - Nen tang du an

| Hang muc | Trang thai | Ghi chu |
| --- | --- | --- |
| Tao repository va cau truc thu muc chinh | Not started |  |
| Chon stack backend | Not started |  |
| Chon stack frontend | Not started |  |
| Thiet lap lint/format co ban | Not started |  |
| Tao script chay dev local | Not started |  |
| Tao file config moi truong | Not started |  |
| Kiem tra FFmpeg local | Not started |  |
| Kiem tra Playwright local | Not started |  |

### Phase 1 - Data model va project manager

| Hang muc | Trang thai | Ghi chu |
| --- | --- | --- |
| Dinh nghia schema `project.json` | Not started |  |
| Tao API tao project moi | Not started |  |
| Tao API doc danh sach project | Not started |  |
| Tao API doc chi tiet project | Not started |  |
| Tao API cap nhat project | Not started |  |
| Tao API xoa project | Not started |  |
| Tao thu muc assets rieng cho moi project | Not started |  |
| Tao thu muc output rieng cho moi project | Not started |  |
| Them co che autosave | Not started |  |

### Phase 2 - UI editor noi dung

| Hang muc | Trang thai | Ghi chu |
| --- | --- | --- |
| Tao layout 3 vung | Not started |  |
| Tao header voi ten project va nut render | Not started |  |
| Tao preview phone 9:16 | Not started |  |
| Tao form nhap tieu de ben trai/ben phai | Not started |  |
| Tao picker mau cho hai ben | Not started |  |
| Tao upload anh ben trai/ben phai | Not started |  |
| Tao crop/zoom anh | Not started |  |
| Tao noi dung giai thich cho hai ben | Not started |  |
| Dong bo editor voi `project.json` | Not started |  |

### Phase 3 - Script va segment

| Hang muc | Trang thai | Ghi chu |
| --- | --- | --- |
| Tao script panel | Not started |  |
| Moi dong script thanh mot segment | Not started |  |
| Them/xoa/sua segment | Not started |  |
| Sap xep segment | Not started |  |
| Tu tinh timing theo do dai cau | Not started |  |
| Luu `start` va `end` vao project | Not started |  |
| Gan segment voi subtitle preview | Not started |  |
| Canh bao khi script rong | Not started |  |

### Phase 4 - Nhan vat, pose va SFX

| Hang muc | Trang thai | Ghi chu |
| --- | --- | --- |
| Dinh nghia danh sach pose mac dinh | Not started |  |
| Tao asset nhan vat mau | Not started |  |
| Gan pose cho tung segment | Not started |  |
| Hien pose trong preview | Not started |  |
| Tao thu vien SFX co san | Not started |  |
| Upload SFX custom | Not started |  |
| Gan SFX cho tung segment | Not started |  |
| Nghe thu SFX | Not started |  |

### Phase 5 - Voiceover va audio

| Hang muc | Trang thai | Ghi chu |
| --- | --- | --- |
| Upload voiceover | Not started |  |
| Doc duration audio bang FFmpeg/ffprobe | Not started |  |
| Chia timing theo audio duration | Not started |  |
| Tich hop TTS provider dau tien | Not started |  |
| Luu audio vao project | Not started |  |
| Xu ly speed audio | Not started |  |
| Xu ly volume audio | Not started |  |
| Mix voiceover, SFX va background music | Not started |  |

### Phase 6 - Scene renderer

| Hang muc | Trang thai | Ghi chu |
| --- | --- | --- |
| Tao `scene.html` doc lap | Not started |  |
| Tao `scene.js` doc render topic | Not started |  |
| Implement layout video 9:16 | Not started |  |
| Render hai anh so sanh | Not started |  |
| Render subtitle theo timestamp | Not started |  |
| Render nhan vat va pose theo timestamp | Not started |  |
| Implement `prepareOfflineRender()` | Not started |  |
| Implement `renderFrame(time)` | Not started |  |
| Dung chung scene renderer cho preview va render | Not started |  |

### Phase 7 - Render worker

| Hang muc | Trang thai | Ghi chu |
| --- | --- | --- |
| Tao API bat dau render job | Not started |  |
| Tao API lay trang thai job | Not started |  |
| Tao API huy job | Not started |  |
| Playwright mo scene headless | Not started |  |
| Chup screenshot tung frame | Not started |  |
| Pipe PNG vao FFmpeg | Not started |  |
| Encode MP4 H.264/AAC | Not started |  |
| Ghi log render | Not started |  |
| Cap nhat progress cho UI | Not started |  |
| Tao link output sau khi render xong | Not started |  |

### Phase 8 - Render UX

| Hang muc | Trang thai | Ghi chu |
| --- | --- | --- |
| Tao render modal/drawer | Not started |  |
| Chon resolution | Not started |  |
| Chon FPS | Not started |  |
| Hien log render | Not started |  |
| Hien progress theo buoc | Not started |  |
| Nut cancel render | Not started |  |
| Nut mo output | Not started |  |
| Xu ly loi render than thien | Not started |  |

### Phase 9 - Chat luong va on dinh

| Hang muc | Trang thai | Ghi chu |
| --- | --- | --- |
| Test project mau voi audio ngan | Not started |  |
| Test project mau voi audio dai | Not started |  |
| Test anh dung, ngang, trong suot | Not started |  |
| Test script dai | Not started |  |
| Test cancel render | Not started |  |
| Test render lai nhieu lan | Not started |  |
| Kiem tra output MP4 tren VLC/browser | Not started |  |
| Kiem tra duong dan co dau tieng Viet | Not started |  |

### Phase 10 - Dong goi va phat hanh noi bo

| Hang muc | Trang thai | Ghi chu |
| --- | --- | --- |
| Viet README chay local | Not started |  |
| Tao script cai dependency | Not started |  |
| Tao script build | Not started |  |
| Dong goi runtime FFmpeg | Not started |  |
| Dong goi Playwright browser | Not started |  |
| Tao ban desktop bang Tauri hoac Electron | Not started |  |
| Tao release note MVP | Not started |  |
| Tao sample project di kem | Not started |  |
