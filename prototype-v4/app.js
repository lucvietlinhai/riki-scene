const fallbackLeft = svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400"><rect width="640" height="400" fill="#b9d7ea"/><circle cx="270" cy="168" r="78" fill="#fff" opacity=".78"/><circle cx="270" cy="145" r="28" fill="#347a99"/><path d="M210 236c19-47 99-47 119 0" fill="#347a99"/><path d="M70 330c94-123 167-200 278-248" stroke="#202525" stroke-width="20" stroke-linecap="round" opacity=".28"/><text x="42" y="64" font-family="Segoe UI Variable,Segoe UI,Arial" font-size="34" font-weight="800" fill="#202525">Góc nhìn đúng</text></svg>`);
const fallbackRight = svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400"><rect width="640" height="400" fill="#cfe0c8"/><circle cx="200" cy="128" r="54" fill="#fff"/><circle cx="445" cy="128" r="54" fill="#fff"/><text x="181" y="148" font-family="Segoe UI Variable,Segoe UI,Arial" font-size="82" fill="#b64020">6</text><text x="426" y="148" font-family="Segoe UI Variable,Segoe UI,Arial" font-size="82" fill="#b64020">9</text><rect x="148" y="218" width="98" height="118" rx="22" fill="#202525"/><circle cx="197" cy="194" r="36" fill="#f1bd78"/><rect x="394" y="218" width="98" height="118" rx="22" fill="#202525"/><circle cx="443" cy="194" r="36" fill="#f1bd78"/></svg>`);

const state = { sceneIndex: 0, wordIndex: 0, playing: false, timer: null, images: { left: "", right: "" }, poses: [] };
const els = Object.fromEntries([...document.querySelectorAll("[id]")].map((el) => [el.id, el]));

const actorState = {
  "point-left": localStorage.getItem("riki:actor:point-left") || "",
  "point-right": localStorage.getItem("riki:actor:point-right") || "",
  "think": localStorage.getItem("riki:actor:think") || "",
  "explain-1": localStorage.getItem("riki:actor:explain-1") || "",
  "explain-2": localStorage.getItem("riki:actor:explain-2") || "",
  "explain-3": localStorage.getItem("riki:actor:explain-3") || "",
};

const settingsState = {
  outputPath: "",
  videoName: "",
};

