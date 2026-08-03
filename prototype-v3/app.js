const fallbackLeft = svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400"><rect width="640" height="400" fill="#b9d7ea"/><circle cx="270" cy="168" r="78" fill="#fff" opacity=".78"/><circle cx="270" cy="145" r="28" fill="#347a99"/><path d="M210 236c19-47 99-47 119 0" fill="#347a99"/><path d="M70 330c94-123 167-200 278-248" stroke="#202525" stroke-width="20" stroke-linecap="round" opacity=".28"/><text x="42" y="64" font-family="Segoe UI,Arial" font-size="34" font-weight="800" fill="#202525">Object view</text></svg>`);
const fallbackRight = svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400"><rect width="640" height="400" fill="#cfe0c8"/><circle cx="200" cy="128" r="54" fill="#fff"/><circle cx="445" cy="128" r="54" fill="#fff"/><text x="181" y="148" font-family="Segoe UI,Arial" font-size="82" fill="#b64020">6</text><text x="426" y="148" font-family="Segoe UI,Arial" font-size="82" fill="#b64020">9</text><rect x="148" y="218" width="98" height="118" rx="22" fill="#202525"/><circle cx="197" cy="194" r="36" fill="#f1bd78"/><rect x="394" y="218" width="98" height="118" rx="22" fill="#202525"/><circle cx="443" cy="194" r="36" fill="#f1bd78"/></svg>`);

const state = { sceneIndex: 0, wordIndex: 0, playing: false, timer: null, images: { left: "", right: "" }, poses: [] };
const els = Object.fromEntries([...document.querySelectorAll("[id]")].map((el) => [el.id, el]));

function svgData(value) { return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(value)}`; }
function scenes() { return els.scriptInput.value.split(/\r?\n/).map((text) => text.trim()).filter(Boolean); }
function estimate(text) { return Math.max(2, Math.min(7, Math.round(text.split(/\s+/).length / 3.4))); }
function defaultPose(i, text) { return text.includes("?") || text.toLowerCase().includes("khác") ? "think" : i % 2 === 0 ? "point-left" : "point-right"; }
function poseLabel(pose) { return { "point-left": "chỉ trái", "point-right": "chỉ phải", think: "đặt câu hỏi" }[pose] || "chỉ trái"; }

function render() {
  const list = scenes();
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
  els.highlightText.innerHTML = words.map((word, i) => `<span class="word ${i === state.wordIndex ? "active-word" : ""}">${escapeHtml(word)}</span>`).join(" ");
}

function renderScenes(list) {
  els.sceneList.innerHTML = "";
  list.forEach((text, i) => {
    const row = document.createElement("article");
    row.className = `scene-row ${i === state.sceneIndex ? "active" : ""}`;
    row.innerHTML = `<button type="button">${i + 1}</button><p>${escapeHtml(text)}</p><select><option value="point-left">Chỉ trái</option><option value="point-right">Chỉ phải</option><option value="think">Đặt câu hỏi</option></select>`;
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
  showToast.timeout = setTimeout(() => els.toast.classList.remove("show"), 2400);
}

function formatTime(total) { return `${Math.floor(total / 60).toString().padStart(2, "0")}:${Math.floor(total % 60).toString().padStart(2, "0")}`; }
function escapeHtml(value) { return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char])); }

document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
  document.querySelectorAll(".panel").forEach((item) => item.classList.remove("active"));
  tab.classList.add("active");
  document.querySelector(`#${tab.dataset.panel}`).classList.add("active");
}));
[els.leftTerm, els.rightTerm, els.leftColor, els.rightColor, els.scriptInput, els.voiceSelect, els.styleSelect, els.highlightMode].forEach((item) => item.addEventListener("input", render));
els.leftUpload.addEventListener("change", (event) => readImage(event.target.files[0], "left"));
els.rightUpload.addEventListener("change", (event) => readImage(event.target.files[0], "right"));
els.prevScene.addEventListener("click", () => { state.sceneIndex = (state.sceneIndex - 1 + scenes().length) % scenes().length; state.wordIndex = 0; render(); });
els.nextScene.addEventListener("click", () => { state.sceneIndex = (state.sceneIndex + 1) % scenes().length; state.wordIndex = 0; render(); });
els.playButton.addEventListener("click", togglePlay);
els.renderButton.addEventListener("click", () => showToast("Renderer local đã sẵn sàng: chạy node D:\\riki-scene\\renderer\\render-vieneu-highlight.js để xuất MP4 có voice."));
render();
