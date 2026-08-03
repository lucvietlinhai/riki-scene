const state = {
  projectName: "riki-comparison-demo",
  sceneIndex: 0,
  playing: false,
  timer: null,
  images: { left: "", right: "" },
  zoom: { left: 100, right: 104 },
  scenes: [],
  settings: { format: "1080x1920", fps: 30, transition: "cut" }
};

const fallbackLeft = svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400"><rect width="640" height="400" fill="#b9d7ea"/><circle cx="270" cy="168" r="78" fill="#fff" opacity=".78"/><circle cx="270" cy="145" r="28" fill="#347a99"/><path d="M210 236c19-47 99-47 119 0" fill="#347a99"/><path d="M70 330c94-123 167-200 278-248" stroke="#202525" stroke-width="20" stroke-linecap="round" opacity=".28"/><text x="42" y="64" font-family="Arial" font-size="34" font-weight="800" fill="#202525">Object view</text></svg>`);
const fallbackRight = svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400"><rect width="640" height="400" fill="#cfe0c8"/><circle cx="200" cy="128" r="54" fill="#fff"/><circle cx="445" cy="128" r="54" fill="#fff"/><text x="181" y="148" font-family="Arial" font-size="82" fill="#b64020">6</text><text x="426" y="148" font-family="Arial" font-size="82" fill="#b64020">9</text><rect x="148" y="218" width="98" height="118" rx="22" fill="#202525"/><circle cx="197" cy="194" r="36" fill="#f1bd78"/><rect x="394" y="218" width="98" height="118" rx="22" fill="#202525"/><circle cx="443" cy="194" r="36" fill="#f1bd78"/><rect x="248" y="305" width="164" height="38" rx="19" fill="#ea622f"/><text x="42" y="64" font-family="Arial" font-size="34" font-weight="800" fill="#202525">Perspective</text></svg>`);

const els = {
  saveStatus: document.querySelector("#saveStatus"),
  saveProject: document.querySelector("#saveProject"),
  openProject: document.querySelector("#openProject"),
  exportRender: document.querySelector("#exportRender"),
  formatSelect: document.querySelector("#formatSelect"),
  fpsSelect: document.querySelector("#fpsSelect"),
  transitionSelect: document.querySelector("#transitionSelect"),
  phone: document.querySelector(".phone"),
  leftTerm: document.querySelector("#leftTerm"),
  rightTerm: document.querySelector("#rightTerm"),
  leftColor: document.querySelector("#leftColor"),
  rightColor: document.querySelector("#rightColor"),
  leftTitle: document.querySelector("#leftTitle"),
  rightTitle: document.querySelector("#rightTitle"),
  leftImagePreview: document.querySelector("#leftImagePreview"),
  rightImagePreview: document.querySelector("#rightImagePreview"),
  leftImageEditor: document.querySelector("#leftImageEditor"),
  rightImageEditor: document.querySelector("#rightImageEditor"),
  leftUpload: document.querySelector("#leftUpload"),
  rightUpload: document.querySelector("#rightUpload"),
  leftZoom: document.querySelector("#leftZoom"),
  rightZoom: document.querySelector("#rightZoom"),
  resetLeft: document.querySelector("#resetLeft"),
  resetRight: document.querySelector("#resetRight"),
  swapImages: document.querySelector("#swapImages"),
  clearImages: document.querySelector("#clearImages"),
  scriptInput: document.querySelector("#scriptInput"),
  sceneText: document.querySelector("#sceneText"),
  actor: document.querySelector("#actor"),
  poseName: document.querySelector("#poseName"),
  sceneNumber: document.querySelector("#sceneNumber"),
  sceneTotal: document.querySelector("#sceneTotal"),
  lineCount: document.querySelector("#lineCount"),
  durationCount: document.querySelector("#durationCount"),
  sceneList: document.querySelector("#sceneList"),
  timeline: document.querySelector("#timeline"),
  prevScene: document.querySelector("#prevScene"),
  nextScene: document.querySelector("#nextScene"),
  playButton: document.querySelector("#playButton"),
  timeReadout: document.querySelector("#timeReadout"),
  toast: document.querySelector("#toast")
};

function svgData(markup) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