function svgData(value) { return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(value)}`; }
function scenes() { return els.scriptInput.value.split(/\r?\n/).map((text) => text.trim()).filter(Boolean); }
function estimate(text) { return Math.max(2, Math.min(7, Math.round(text.split(/\s+/).length / 3.4))); }
function defaultPose(i, text) { return text.includes("?") || text.toLowerCase().includes("khác") ? "think" : i % 2 === 0 ? "point-left" : "point-right"; }
function poseLabel(pose) { return { "point-left": "chỉ trái", "point-right": "chỉ phải", think: "đặt câu hỏi", "explain-1": "giải thích", "explain-2": "nhấn mạnh", "explain-3": "phân tích" }[pose] || "chỉ trái"; }

function render() {
  const list = scenes();
  const phoneEl = document.querySelector(".phone");
  if (phoneEl) phoneEl.style.setProperty("--video-bg", els.videoBg.value);
  state.poses = list.map((text, i) => state.poses[i] || defaultPose(i, text));
  if (state.sceneIndex >= list.length) state.sceneIndex = Math.max(0, list.length - 1);
  const text = list[state.sceneIndex] || "";
  const pose = state.poses[state.sceneIndex] || "point-left";
  els.leftTitle.textContent = els.leftTerm.value;
  els.rightTitle.textContent = els.rightTerm.value;
  els.leftTitle.style.color = els.leftColor.value;
  els.rightTitle.style.color = els.rightColor.value;
  els.leftImage.src = state.images.left || fallbackLeft;
  els.rightImage.src = state.images.right || fallbackRight;
  els.leftEditorImage.src = state.images.left || fallbackLeft;
  els.rightEditorImage.src = state.images.right || fallbackRight;
  els.actor.className = `actor ${pose}`;
  els.poseName.textContent = poseLabel(pose);
  const customImg = actorState[pose];
  if (customImg) {
    els.actorCustomImg.src = customImg;
    els.actor.classList.add("actor--custom");
  } else {
    els.actorCustomImg.src = "";
    els.actor.classList.remove("actor--custom");
  }
  els.sceneNow.textContent = list.length ? state.sceneIndex + 1 : 0;
  els.sceneTotal.textContent = list.length;
  els.lineCount.textContent = list.length;
  els.durationCount.textContent = list.reduce((sum, item) => sum + estimate(item), 0);
  els.timeReadout.textContent = formatTime(list.slice(0, state.sceneIndex).reduce((sum, item) => sum + estimate(item), 0));
  renderHighlight(text);
  renderScenes(list);
  renderTimeline(list);
}

function renderHighlight(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const lineMode = els.highlightMode.value === "line";
  els.highlightText.innerHTML = words.map((word, i) => `<span class="word ${(lineMode || i === state.wordIndex) ? "active-word" : ""}">${escapeHtml(word)}</span>`).join(" ");
}

function renderScenes(list) {
  els.sceneList.innerHTML = "";
  list.forEach((text, i) => {
    const row = document.createElement("article");
    row.className = `scene-row ${i === state.sceneIndex ? "active" : ""}`;
    row.innerHTML = `<button type="button">${i + 1}</button><p>${escapeHtml(text)}</p><select><option value="point-left">Chỉ trái</option><option value="point-right">Chỉ phải</option><option value="think">Đặt câu hỏi</option><option value="explain-1">Giải thích</option><option value="explain-2">Nhấn mạnh</option><option value="explain-3">Phân tích</option></select>`;
    row.querySelector("button").addEventListener("click", () => { state.sceneIndex = i; state.wordIndex = 0; render(); });
    const select = row.querySelector("select");
    select.value = state.poses[i];
    select.addEventListener("change", () => { state.poses[i] = select.value; state.sceneIndex = i; render(); });
    els.sceneList.append(row);
  });
}

function renderTimeline(list) {
  els.timeline.innerHTML = "";
  list.forEach((text, i) => {
    const clip = document.createElement("button");
    clip.type = "button";
    clip.className = `clip ${i === state.sceneIndex ? "active" : ""}`;
    clip.style.flex = `${estimate(text)} 1 0`;
    clip.textContent = i + 1;
    clip.addEventListener("click", () => { state.sceneIndex = i; state.wordIndex = 0; render(); });
    els.timeline.append(clip);
  });
}

function tick() {
  const list = scenes();
  const words = (list[state.sceneIndex] || "").split(/\s+/).filter(Boolean);
  state.wordIndex += 1;
  if (state.wordIndex >= words.length) {
    state.wordIndex = 0;
    state.sceneIndex = (state.sceneIndex + 1) % Math.max(1, list.length);
  }
  render();
}

function togglePlay() {
  state.playing = !state.playing;
  els.playButton.textContent = state.playing ? "Tạm dừng" : "Phát thử";
  clearInterval(state.timer);
  if (state.playing) state.timer = setInterval(tick, 520);
}

function readImage(file, side) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { state.images[side] = reader.result; render(); };
  reader.readAsDataURL(file);
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => els.toast.classList.remove("show"), 4500);
}

function formatTime(total) { return `${Math.floor(total / 60).toString().padStart(2, "0")}:${Math.floor(total % 60).toString().padStart(2, "0")}`; }
function escapeHtml(value) { return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char])); }

document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
  document.querySelectorAll(".panel").forEach((item) => item.classList.remove("active"));
  tab.classList.add("active");
  document.querySelector(`#${tab.dataset.panel}`).classList.add("active");
}));

[els.leftTerm, els.rightTerm, els.leftColor, els.rightColor, els.videoBg, els.scriptInput, els.voiceSelect, els.styleSelect, els.highlightMode].forEach((item) => item.addEventListener("input", render));
els.leftUpload.addEventListener("change", (event) => readImage(event.target.files[0], "left"));
els.rightUpload.addEventListener("change", (event) => readImage(event.target.files[0], "right"));
els.prevScene.addEventListener("click", () => { const n = scenes().length || 1; state.sceneIndex = (state.sceneIndex - 1 + n) % n; state.wordIndex = 0; render(); });
els.nextScene.addEventListener("click", () => { const n = scenes().length || 1; state.sceneIndex = (state.sceneIndex + 1) % n; state.wordIndex = 0; render(); });
els.playButton.addEventListener("click", togglePlay);

