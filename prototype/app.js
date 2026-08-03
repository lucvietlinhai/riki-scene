const state = {
  sceneIndex: 0,
  playing: false,
  timer: null,
  leftImage: "",
  rightImage: "",
  leftZoom: 100,
  rightZoom: 104,
  poses: []
};

const fallbackLeft = svgData(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400">
    <rect width="640" height="400" fill="#b9d7ea"/>
    <circle cx="270" cy="168" r="78" fill="#ffffff" opacity=".78"/>
    <circle cx="270" cy="145" r="28" fill="#347a99"/>
    <path d="M210 236c19-47 99-47 119 0" fill="#347a99"/>
    <path d="M70 330c94-123 167-200 278-248" stroke="#202525" stroke-width="20" stroke-linecap="round" opacity=".28"/>
    <circle cx="356" cy="84" r="20" fill="#fff" opacity=".6"/>
    <circle cx="450" cy="128" r="12" fill="#fff" opacity=".58"/>
    <circle cx="514" cy="220" r="16" fill="#fff" opacity=".5"/>
    <text x="42" y="64" font-family="Arial" font-size="34" font-weight="800" fill="#202525">Object view</text>
  </svg>
`);

const fallbackRight = svgData(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400">
    <rect width="640" height="400" fill="#cfe0c8"/>
    <circle cx="200" cy="128" r="54" fill="#fff"/>
    <circle cx="445" cy="128" r="54" fill="#fff"/>
    <text x="181" y="148" font-family="Arial" font-size="82" fill="#b64020">6</text>
    <text x="426" y="148" font-family="Arial" font-size="82" fill="#b64020">9</text>
    <rect x="148" y="218" width="98" height="118" rx="22" fill="#202525"/>
    <circle cx="197" cy="194" r="36" fill="#f1bd78"/>
    <rect x="394" y="218" width="98" height="118" rx="22" fill="#202525"/>
    <circle cx="443" cy="194" r="36" fill="#f1bd78"/>
    <rect x="248" y="305" width="164" height="38" rx="19" fill="#ea622f"/>
    <text x="42" y="64" font-family="Arial" font-size="34" font-weight="800" fill="#202525">Perspective</text>
  </svg>
`);

const els = {
  leftTerm: document.querySelector("#leftTerm"),
  rightTerm: document.querySelector("#rightTerm"),
  leftColor: document.querySelector("#leftColor"),
  rightColor: document.querySelector("#rightColor"),
  keyStatement: document.querySelector("#keyStatement"),
  scriptInput: document.querySelector("#scriptInput"),
  previewLeftTerm: document.querySelector("#previewLeftTerm"),
  previewRightTerm: document.querySelector("#previewRightTerm"),
  previewLine: document.querySelector("#previewLine"),
  leftPreviewImage: document.querySelector("#leftPreviewImage"),
  rightPreviewImage: document.querySelector("#rightPreviewImage"),
  leftEditorImage: document.querySelector("#leftEditorImage"),
  rightEditorImage: document.querySelector("#rightEditorImage"),
  leftUpload: document.querySelector("#leftUpload"),
  rightUpload: document.querySelector("#rightUpload"),
  leftZoom: document.querySelector("#leftZoom"),
  rightZoom: document.querySelector("#rightZoom"),
  resetLeft: document.querySelector("#resetLeft"),
  resetRight: document.querySelector("#resetRight"),
  sceneNumber: document.querySelector("#sceneNumber"),
  sceneTotal: document.querySelector("#sceneTotal"),
  lineCount: document.querySelector("#lineCount"),
  durationCount: document.querySelector("#durationCount"),
  prevScene: document.querySelector("#prevScene"),
  nextScene: document.querySelector("#nextScene"),
  playButton: document.querySelector("#playButton"),
  timeReadout: document.querySelector("#timeReadout"),
  poseList: document.querySelector("#poseList"),
  presenter: document.querySelector("#presenter"),
  poseBubble: document.querySelector("#poseBubble"),
  toast: document.querySelector("#toast"),
  renderButton: document.querySelector("#renderButton")
};

