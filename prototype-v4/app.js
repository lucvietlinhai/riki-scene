const fallbackLeft = svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400"><rect width="640" height="400" fill="#b9d7ea"/><circle cx="270" cy="168" r="78" fill="#fff" opacity=".78"/><circle cx="270" cy="145" r="28" fill="#347a99"/><path d="M210 236c19-47 99-47 119 0" fill="#347a99"/><path d="M70 330c94-123 167-200 278-248" stroke="#202525" stroke-width="20" stroke-linecap="round" opacity=".28"/><text x="42" y="64" font-family="Segoe UI Variable,Segoe UI,Arial" font-size="34" font-weight="800" fill="#202525">Góc nhìn đúng</text></svg>`);
const fallbackRight = svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400"><rect width="640" height="400" fill="#cfe0c8"/><circle cx="200" cy="128" r="54" fill="#fff"/><circle cx="445" cy="128" r="54" fill="#fff"/><text x="181" y="148" font-family="Segoe UI Variable,Segoe UI,Arial" font-size="82" fill="#b64020">6</text><text x="426" y="148" font-family="Segoe UI Variable,Segoe UI,Arial" font-size="82" fill="#b64020">9</text><rect x="148" y="218" width="98" height="118" rx="22" fill="#202525"/><circle cx="197" cy="194" r="36" fill="#f1bd78"/><rect x="394" y="218" width="98" height="118" rx="22" fill="#202525"/><circle cx="443" cy="194" r="36" fill="#f1bd78"/></svg>`);

const state = {
  sceneIndex: 0,
  wordIndex: 0,
  playing: false,
  timer: null,
  images: { left: "", right: "" },
  poses: [],
  activeScopeIndex: -1,
  globalTerms: { left: "Khách quan", right: "Chủ quan" },
  sceneOverrides: []
};
const els = Object.fromEntries([...document.querySelectorAll("[id]")].map((el) => [el.id, el]));

const vieneuVoices = [
  { value: "Minh Đức", text: "Minh Đức — Nam · Bắc · Tin tức" },
  { value: "Phạm Tuyên", text: "Phạm Tuyên — Nam · Bắc · Tự nhiên" },
  { value: "Thái Sơn", text: "Thái Sơn — Nam · Nam · Kể chuyện" },
  { value: "Xuân Vĩnh", text: "Xuân Vĩnh — Nam · Nam · Tự nhiên" },
  { value: "Thanh Bình", text: "Thanh Bình — Nam · Bắc · Kể chuyện" },
  { value: "Trúc Ly", text: "Trúc Ly — Nữ · Bắc · Tự nhiên" },
  { value: "Ngọc Linh", text: "Ngọc Linh — Nữ · Bắc · Kể chuyện" },
  { value: "Đoan Trang", text: "Đoan Trang — Nữ · Bắc · Tự nhiên" },
  { value: "Mai Anh", text: "Mai Anh — Nữ · Bắc · Tin tức" },
  { value: "Thục Đoan", text: "Thục Đoan — Nữ · Nam · Kể chuyện" },
  { value: "Minh Triết", text: "Minh Triết — Nam · Nam · Tin tức" },
  { value: "Thùy Dung", text: "Thùy Dung — Nữ · Nam · Tin tức" },
  { value: "Quang Sơn", text: "Quang Sơn — Nam · Trung · Tự nhiên" },
  { value: "Ngọc Trân", text: "Ngọc Trân — Nữ · Trung · Tự nhiên" }
];

function updateVoiceDropdown() {
  if (!els.ttsEngineSelect || !els.voiceSelect) return;
  const currentVal = els.voiceSelect.value;
  els.voiceSelect.innerHTML = "";
  vieneuVoices.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v.value;
    opt.textContent = v.text;
    els.voiceSelect.appendChild(opt);
  });
  if (vieneuVoices.some((v) => v.value === currentVal)) {
    els.voiceSelect.value = currentVal;
  } else {
    els.voiceSelect.value = vieneuVoices[0].value;
  }
}

if (els.ttsEngineSelect) {
  els.ttsEngineSelect.addEventListener("change", () => {
    updateVoiceDropdown();
    render();
  });
}