function setActorImage(pose, dataUrl) {
  actorState[pose] = dataUrl;
  const poseKeyMap = {
    "point-left": "PointLeft",
    "point-right": "PointRight",
    "think": "Think",
    "explain-1": "Explain1",
    "explain-2": "Explain2",
    "explain-3": "Explain3",
  };
  const poseKey = poseKeyMap[pose] || "PointLeft";
  const img = els[`actorPreview${poseKey}`];
  const card = els[`poseCard${poseKey}`];
  const removeBtn = els[`actorRemove${poseKey}`];
  if (dataUrl) {
    img.src = dataUrl;
    img.classList.add("has-image");
    card.classList.add("has-image");
    removeBtn.hidden = false;
  } else {
    img.src = "";
    img.classList.remove("has-image");
    card.classList.remove("has-image");
    removeBtn.hidden = true;
  }
  render();
}

function initActorPreviews() {
  ["point-left", "point-right", "think", "explain-1", "explain-2", "explain-3"].forEach((pose) => {
    if (actorState[pose]) setActorImage(pose, actorState[pose]);
  });
}

function readActorImage(file, pose) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => setActorImage(pose, reader.result);
  reader.readAsDataURL(file);
}

els.actorUploadPointLeft.addEventListener("change", (e) => readActorImage(e.target.files[0], "point-left"));
els.actorUploadPointRight.addEventListener("change", (e) => readActorImage(e.target.files[0], "point-right"));
els.actorUploadThink.addEventListener("change", (e) => readActorImage(e.target.files[0], "think"));
els.actorUploadExplain1.addEventListener("change", (e) => readActorImage(e.target.files[0], "explain-1"));
els.actorUploadExplain2.addEventListener("change", (e) => readActorImage(e.target.files[0], "explain-2"));
els.actorUploadExplain3.addEventListener("change", (e) => readActorImage(e.target.files[0], "explain-3"));

els.actorRemovePointLeft.addEventListener("click", () => setActorImage("point-left", ""));
els.actorRemovePointRight.addEventListener("click", () => setActorImage("point-right", ""));
els.actorRemoveThink.addEventListener("click", () => setActorImage("think", ""));
els.actorRemoveExplain1.addEventListener("click", () => setActorImage("explain-1", ""));
els.actorRemoveExplain2.addEventListener("click", () => setActorImage("explain-2", ""));
els.actorRemoveExplain3.addEventListener("click", () => setActorImage("explain-3", ""));

els.actorSaveBtn.addEventListener("click", () => {
  ["point-left", "point-right", "think", "explain-1", "explain-2", "explain-3"].forEach((pose) => {
    if (actorState[pose]) {
      localStorage.setItem(`riki:actor:${pose}`, actorState[pose]);
    } else {
      localStorage.removeItem(`riki:actor:${pose}`);
    }
  });
  showToast("Đã lưu nhân vật mặc định ✓");
});

els.actorResetBtn.addEventListener("click", () => {
  ["point-left", "point-right", "think", "explain-1", "explain-2", "explain-3"].forEach((pose) => {
    setActorImage(pose, "");
    localStorage.removeItem(`riki:actor:${pose}`);
  });
  showToast("Đã xóa tất cả ảnh nhân vật");
});

function buildRenderConfig() {
  const list = scenes();
  return {
    leftTerm: els.leftTerm.value,
    rightTerm: els.rightTerm.value,
    leftColor: els.leftColor.value,
    rightColor: els.rightColor.value,
    leftImage: state.images.left || "",
    rightImage: state.images.right || "",
    voice: els.voiceSelect.value,
    style: els.styleSelect.value,
    highlight: els.highlightMode.value,
    videoBg: els.videoBg.value,
    outputPath: settingsState.outputPath,
    videoName: settingsState.videoName || "riki-scene-output",
    actorImages: {
      "point-left": actorState["point-left"],
      "point-right": actorState["point-right"],
      "think": actorState["think"],
      "explain-1": actorState["explain-1"],
      "explain-2": actorState["explain-2"],
      "explain-3": actorState["explain-3"],
    },
    scenes: list.map((text, i) => ({
      text,
      pose: state.poses[i] || "point-left",
    })),
  };
}

function setProgress(pct) {
  els.progressBar.style.width = `${pct}%`;
  els.progressLabel.textContent = `${pct}%`;
}