function svgData(markup) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup.trim())}`;
}

function getScenes() {
  return els.scriptInput.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function defaultPoseFor(index, text) {
  const lower = text.toLowerCase();
  if (lower.includes("khac") || lower.includes("gi?")) return "think";
  if (index % 2 === 0) return "point-left";
  return "point-right";
}

function poseLabel(pose) {
  return {
    "point-left": "chi trai",
    "point-right": "chi phai",
    think: "tham mac",
    smile: "cuoi nhe"
  }[pose] || "chi trai";
}

function ensurePoseState(scenes) {
  state.poses = scenes.map((scene, index) => state.poses[index] || defaultPoseFor(index, scene));
}

function renderPoseRows(scenes) {
  els.poseList.innerHTML = "";
  scenes.forEach((scene, index) => {
    const row = document.createElement("article");
    row.className = "pose-row";
    row.innerHTML = `
      <time>${formatTime(index * 2)}</time>
      <p>${escapeHtml(scene)}</p>
      <select aria-label="Pose dong ${index + 1}">
        <option value="point-left">Chi trai</option>
        <option value="point-right">Chi phai</option>
        <option value="think">Thac mac</option>
        <option value="smile">Cuoi nhe</option>
      </select>
    `;
    const select = row.querySelector("select");
    select.value = state.poses[index];
    select.addEventListener("change", () => {
      state.poses[index] = select.value;
      state.sceneIndex = index;
      render();
    });
    els.poseList.append(row);
  });
}

function render() {
  const scenes = getScenes();
  ensurePoseState(scenes);
  if (state.sceneIndex >= scenes.length) state.sceneIndex = Math.max(0, scenes.length - 1);

  const activeLine = scenes[state.sceneIndex] || els.keyStatement.value;
  const pose = state.poses[state.sceneIndex] || "point-left";

  els.previewLeftTerm.textContent = els.leftTerm.value || "Ben trai";
  els.previewRightTerm.textContent = els.rightTerm.value || "Ben phai";
  els.previewLeftTerm.style.color = els.leftColor.value;
  els.previewRightTerm.style.color = els.rightColor.value;
  els.previewLine.textContent = activeLine || "Nhap kich ban de tao nhịp doc.";

  els.leftPreviewImage.src = state.leftImage || fallbackLeft;
  els.rightPreviewImage.src = state.rightImage || fallbackRight;
  els.leftEditorImage.src = state.leftImage || fallbackLeft;
  els.rightEditorImage.src = state.rightImage || fallbackRight;

  setZoom(els.leftPreviewImage, state.leftZoom);
  setZoom(els.leftEditorImage, state.leftZoom);
  setZoom(els.rightPreviewImage, state.rightZoom);
  setZoom(els.rightEditorImage, state.rightZoom);

  els.sceneNumber.textContent = scenes.length ? state.sceneIndex + 1 : 0;
  els.sceneTotal.textContent = scenes.length;
  els.lineCount.textContent = scenes.length;
  els.durationCount.textContent = scenes.length * 2;
  els.timeReadout.textContent = formatTime(state.sceneIndex * 2);
  els.presenter.className = `presenter ${pose}`;
  els.poseBubble.textContent = poseLabel(pose);

  renderPoseRows(scenes);
}

function setZoom(image, value) {
  image.style.transform = `scale(${Number(value) / 100})`;
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function readImage(file, side) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    state[side] = reader.result;
    render();
    showToast("Da cap nhat anh preview.");
  };
  reader.readAsDataURL(file);
}

function stepScene(direction) {
  const scenes = getScenes();
  if (!scenes.length) return;
  state.sceneIndex = (state.sceneIndex + direction + scenes.length) % scenes.length;
  render();
}

function togglePlay() {
  state.playing = !state.playing;
  els.playButton.textContent = state.playing ? "Tam dung" : "Phat thu";
  clearInterval(state.timer);
  if (state.playing) {
    state.timer = setInterval(() => stepScene(1), 1400);
  }
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => els.toast.classList.remove("show"), 2400);
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));
    tab.classList.add("active");
    document.querySelector(`#${tab.dataset.tab}Panel`).classList.add("active");
  });
});

[els.leftTerm, els.rightTerm, els.leftColor, els.rightColor, els.keyStatement, els.scriptInput].forEach((input) => {
  input.addEventListener("input", render);
});

els.leftUpload.addEventListener("change", (event) => readImage(event.target.files[0], "leftImage"));
els.rightUpload.addEventListener("change", (event) => readImage(event.target.files[0], "rightImage"));
els.leftZoom.addEventListener("input", () => {
  state.leftZoom = els.leftZoom.value;
  render();
});
els.rightZoom.addEventListener("input", () => {
  state.rightZoom = els.rightZoom.value;
  render();
});
els.resetLeft.addEventListener("click", () => {
  state.leftImage = "";
  state.leftZoom = 100;
  els.leftZoom.value = 100;
  render();
});
els.resetRight.addEventListener("click", () => {
  state.rightImage = "";
  state.rightZoom = 104;
  els.rightZoom.value = 104;
  render();
});
els.prevScene.addEventListener("click", () => stepScene(-1));
els.nextScene.addEventListener("click", () => stepScene(1));
els.playButton.addEventListener("click", togglePlay);
els.renderButton.addEventListener("click", () => {
  showToast("Ban preview UI san sang. Buoc tiep theo se noi engine render MP4 bang Playwright + FFmpeg.");
});

state.leftZoom = els.leftZoom.value;
state.rightZoom = els.rightZoom.value;
render();