if (els.bracketLangSelect) {
  let savedLang = localStorage.getItem("riki:settings:bracket-lang") || "none";
  if (savedLang === "auto") savedLang = "none";
  els.bracketLangSelect.value = savedLang;
  els.bracketLangSelect.addEventListener("change", () => {
    localStorage.setItem("riki:settings:bracket-lang", els.bracketLangSelect.value);
    updateVoiceSelectVisibility();
  });
}
if (els.jaVoiceSelect) {
  els.jaVoiceSelect.value = localStorage.getItem("riki:settings:ja-voice") || "ja-JP-NanamiNeural";
  els.jaVoiceSelect.addEventListener("change", () => {
    localStorage.setItem("riki:settings:ja-voice", els.jaVoiceSelect.value);
  });
}
if (els.enVoiceSelect) {
  els.enVoiceSelect.value = localStorage.getItem("riki:settings:en-voice") || "en-US-AriaNeural";
  els.enVoiceSelect.addEventListener("change", () => {
    localStorage.setItem("riki:settings:en-voice", els.enVoiceSelect.value);
  });
}
if (els.zhVoiceSelect) {
  els.zhVoiceSelect.value = localStorage.getItem("riki:settings:zh-voice") || "zh-CN-XiaoxiaoNeural";
  els.zhVoiceSelect.addEventListener("change", () => {
    localStorage.setItem("riki:settings:zh-voice", els.zhVoiceSelect.value);
  });
}
if (els.speechRateSelect) {
  els.speechRateSelect.value = localStorage.getItem("riki:settings:speech-rate") || "1.0";
  els.speechRateSelect.addEventListener("change", () => {
    localStorage.setItem("riki:settings:speech-rate", els.speechRateSelect.value);
  });
}

function updateVoiceSelectVisibility() {
  if (!els.bracketLangSelect || !els.voiceRow) return;
  const lang = els.bracketLangSelect.value;
  if (lang === "none") {
    els.voiceRow.style.display = "none";
  } else {
    els.voiceRow.style.display = "";
    if (els.jaVoiceSelect) els.jaVoiceSelect.style.display = lang === "ja" ? "" : "none";
    if (els.enVoiceSelect) els.enVoiceSelect.style.display = lang === "en" ? "" : "none";
    if (els.zhVoiceSelect) els.zhVoiceSelect.style.display = lang === "zh" ? "" : "none";
  }
}
updateVoiceSelectVisibility();

const actorState = {
  "point-left": localStorage.getItem("riki:actor:point-left") || "../assets/riki-left.png",
  "point-right": localStorage.getItem("riki:actor:point-right") || "../assets/riki-right.png",
  "think": localStorage.getItem("riki:actor:think") || "../assets/riki-ques.png",
  "explain-1": localStorage.getItem("riki:actor:explain-1") || "../assets/riki-giai-thich.png",
  "explain-2": localStorage.getItem("riki:actor:explain-2") || "../assets/riki-nhan-manh.png",
  "explain-3": localStorage.getItem("riki:actor:explain-3") || "../assets/riki-phan-tich.png",
};

const defaultOutputDir = "d:\\riki-scene\\output";

const settingsState = {
  outputPath: "d:\\riki-scene\\output\\riki-scene-output.mp4",
  videoName: "riki-scene-output",
  isCustomPath: false,
};

function parsePhoneticText(rawText) {
  if (!rawText) return { displayText: "", speechText: "" };
  let displayText = rawText.replace(/(\S+)\[([^\]]+)\]/g, "$1");
  let speechText = rawText.replace(/(\S+)\[([^\]]+)\]/g, "$2");
  
  const parseStandaloneBrackets = (t) => {
    return t.replace(/\[([^\]]+)\]/g, (match, content) => {
      let trimmed = content.trim();
      if (trimmed.toLowerCase().startsWith("ja:")) return trimmed.slice(3).trim();
      if (trimmed.toLowerCase().startsWith("en:")) return trimmed.slice(3).trim();
      if (trimmed.toLowerCase().startsWith("vi:")) return trimmed.slice(3).trim();
      return trimmed;
    });
  };
  
  displayText = parseStandaloneBrackets(displayText).trim();
  speechText = parseStandaloneBrackets(speechText).trim();
  return { displayText, speechText };
}