function linesFromScript() {
  return els.scriptInput.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function syncScenesFromScript() {
  const oldScenes = state.scenes;
  state.scenes = linesFromScript().map((text, index) => {
    const old = oldScenes.find((scene) => scene.text === text) || oldScenes[index];
    return {
      id: old?.id || `scene-${Date.now()}-${index}`,
      text,
      duration: Number(old?.duration || estimateDuration(text)),
      pose: old?.pose || defaultPose(index, text),
      layout: old?.layout || "compare"
    };
  });
  if (state.sceneIndex >= state.scenes.length) state.sceneIndex = Math.max(0, state.scenes.length - 1);
}

function estimateDuration(text) {
  return Math.max(2, Math.min(7, Math.round(text.split(/\s+/).length / 4)));
}

function defaultPose(index, text) {
  const lower = text.toLowerCase();
  if (lower.includes("khac") || lower.includes("gi?")) return "think";
  return index % 2 === 0 ? "point-left" : "point-right";
}

function poseLabel(pose) {
  return { "point-left": "chi trai", "point-right": "chi phai", think: "thac mac", smile: "cuoi nhe" }[pose] || "chi trai";
}

function render() {
  syncScenesFromScript();
  state.settings.format = els.formatSelect.value;
  state.settings.fps = Number(els.fpsSelect.value);
  state.settings.transition = els.transitionSelect.value;

  const scene = state.scenes[state.sceneIndex] || { text: "Nhap kich ban de tao scene.", pose: "point-left", duration: 2 };

  els.leftTitle.textContent = els.leftTerm.value || "Ben trai";
  els.rightTitle.textContent = els.rightTerm.value || "Ben phai";
  els.leftTitle.style.color = els.leftColor.value;
  els.rightTitle.style.color = els.rightColor.value;
  els.sceneText.textContent = scene.text;
  els.actor.className = `actor ${scene.pose}`;
  els.poseName.textContent = poseLabel(scene.pose);

  setImage("left", state.images.left || fallbackLeft);
  setImage("right", state.images.right || fallbackRight);
  setFormatClass();

  els.sceneNumber.textContent = state.scenes.length ? state.sceneIndex + 1 : 0;
  els.sceneTotal.textContent = state.scenes.length;
  els.lineCount.textContent = state.scenes.length;
  els.durationCount.textContent = totalDuration();
  els.timeReadout.textContent = formatTime(startTimeOf(state.sceneIndex));

  renderSceneList();
  renderTimeline();
}

function setImage(side, source) {
  const zoom = Number(state.zoom[side]) / 100;
  const preview = side === "left" ? els.leftImagePreview : els.rightImagePreview;
  const editor = side === "left" ? els.leftImageEditor : els.rightImageEditor;
  preview.src = source;
  editor.src = source;
  preview.style.transform = `scale(${zoom})`;
  editor.style.transform = `scale(${zoom})`;
}

function setFormatClass() {
  els.phone.classList.toggle("horizontal", state.settings.format === "1920x1080");
  els.phone.classList.toggle("square", state.settings.format === "1080x1080");
}

function renderSceneList() {
  els.sceneList.innerHTML = "";
  state.scenes.forEach((scene, index) => {
    const row = document.createElement("article");
    row.className = `scene-row${index === state.sceneIndex ? " active" : ""}`;
    row.innerHTML = `
      <button type="button">${index + 1}</button>
      <p>${escapeHtml(scene.text)}</p>
      <input type="number" min="1" max="20" step="0.5" value="${scene.duration}" aria-label="Thoi luong scene ${index + 1}" />
      <select aria-label="Pose scene ${index + 1}">
        <option value="point-left">Chi trai</option>
        <option value="point-right">Chi phai</option>
        <option value="think">Thac mac</option>
        <option value="smile">Cuoi nhe</option>
      </select>
    `;
    row.querySelector("button").addEventListener("click", () => {
      state.sceneIndex = index;
      render();
    });
    const duration = row.querySelector("input");
    duration.addEventListener("input", () => {
      scene.duration = Math.max(1, Number(duration.value || 1));
      markDirty();
      renderTimeline();
      render();
    });
    const pose = row.querySelector("select");
    pose.value = scene.pose;
    pose.addEventListener("change", () => {
      scene.pose = pose.value;
      state.sceneIndex = index;
      markDirty();
      render();
    });
    els.sceneList.append(row);
  });
}

function renderTimeline() {
  const total = totalDuration() || 1;
  els.timeline.innerHTML = "";
  state.scenes.forEach((scene, index) => {
    const clip = document.createElement("button");
    clip.className = `clip${index === state.sceneIndex ? " active" : ""}`;
    clip.type = "button";
    clip.style.flex = `${scene.duration} 1 0`;
    clip.textContent = `${index + 1}`;
    clip.title = `${scene.duration}s - ${scene.text}`;
    clip.addEventListener("click", () => {
      state.sceneIndex = index;
      render();
    });
    els.timeline.append(clip);
  });
  els.durationCount.textContent = total;
}

function totalDuration() {
  return state.scenes.reduce((sum, scene) => sum + Number(scene.duration || 0), 0);
}

function startTimeOf(index) {
  return state.scenes.slice(0, index).reduce((sum, scene) => sum + Number(scene.duration || 0), 0);
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function stepScene(amount) {
  if (!state.scenes.length) return;
  state.sceneIndex = (state.sceneIndex + amount + state.scenes.length) % state.scenes.length;
  render();
}

function togglePlay() {
  state.playing = !state.playing;
  els.playButton.textContent = state.playing ? "Tam dung" : "Phat thu";
  clearTimeout(state.timer);
  if (state.playing) scheduleNextScene();
}

function scheduleNextScene() {
  const scene = state.scenes[state.sceneIndex];
  if (!scene) return;
  state.timer = setTimeout(() => {
    stepScene(1);
    if (state.playing) scheduleNextScene();
  }, Number(scene.duration || 2) * 1000);
}

function readImage(file, side) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    state.images[side] = reader.result;
    markDirty();
    render();
    showToast("Da cap nhat anh.");
  };
  reader.readAsDataURL(file);
}