function appendLog(data) {
  const log = els.renderLog;
  const line = document.createElement("span");
  line.className = `render-panel__log-line render-panel__log-line--${data.type}`;
  line.textContent = data.text;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

if (typeof window.electronAPI !== "undefined") {
  window.electronAPI.onLog((data) => {
    appendLog(data);
    if (data.type === "done") {
      els.renderStatus.textContent = `✓ Hoàn tất: ${data.text}`;
      els.renderStatus.className = "render-panel__status is-done";
      els.renderOpenBtn.hidden = false;
      els.renderCancelBtn.hidden = true;
    }
    if (data.type === "error") {
      els.renderStatus.textContent = "✗ Render thất bại";
      els.renderStatus.className = "render-panel__status is-error";
    }
  });

  window.electronAPI.onDone((data) => {
    if (data.success) {
      setProgress(100);
      els.renderStatus.textContent = `✓ Xuất thành công → ${data.outputFile}`;
      els.renderStatus.className = "render-panel__status is-done";
      els.renderOpenBtn.hidden = false;
      els.renderCancelBtn.hidden = true;
      els.renderOpenBtn.dataset.filePath = data.outputFile;
    } else {
      els.renderStatus.textContent = "✗ Render thất bại. Xem log ở trên.";
      els.renderStatus.className = "render-panel__status is-error";
      els.renderCancelBtn.hidden = false;
    }
  });

  window.electronAPI.onProgress((pct) => {
    setProgress(pct);
    const stages = { 5: "Đang chuẩn bị…", 10: "Đang tạo giọng đọc…", 40: "Hoàn tất TTS, đang ghép audio…", 50: "Đang tạo khung hình…", 65: "Đang chuyển đổi SVG → PNG…", 82: "Đang render video…", 97: "Đang hoàn thiện…", 100: "Hoàn tất!" };
    if (stages[pct]) {
      els.renderStatus.textContent = stages[pct];
    }
  });
}

els.renderButton.addEventListener("click", () => {
  if (typeof window.electronAPI !== "undefined") {
    const list = scenes();
    if (!list.length) { showToast("Kịch bản đang trống. Hãy nhập ít nhất 1 dòng."); return; }
    els.videoNameInput.value = settingsState.videoName || "";
    els.outputPathInput.value = settingsState.outputPath || "";
    els.renderSettings.hidden = false;
  } else {
    const cmd = `node D:\\riki-scene\\renderer\\render-vieneu-highlight.js --voice "${els.voiceSelect.value}" --style ${els.styleSelect.value} --highlight ${els.highlightMode.value}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(cmd).then(() => showToast("Đã copy lệnh vào clipboard. Paste vào terminal để chạy."));
    } else {
      showToast(`Chạy: ${cmd}`);
    }
  }
});

els.browseFolderBtn.addEventListener("click", async () => {
  if (typeof window.electronAPI === "undefined") return;
  const videoName = els.videoNameInput.value.trim() || "riki-scene-output";
  const result = await window.electronAPI.showSaveDialog({
    title: "Chọn nơi lưu video",
    defaultPath: `${videoName}.mp4`,
    filters: [{ name: "MP4 Video", extensions: ["mp4"] }],
  });
  if (result && !result.canceled && result.filePath) {
    els.outputPathInput.value = result.filePath;
    settingsState.outputPath = result.filePath;
    const parts = result.filePath.replace(/\\/g, "/").split("/");
    const fileName = parts[parts.length - 1].replace(/\.mp4$/i, "");
    els.videoNameInput.value = fileName;
    settingsState.videoName = fileName;
  }
});

els.videoNameInput.addEventListener("input", () => {
  settingsState.videoName = els.videoNameInput.value.trim();
  if (settingsState.outputPath) {
    settingsState.outputPath = "";
    els.outputPathInput.value = "";
  }
});

els.settingsConfirmBtn.addEventListener("click", () => {
  settingsState.videoName = els.videoNameInput.value.trim() || "riki-scene-output";
  els.renderSettings.hidden = true;
  els.renderPanel.hidden = false;
  els.renderLog.innerHTML = "";
  setProgress(0);
  els.renderStatus.textContent = "Đang khởi động renderer…";
  els.renderStatus.className = "render-panel__status";
  els.renderOpenBtn.hidden = true;
  els.renderCancelBtn.hidden = false;
  window.electronAPI.startRender(buildRenderConfig());
});

els.settingsCancelBtn.addEventListener("click", () => { els.renderSettings.hidden = true; });
els.renderSettingsClose.addEventListener("click", () => { els.renderSettings.hidden = true; });

els.renderPanelClose.addEventListener("click", () => { els.renderPanel.hidden = true; });
els.renderCancelBtn.addEventListener("click", () => {
  if (typeof window.electronAPI !== "undefined") window.electronAPI.cancelRender();
  els.renderPanel.hidden = true;
});
els.renderOpenBtn.addEventListener("click", () => {
  if (typeof window.electronAPI !== "undefined") {
    window.electronAPI.openOutput(els.renderOpenBtn.dataset.filePath || "");
  }
});

initActorPreviews();
render();