function svgData(value) { return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(value)}`; }
function scenes() { return els.scriptInput.value.split(/\r?\n/).map((text) => text.trim()).filter(Boolean); }
function estimate(text) {
  const { speechText } = parsePhoneticText(text);
  return Math.max(2, Math.min(7, Math.round(speechText.split(/\s+/).length / 3.4)));
}
function defaultPose(i, text) { return text.includes("?") || text.toLowerCase().includes("khác") ? "think" : i % 2 === 0 ? "point-left" : "point-right"; }
function poseLabel(pose) { return { "point-left": "chỉ trái", "point-right": "chỉ phải", think: "đặt câu hỏi", "explain-1": "giải thích", "explain-2": "nhấn mạnh", "explain-3": "phân tích", none: "không nhân vật" }[pose] || "chỉ trái"; }

function getEffectiveSceneData(i) {
  const custom = state.sceneOverrides[i];
  const gLeftTerm = state.globalTerms.left;
  const gRightTerm = state.globalTerms.right;
  if (custom && custom.isCustom) {
    return {
      leftTerm: custom.leftTerm !== undefined && custom.leftTerm !== "" ? custom.leftTerm : gLeftTerm,
      rightTerm: custom.rightTerm !== undefined && custom.rightTerm !== "" ? custom.rightTerm : gRightTerm,
      leftImage: custom.leftImage || state.images.left || "",
      rightImage: custom.rightImage || state.images.right || "",
      isCustom: true
    };
  }
  return {
    leftTerm: gLeftTerm,
    rightTerm: gRightTerm,
    leftImage: state.images.left || "",
    rightImage: state.images.right || "",
    isCustom: false
  };
}

function renderScopeNav(list) {
  if (!els.scopeNav) return;
  els.scopeNav.innerHTML = "";
  const globalBtn = document.createElement("button");
  globalBtn.type = "button";
  globalBtn.className = `scope-btn ${state.activeScopeIndex === -1 ? "active" : ""}`;
  globalBtn.textContent = "🌐 Tất cả cảnh (Mặc định)";
  globalBtn.addEventListener("click", () => {
    state.activeScopeIndex = -1;
    render();
  });
  els.scopeNav.append(globalBtn);

  list.forEach((_, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    const isCustom = state.sceneOverrides[i] && state.sceneOverrides[i].isCustom;
    btn.className = `scope-btn ${state.activeScopeIndex === i ? "active" : ""} ${isCustom ? "scope-btn--custom" : ""}`;
    btn.textContent = `Cảnh ${i + 1}`;
    btn.addEventListener("click", () => {
      state.activeScopeIndex = i;
      state.sceneIndex = i;
      state.wordIndex = 0;
      render();
    });
    els.scopeNav.append(btn);
  });
}

function renderSceneOverrideBar() {
  if (!els.sceneOverrideBar) return;
  if (state.activeScopeIndex === -1) {
    els.sceneOverrideBar.hidden = true;
    return;
  }
  els.sceneOverrideBar.hidden = false;
  const idx = state.activeScopeIndex;
  const custom = state.sceneOverrides[idx];
  if (custom && custom.isCustom) {
    els.sceneOverrideStatus.textContent = `Đang dùng ảnh & từ riêng cho Cảnh ${idx + 1}`;
    els.enableOverrideBtn.hidden = true;
    els.resetOverrideBtn.hidden = false;
  } else {
    els.sceneOverrideStatus.textContent = `Đang dùng ảnh & từ mặc định cho Cảnh ${idx + 1}`;
    els.enableOverrideBtn.hidden = false;
    els.resetOverrideBtn.hidden = true;
  }
}

function render() {
  const list = scenes();
  const phoneEl = document.querySelector(".phone");
  if (phoneEl) phoneEl.style.setProperty("--video-bg", els.videoBg.value);
  state.poses = list.map((text, i) => state.poses[i] || defaultPose(i, text));
  state.sceneOverrides = list.map((_, i) => state.sceneOverrides[i] || { isCustom: false, leftTerm: "", rightTerm: "", leftImage: "", rightImage: "" });
  if (state.sceneIndex >= list.length) state.sceneIndex = Math.max(0, list.length - 1);
  if (state.activeScopeIndex >= list.length) state.activeScopeIndex = -1;

  const text = list[state.sceneIndex] || "";
  const pose = state.poses[state.sceneIndex] || "point-left";

  const previewData = getEffectiveSceneData(state.sceneIndex);
  els.leftTitle.textContent = previewData.leftTerm;
  els.rightTitle.textContent = previewData.rightTerm;
  els.leftTitle.style.color = els.leftColor.value;
  els.rightTitle.style.color = els.rightColor.value;
  els.leftImage.src = previewData.leftImage || "";
  els.rightImage.src = previewData.rightImage || "";

  // Dynamic layout centering classes for card preview
  const hasImages = Boolean(previewData.leftImage || previewData.rightImage);
  const hasActor = Boolean(pose !== "none");
  const card = document.querySelector(".card");
  const userFontSize = els.fontSizeInput ? (parseInt(els.fontSizeInput.value, 10) || 40) : 40;
  const previewFontSize = Math.round(userFontSize * 0.38);
  const selectedFont = els.fontSelect ? els.fontSelect.value : "Segoe UI, Arial, sans-serif";
  if (card) {
    card.classList.toggle("card--no-images", !hasImages);
    card.classList.toggle("card--no-actor", !hasActor);
    card.classList.toggle("card--text-only", !hasImages && !hasActor);
    card.style.setProperty("--preview-font-size", `${previewFontSize}px`);
    card.style.setProperty("--preview-font-family", selectedFont);
  }

  // Update editor inputs & image previews
  const editorData = state.activeScopeIndex === -1 ? { leftImage: state.images.left, rightImage: state.images.right, leftTerm: state.globalTerms.left, rightTerm: state.globalTerms.right } : getEffectiveSceneData(state.activeScopeIndex);
  els.leftTerm.value = editorData.leftTerm;
  els.rightTerm.value = editorData.rightTerm;

  if (editorData.leftImage) {
    els.leftEditorImage.src = editorData.leftImage;
    els.leftEditorImage.classList.add("has-image");
    if (els.leftRemoveBtn) els.leftRemoveBtn.hidden = false;
  } else {
    els.leftEditorImage.src = "";
    els.leftEditorImage.classList.remove("has-image");
    if (els.leftRemoveBtn) els.leftRemoveBtn.hidden = true;
  }

  if (editorData.rightImage) {
    els.rightEditorImage.src = editorData.rightImage;
    els.rightEditorImage.classList.add("has-image");
    if (els.rightRemoveBtn) els.rightRemoveBtn.hidden = false;
  } else {
    els.rightEditorImage.src = "";
    els.rightEditorImage.classList.remove("has-image");
    if (els.rightRemoveBtn) els.rightRemoveBtn.hidden = true;
  }

  els.actor.className = `actor ${pose}`;
  els.poseName.textContent = poseLabel(pose);
  const actorScalePct = els.actorScaleInput ? (parseInt(els.actorScaleInput.value, 10) || 100) : 100;
  const scaleFactor = (actorScalePct / 100).toFixed(2);
  els.actor.style.setProperty("--actor-scale", scaleFactor);

  const customImg = actorState[pose];
  if (customImg && pose !== "none") {
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
  renderScopeNav(list);
  renderSceneOverrideBar();
}

function renderHighlight(text) {
  const { displayText } = parsePhoneticText(text);
  const words = displayText.split(/\s+/).filter(Boolean);
  const lineMode = els.highlightMode.value === "line";
  els.highlightText.innerHTML = words.map((word, i) => `<span class="word ${(lineMode || i === state.wordIndex) ? "active-word" : ""}">${escapeHtml(word)}</span>`).join(" ");
}

function renderScenes(list) {
  els.sceneList.innerHTML = "";
  list.forEach((text, i) => {
    const row = document.createElement("article");
    row.className = `scene-row ${i === state.sceneIndex ? "active" : ""}`;
    const isCustom = state.sceneOverrides[i] && state.sceneOverrides[i].isCustom;
    const badgeHtml = isCustom ? `<span class="scene-row__badge">📷 Ảnh riêng</span>` : "";
    const { displayText } = parsePhoneticText(text);
    row.innerHTML = `<button type="button">${i + 1}</button><p>${escapeHtml(displayText)}${badgeHtml}</p><select><option value="point-left">Chỉ trái</option><option value="point-right">Chỉ phải</option><option value="think">Đặt câu hỏi</option><option value="explain-1">Giải thích</option><option value="explain-2">Nhấn mạnh</option><option value="explain-3">Phân tích</option><option value="none">🚫 Không dùng nhân vật</option></select>`;
    row.addEventListener("click", (e) => {
      if (e.target.tagName.toLowerCase() === "select") return;
      state.sceneIndex = i;
      state.activeScopeIndex = i;
      state.wordIndex = 0;
      render();
    });
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
    clip.addEventListener("click", () => {
      state.sceneIndex = i;
      state.activeScopeIndex = i;
      state.wordIndex = 0;
      render();
    });
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
  reader.onload = () => {
    if (state.activeScopeIndex === -1) {
      state.images[side] = reader.result;
    } else {
      const idx = state.activeScopeIndex;
      const scopeData = getEffectiveSceneData(idx);
      state.sceneOverrides[idx] = {
        isCustom: true,
        leftTerm: scopeData.leftTerm,
        rightTerm: scopeData.rightTerm,
        leftImage: side === "left" ? reader.result : scopeData.leftImage,
        rightImage: side === "right" ? reader.result : scopeData.rightImage,
      };
    }
    render();
  };
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

els.leftTerm.addEventListener("input", () => {
  if (state.activeScopeIndex === -1) {
    state.globalTerms.left = els.leftTerm.value;
  } else {
    const idx = state.activeScopeIndex;
    const scopeData = getEffectiveSceneData(idx);
    state.sceneOverrides[idx] = {
      ...scopeData,
      isCustom: true,
      leftTerm: els.leftTerm.value
    };
  }
  render();
});

els.rightTerm.addEventListener("input", () => {
  if (state.activeScopeIndex === -1) {
    state.globalTerms.right = els.rightTerm.value;
  } else {
    const idx = state.activeScopeIndex;
    const scopeData = getEffectiveSceneData(idx);
    state.sceneOverrides[idx] = {
      ...scopeData,
      isCustom: true,
      rightTerm: els.rightTerm.value
    };
  }
  render();
});

function removeImage(side) {
  if (state.activeScopeIndex === -1) {
    state.images[side] = "";
  } else {
    const idx = state.activeScopeIndex;
    const scopeData = getEffectiveSceneData(idx);
    state.sceneOverrides[idx] = {
      isCustom: true,
      leftTerm: scopeData.leftTerm,
      rightTerm: scopeData.rightTerm,
      leftImage: side === "left" ? "" : scopeData.leftImage,
      rightImage: side === "right" ? "" : scopeData.rightImage,
    };
  }
  render();
}

[els.leftColor, els.rightColor, els.videoBg, els.fontSizeInput, els.actorScaleInput, els.fontSelect, els.scriptInput, els.voiceSelect, els.styleSelect, els.highlightMode, els.bracketLangSelect, els.jaVoiceSelect, els.enVoiceSelect, els.zhVoiceSelect, els.speechRateSelect, els.ttsEngineSelect].forEach((item) => { if (item) item.addEventListener("input", render); });
if (els.fontSizeDecBtn) {
  els.fontSizeDecBtn.addEventListener("click", () => {
    const cur = parseInt(els.fontSizeInput.value, 10) || 40;
    els.fontSizeInput.value = Math.max(20, cur - 2);
    render();
  });
}
if (els.fontSizeIncBtn) {
  els.fontSizeIncBtn.addEventListener("click", () => {
    const cur = parseInt(els.fontSizeInput.value, 10) || 40;
    els.fontSizeInput.value = Math.min(80, cur + 2);
    render();
  });
}
if (els.actorScaleDecBtn) {
  els.actorScaleDecBtn.addEventListener("click", () => {
    const cur = parseInt(els.actorScaleInput.value, 10) || 100;
    els.actorScaleInput.value = Math.max(30, cur - 5);
    render();
  });
}
if (els.actorScaleIncBtn) {
  els.actorScaleIncBtn.addEventListener("click", () => {
    const cur = parseInt(els.actorScaleInput.value, 10) || 100;
    els.actorScaleInput.value = Math.min(250, cur + 5);
    render();
  });
}
els.leftUpload.addEventListener("change", (event) => readImage(event.target.files[0], "left"));
els.rightUpload.addEventListener("change", (event) => readImage(event.target.files[0], "right"));
if (els.leftRemoveBtn) els.leftRemoveBtn.addEventListener("click", () => removeImage("left"));
if (els.rightRemoveBtn) els.rightRemoveBtn.addEventListener("click", () => removeImage("right"));
els.prevScene.addEventListener("click", () => { const n = scenes().length || 1; state.sceneIndex = (state.sceneIndex - 1 + n) % n; state.wordIndex = 0; render(); });
els.nextScene.addEventListener("click", () => { const n = scenes().length || 1; state.sceneIndex = (state.sceneIndex + 1) % n; state.wordIndex = 0; render(); });
els.playButton.addEventListener("click", togglePlay);

if (els.enableOverrideBtn) {
  els.enableOverrideBtn.addEventListener("click", () => {
    const idx = state.activeScopeIndex;
    if (idx >= 0) {
      const eff = getEffectiveSceneData(idx);
      state.sceneOverrides[idx] = {
        isCustom: true,
        leftTerm: eff.leftTerm,
        rightTerm: eff.rightTerm,
        leftImage: eff.leftImage,
        rightImage: eff.rightImage,
      };
      render();
    }
  });
}

if (els.resetOverrideBtn) {
  els.resetOverrideBtn.addEventListener("click", () => {
    const idx = state.activeScopeIndex;
    if (idx >= 0 && state.sceneOverrides[idx]) {
      state.sceneOverrides[idx].isCustom = false;
      render();
    }
  });
}

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

let currentPreviewAudio = null;

if (els.previewVoiceBtn) {
  els.previewVoiceBtn.addEventListener("click", async () => {
    const voice = els.voiceSelect.value;
    const style = els.styleSelect.value;

    if (currentPreviewAudio) {
      currentPreviewAudio.pause();
      currentPreviewAudio = null;
    }

    const btnSpan = els.previewVoiceBtn.querySelector("span");
    const originalText = btnSpan ? btnSpan.textContent : "Nghe thử giọng này";

    if (typeof window.electronAPI !== "undefined" && window.electronAPI.previewVoice) {
      els.previewVoiceBtn.disabled = true;
      if (btnSpan) btnSpan.textContent = "Đang tạo giọng mẫu…";

      try {
        const result = await window.electronAPI.previewVoice({
          engine: els.ttsEngineSelect ? els.ttsEngineSelect.value : "vieneu",
          voice,
          style,
          bracketLang: els.bracketLangSelect ? els.bracketLangSelect.value : "none",
          jaVoice: els.jaVoiceSelect ? els.jaVoiceSelect.value : "ja-JP-NanamiNeural",
          enVoice: els.enVoiceSelect ? els.enVoiceSelect.value : "en-US-AriaNeural",
          zhVoice: els.zhVoiceSelect ? els.zhVoiceSelect.value : "zh-CN-XiaoxiaoNeural",
          speechRate: els.speechRateSelect ? parseFloat(els.speechRateSelect.value) || 1.0 : 1.0,
        });
        if (result && result.success && result.audio) {
          currentPreviewAudio = new Audio(result.audio);
          currentPreviewAudio.play();
          showToast(`Đang phát giọng đọc thử: ${voice} (${style}) ✓`);
        } else {
          showToast(`Lỗi nghe thử giọng: ${result?.error || "Không thể tạo audio"}`);
        }
      } catch (err) {
        showToast(`Lỗi nghe thử giọng: ${err.message}`);
      } finally {
        els.previewVoiceBtn.disabled = false;
        if (btnSpan) btnSpan.textContent = originalText;
      }
    } else {
      showToast(`Giọng đọc chọn: ${voice} (${style}). Chạy trong Electron để phát thử mẫu giọng!`);
    }
  });
}

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
    engine: els.ttsEngineSelect ? els.ttsEngineSelect.value : "vieneu",
    leftTerm: state.globalTerms.left,
    rightTerm: state.globalTerms.right,
    leftColor: els.leftColor.value,
    rightColor: els.rightColor.value,
    leftImage: state.images.left || "",
    rightImage: state.images.right || "",
    voice: els.voiceSelect.value,
    style: els.styleSelect.value,
    highlight: els.highlightMode.value,
    fontSize: els.fontSizeInput ? (parseInt(els.fontSizeInput.value, 10) || 40) : 40,
    actorScale: els.actorScaleInput ? (parseInt(els.actorScaleInput.value, 10) || 100) : 100,
    fontFamily: els.fontSelect ? els.fontSelect.value : "Segoe UI, Arial, sans-serif",
    videoBg: els.videoBg.value,
    outputPath: settingsState.outputPath,
    bracketLang: els.bracketLangSelect ? els.bracketLangSelect.value : "none",
    jaVoice: els.jaVoiceSelect ? els.jaVoiceSelect.value : "ja-JP-NanamiNeural",
    enVoice: els.enVoiceSelect ? els.enVoiceSelect.value : "en-US-AriaNeural",
    zhVoice: els.zhVoiceSelect ? els.zhVoiceSelect.value : "zh-CN-XiaoxiaoNeural",
    speechRate: els.speechRateSelect ? parseFloat(els.speechRateSelect.value) || 1.0 : 1.0,
    videoName: settingsState.videoName || "riki-scene-output",
    actorImages: {
      "point-left": actorState["point-left"],
      "point-right": actorState["point-right"],
      "think": actorState["think"],
      "explain-1": actorState["explain-1"],
      "explain-2": actorState["explain-2"],
      "explain-3": actorState["explain-3"],
    },
    scenes: list.map((text, i) => {
      const eff = getEffectiveSceneData(i);
      const { displayText, speechText } = parsePhoneticText(text);
      return {
        id: `scene-${i + 1}`,
        text,
        displayText,
        speechText,
        pose: state.poses[i] || "point-left",
        leftTerm: eff.leftTerm,
        rightTerm: eff.rightTerm,
        leftImage: eff.leftImage,
        rightImage: eff.rightImage,
      };
    }),
  };
}

function setProgress(pct) {
  if (els.progressBar) els.progressBar.style.width = `${pct}%`;
  if (els.progressLabel) els.progressLabel.textContent = `${pct}%`;
  const ring = document.getElementById("progressRingFill");
  if (ring) {
    const circumference = 213.6;
    ring.style.strokeDashoffset = circumference - (pct / 100) * circumference;
  }
}

function setStep(stepId, state) {
  const el = document.getElementById(`step-${stepId}`);
  if (!el) return;
  el.classList.remove("render-step--active", "render-step--done", "render-step--error");
  const badge = el.querySelector(".render-step__badge");
  const labels = { pending: "chờ", active: "đang xử lý…", done: "✓ xong", error: "lỗi" };
  if (state === "active") { el.classList.add("render-step--active"); }
  if (state === "done") { el.classList.add("render-step--done"); }
  if (state === "error") { el.classList.add("render-step--error"); }
  if (badge) badge.textContent = labels[state] || state;
}

function resetSteps() {
  ["tts", "frames", "video", "done"].forEach((s) => setStep(s, "pending"));
}

function updateStepByProgress(pct) {
  if (pct >= 5 && pct < 40) { setStep("tts", "active"); }
  if (pct >= 40 && pct < 50) { setStep("tts", "done"); setStep("frames", "active"); }
  if (pct >= 50 && pct < 82) { setStep("tts", "done"); setStep("frames", "active"); }
  if (pct >= 82 && pct < 100) { setStep("tts", "done"); setStep("frames", "done"); setStep("video", "active"); }
  if (pct >= 100) { setStep("tts", "done"); setStep("frames", "done"); setStep("video", "done"); setStep("done", "done"); }
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
      els.renderStatus.textContent = `✓ Xuất video hoàn tất!`;
      els.renderOpenBtn.hidden = false;
      els.renderCancelBtn.hidden = true;
    }
    if (data.type === "error") {
      ["tts", "frames", "video"].forEach((s) => {
        const el = document.getElementById(`step-${s}`);
        if (el && el.classList.contains("render-step--active")) setStep(s, "error");
      });
      els.renderStatus.textContent = "✗ Render thất bại. Xem log chi tiết bên dưới.";
    }
  });

  window.electronAPI.onDone((data) => {
    if (data.success) {
      setProgress(100);
      updateStepByProgress(100);
      els.renderStatus.textContent = `✓ Xuất thành công → ${data.outputFile}`;
      els.renderOpenBtn.hidden = false;
      els.renderCancelBtn.hidden = true;
      els.renderOpenBtn.dataset.filePath = data.outputFile;
    } else {
      els.renderStatus.textContent = "✗ Render thất bại. Xem log chi tiết bên dưới.";
      els.renderCancelBtn.hidden = false;
    }
  });

  window.electronAPI.onProgress((pct) => {
    setProgress(pct);
    updateStepByProgress(pct);
    const stages = { 5: "Đang chuẩn bị…", 10: "Đang tạo giọng đọc (TTS)…", 40: "Hoàn tất TTS, đang dựng khung hình…", 50: "Đang render từng khung hình…", 65: "Đang chuyển đổi SVG → PNG…", 82: "Đang ghép video bằng FFmpeg…", 97: "Đang hoàn thiện…", 100: "Hoàn tất!" };
    if (stages[pct]) els.renderStatus.textContent = stages[pct];
  });
}

if (els.logToggleBtn) {
  els.logToggleBtn.addEventListener("click", () => {
    const wrap = els.renderLogWrap;
    const expanded = els.logToggleBtn.getAttribute("aria-expanded") === "true";
    els.logToggleBtn.setAttribute("aria-expanded", String(!expanded));
    if (wrap) wrap.hidden = expanded;
  });
}

els.renderButton.addEventListener("click", () => {
  if (typeof window.electronAPI !== "undefined") {
    const list = scenes();
    if (!list.length) { showToast("Kịch bản đang trống. Hãy nhập ít nhất 1 dòng."); return; }
    const vName = settingsState.videoName || "riki-scene-output";
    els.videoNameInput.value = vName;
    if (!settingsState.outputPath) {
      settingsState.outputPath = `${defaultOutputDir}\\${vName}.mp4`;
    }
    els.outputPathInput.value = settingsState.outputPath;
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
    defaultPath: `${defaultOutputDir}\\${videoName}.mp4`,
    filters: [{ name: "MP4 Video", extensions: ["mp4"] }],
  });
  if (result && !result.canceled && result.filePath) {
    els.outputPathInput.value = result.filePath;
    settingsState.outputPath = result.filePath;
    settingsState.isCustomPath = true;
    const parts = result.filePath.replace(/\\/g, "/").split("/");
    const fileName = parts[parts.length - 1].replace(/\.mp4$/i, "");
    els.videoNameInput.value = fileName;
    settingsState.videoName = fileName;
  }
});

els.videoNameInput.addEventListener("input", () => {
  const vName = els.videoNameInput.value.trim() || "riki-scene-output";
  settingsState.videoName = vName;
  if (!settingsState.isCustomPath) {
    settingsState.outputPath = `${defaultOutputDir}\\${vName}.mp4`;
    els.outputPathInput.value = settingsState.outputPath;
  }
});

els.settingsConfirmBtn.addEventListener("click", () => {
  settingsState.videoName = els.videoNameInput.value.trim() || "riki-scene-output";
  els.renderSettings.hidden = true;
  els.renderPanel.hidden = false;
  els.renderLog.innerHTML = "";
  resetSteps();
  setProgress(0);
  els.renderStatus.textContent = "Đang khởi động renderer…";
  els.renderOpenBtn.hidden = true;
  els.renderCancelBtn.hidden = false;
  if (els.renderLogWrap) els.renderLogWrap.hidden = true;
  if (els.logToggleBtn) els.logToggleBtn.setAttribute("aria-expanded", "false");
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

if (els.infoBtn) {
  els.infoBtn.addEventListener("click", () => {
    els.infoModal.hidden = false;
  });
}
if (els.infoModalClose) els.infoModalClose.addEventListener("click", () => { els.infoModal.hidden = true; });
if (els.infoModalOkBtn) els.infoModalOkBtn.addEventListener("click", () => { els.infoModal.hidden = true; });
if (els.infoModalBackdrop) els.infoModalBackdrop.addEventListener("click", () => { els.infoModal.hidden = true; });

updateVoiceDropdown();
initActorPreviews();
render();