function projectPayload() {
  syncScenesFromScript();
  return {
    version: 1,
    name: state.projectName,
    createdBy: "riki-scene-local-prototype",
    settings: state.settings,
    content: {
      leftTerm: els.leftTerm.value,
      rightTerm: els.rightTerm.value,
      leftColor: els.leftColor.value,
      rightColor: els.rightColor.value,
      script: els.scriptInput.value
    },
    images: state.images,
    zoom: state.zoom,
    scenes: state.scenes
  };
}

function saveProjectFile() {
  downloadJson(`${state.projectName}.json`, projectPayload());
  els.saveStatus.textContent = "Da xuat JSON";
  showToast("Da xuat file project JSON.");
}

function exportRenderManifest() {
  const payload = projectPayload();
  const [width, height] = payload.settings.format.split("x").map(Number);
  const manifest = {
    ...payload,
    render: {
      width,
      height,
      fps: payload.settings.fps,
      totalDuration: totalDuration(),
      frameCount: Math.round(totalDuration() * payload.settings.fps),
      audioMode: "none-for-now",
      pipelineNext: "Playwright captures HTML frames, FFmpeg encodes MP4"
    }
  };
  downloadJson(`${state.projectName}-render-manifest.json`, manifest);
  showToast("Da xuat goi render JSON. Engine MP4 se noi o buoc sau.");
}

function openProjectFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result);
      state.projectName = payload.name || state.projectName;
      state.images = payload.images || state.images;
      state.zoom = payload.zoom || state.zoom;
      els.leftTerm.value = payload.content?.leftTerm || "Khach quan";
      els.rightTerm.value = payload.content?.rightTerm || "Chu quan";
      els.leftColor.value = payload.content?.leftColor || "#b92c1e";
      els.rightColor.value = payload.content?.rightColor || "#6f9f42";
      els.scriptInput.value = payload.content?.script || "";
      els.formatSelect.value = payload.settings?.format || "1080x1920";
      els.fpsSelect.value = String(payload.settings?.fps || 30);
      els.transitionSelect.value = payload.settings?.transition || "cut";
      state.scenes = payload.scenes || [];
      state.sceneIndex = 0;
      els.leftZoom.value = state.zoom.left;
      els.rightZoom.value = state.zoom.right;
      els.saveStatus.textContent = "Da mo JSON";
      render();
      showToast("Da mo project.");
    } catch {
      showToast("File JSON khong dung dinh dang project.");
    }
  };
  reader.readAsText(file);
}

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function markDirty() {
  els.saveStatus.textContent = "Chua luu";
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => els.toast.classList.remove("show"), 2300);
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((panel) => panel.classList.remove("active"));
    tab.classList.add("active");
    document.querySelector(`#${tab.dataset.panel}`).classList.add("active");
  });
});

[els.leftTerm, els.rightTerm, els.leftColor, els.rightColor, els.scriptInput, els.formatSelect, els.fpsSelect, els.transitionSelect].forEach((input) => {
  input.addEventListener("input", () => {
    markDirty();
    render();
  });
});

els.leftUpload.addEventListener("change", (event) => readImage(event.target.files[0], "left"));
els.rightUpload.addEventListener("change", (event) => readImage(event.target.files[0], "right"));
els.leftZoom.addEventListener("input", () => { state.zoom.left = Number(els.leftZoom.value); markDirty(); render(); });
els.rightZoom.addEventListener("input", () => { state.zoom.right = Number(els.rightZoom.value); markDirty(); render(); });
els.resetLeft.addEventListener("click", () => { state.images.left = ""; state.zoom.left = 100; els.leftZoom.value = 100; markDirty(); render(); });
els.resetRight.addEventListener("click", () => { state.images.right = ""; state.zoom.right = 104; els.rightZoom.value = 104; markDirty(); render(); });
els.swapImages.addEventListener("click", () => {
  [state.images.left, state.images.right] = [state.images.right, state.images.left];
  [state.zoom.left, state.zoom.right] = [state.zoom.right, state.zoom.left];
  [els.leftTerm.value, els.rightTerm.value] = [els.rightTerm.value, els.leftTerm.value];
  [els.leftColor.value, els.rightColor.value] = [els.rightColor.value, els.leftColor.value];
  els.leftZoom.value = state.zoom.left;
  els.rightZoom.value = state.zoom.right;
  markDirty();
  render();
});
els.clearImages.addEventListener("click", () => { state.images.left = ""; state.images.right = ""; markDirty(); render(); });
els.prevScene.addEventListener("click", () => stepScene(-1));
els.nextScene.addEventListener("click", () => stepScene(1));
els.playButton.addEventListener("click", togglePlay);
els.saveProject.addEventListener("click", saveProjectFile);
els.exportRender.addEventListener("click", exportRenderManifest);
els.openProject.addEventListener("change", (event) => openProjectFile(event.target.files[0]));

render();
