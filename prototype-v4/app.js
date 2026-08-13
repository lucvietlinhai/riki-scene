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
  sceneOverrides: [],
  videoBgImage: "",
  globalConfigs: {}
};
const els = Object.fromEntries([...document.querySelectorAll("[id]")].map((el) => [el.id, el]));

const CONFIG_KEYS = {
  leftColor: "leftColor",
  rightColor: "rightColor",
  videoBg: "videoBg",
  textColor: "textColor",
  highlightColor: "highlightColor",
  termFontSizeInput: "termFontSize",
  termFontWeightSelect: "termFontWeight",
  subFontWeightSelect: "subFontWeight",
  fontSizeInput: "fontSize",
  actorScaleInput: "actorScale",
  fontSelect: "fontFamily",
  showSubtitlesToggle: "showSubtitles",
  showTermsToggle: "showTerms",
  showIllustrationsToggle: "showIllustrations",
  showActorToggle: "showActor"
};

function initGlobalConfigs() {
  state.globalConfigs = {
    leftColor: els.leftColor ? els.leftColor.value : "#b92c1e",
    rightColor: els.rightColor ? els.rightColor.value : "#5d9a4d",
    textColor: els.textColor ? els.textColor.value : "#202525",
    highlightColor: els.highlightColor ? els.highlightColor.value : "#3ac6c6",
    fontSize: els.fontSizeInput ? (parseInt(els.fontSizeInput.value, 10) || 40) : 40,
    termFontSize: els.termFontSizeInput ? (parseInt(els.termFontSizeInput.value, 10) || 56) : 56,
    termFontWeight: els.termFontWeightSelect ? els.termFontWeightSelect.value : "900",
    subFontWeight: els.subFontWeightSelect ? els.subFontWeightSelect.value : "700",
    actorScale: els.actorScaleInput ? (parseInt(els.actorScaleInput.value, 10) || 100) : 100,
    fontFamily: els.fontSelect ? els.fontSelect.value : "Segoe UI, Arial, sans-serif",
    videoBg: els.videoBg ? els.videoBg.value : "#ffffff",
    videoBgImage: state.videoBgImage || "",
    showSubtitles: els.showSubtitlesToggle ? els.showSubtitlesToggle.checked : true,
    showTerms: els.showTermsToggle ? els.showTermsToggle.checked : true,
    showIllustrations: els.showIllustrationsToggle ? els.showIllustrationsToggle.checked : true,
    showActor: els.showActorToggle ? els.showActorToggle.checked : true
  };
}
initGlobalConfigs();

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
  if (!els.ttsEngineSelect) return;
  const engine = els.ttsEngineSelect.value;
  const isKokoro = engine === "kokoro";

  if (els.kokoroVoiceLabel) els.kokoroVoiceLabel.hidden = !isKokoro;
  if (els.vieneuVoiceLabel) els.vieneuVoiceLabel.hidden = isKokoro;
  if (els.vieneuStyleLabel) {
    els.vieneuStyleLabel.hidden = isKokoro;
  } else if (els.styleSelect) {
    const styleLabel = els.styleSelect.closest(".field-label");
    if (styleLabel) styleLabel.hidden = isKokoro;
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
if (els.foreignSpeechRateSelect) {
  els.foreignSpeechRateSelect.value = localStorage.getItem("riki:settings:foreign-speech-rate") || "1.0";
  els.foreignSpeechRateSelect.addEventListener("change", () => {
    localStorage.setItem("riki:settings:foreign-speech-rate", els.foreignSpeechRateSelect.value);
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
  const gLeftImage = state.images.left || "";
  const gRightImage = state.images.right || "";
  
  const result = {
    leftTerm: gLeftTerm,
    rightTerm: gRightTerm,
    leftImage: gLeftImage,
    rightImage: gRightImage,
    isCustom: false
  };

  const configKeys = [
    "leftColor", "rightColor", "textColor", "highlightColor",
    "fontSize", "termFontSize", "termFontWeight", "subFontWeight",
    "actorScale", "fontFamily", "videoBg", "videoBgImage",
    "showSubtitles", "showTerms", "showIllustrations", "showActor"
  ];

  configKeys.forEach(key => {
    result[key] = state.globalConfigs[key];
  });

  if (custom && custom.isCustom) {
    result.isCustom = true;
    if (custom.leftTerm !== undefined && custom.leftTerm !== "") result.leftTerm = custom.leftTerm;
    if (custom.rightTerm !== undefined && custom.rightTerm !== "") result.rightTerm = custom.rightTerm;
    if (custom.leftImage !== undefined) result.leftImage = custom.leftImage;
    if (custom.rightImage !== undefined) result.rightImage = custom.rightImage;

    configKeys.forEach(key => {
      if (custom[key] !== undefined) {
        result[key] = custom[key];
      }
    });
  }

  return result;
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

  // Sync inputs with active scope configuration
  const currentConfig = state.activeScopeIndex === -1
    ? {
        leftImage: state.images.left,
        rightImage: state.images.right,
        leftTerm: state.globalTerms.left,
        rightTerm: state.globalTerms.right,
        ...state.globalConfigs
      }
    : getEffectiveSceneData(state.activeScopeIndex);

  if (els.leftTerm) els.leftTerm.value = currentConfig.leftTerm || "";
  if (els.rightTerm) els.rightTerm.value = currentConfig.rightTerm || "";
  if (els.leftColor) els.leftColor.value = currentConfig.leftColor || "#b92c1e";
  if (els.rightColor) els.rightColor.value = currentConfig.rightColor || "#5d9a4d";
  if (els.videoBg) els.videoBg.value = currentConfig.videoBg || "#ffffff";
  if (els.textColor) els.textColor.value = currentConfig.textColor || "#202525";
  if (els.highlightColor) els.highlightColor.value = currentConfig.highlightColor || "#3ac6c6";
  if (els.termFontSizeInput) els.termFontSizeInput.value = currentConfig.termFontSize || 56;
  if (els.termFontWeightSelect) els.termFontWeightSelect.value = currentConfig.termFontWeight || "900";
  if (els.subFontWeightSelect) els.subFontWeightSelect.value = currentConfig.subFontWeight || "700";
  if (els.fontSizeInput) els.fontSizeInput.value = currentConfig.fontSize || 40;
  if (els.actorScaleInput) els.actorScaleInput.value = currentConfig.actorScale || 100;
  if (els.fontSelect) els.fontSelect.value = currentConfig.fontFamily || "Segoe UI, Arial, sans-serif";
  
  if (els.showSubtitlesToggle) els.showSubtitlesToggle.checked = currentConfig.showSubtitles !== false;
  if (els.showTermsToggle) els.showTermsToggle.checked = currentConfig.showTerms !== false;
  if (els.showIllustrationsToggle) els.showIllustrationsToggle.checked = currentConfig.showIllustrations !== false;
  if (els.showActorToggle) els.showActorToggle.checked = currentConfig.showActor !== false;

  if (els.videoBgImageRemoveBtn) {
    els.videoBgImageRemoveBtn.hidden = !currentConfig.videoBgImage;
  }

  const phoneEl = document.querySelector(".phone");
  const previewData = getEffectiveSceneData(state.sceneIndex);

  if (phoneEl) {
    phoneEl.style.setProperty("--video-bg", previewData.videoBg);
    if (previewData.videoBgImage) {
      phoneEl.style.backgroundImage = `url(${previewData.videoBgImage})`;
    } else {
      phoneEl.style.backgroundImage = "";
    }
  }

  state.poses = list.map((text, i) => state.poses[i] || defaultPose(i, text));
  state.sceneOverrides = list.map((_, i) => state.sceneOverrides[i] || { isCustom: false, leftTerm: "", rightTerm: "", leftImage: "", rightImage: "" });
  if (state.sceneIndex >= list.length) state.sceneIndex = Math.max(0, list.length - 1);
  if (state.activeScopeIndex >= list.length) state.activeScopeIndex = -1;

  const text = list[state.sceneIndex] || "";
  const pose = state.poses[state.sceneIndex] || "point-left";

  els.leftTitle.textContent = previewData.leftTerm;
  els.rightTitle.textContent = previewData.rightTerm;
  els.leftTitle.style.color = previewData.leftColor;
  els.rightTitle.style.color = previewData.rightColor;
  els.leftImage.src = previewData.leftImage || "";
  els.rightImage.src = previewData.rightImage || "";

  // Dynamic layout centering classes for card preview
  const hasImages = Boolean(previewData.leftImage || previewData.rightImage);
  const hasActor = Boolean(pose !== "none");
  const card = document.querySelector(".card");
  const userFontSize = previewData.fontSize;
  const previewFontSize = Math.round(userFontSize * 0.38);
  const selectedFont = previewData.fontFamily;
  // Apply term font size, font weight & component visibility toggles
  const termFontSize = previewData.termFontSize;
  const previewTermFontSize = Math.round(termFontSize * 0.35);
  const termFontWeight = previewData.termFontWeight;
  els.leftTitle.style.fontSize = `${previewTermFontSize}px`;
  els.rightTitle.style.fontSize = `${previewTermFontSize}px`;
  els.leftTitle.style.fontWeight = termFontWeight;
  els.rightTitle.style.fontWeight = termFontWeight;

  const heroTitle = els.leftTitle.closest(".hero-title");
  if (heroTitle) heroTitle.style.display = previewData.showTerms ? "" : "none";

  const heroIllus = document.querySelector(".hero-illus");
  if (heroIllus) heroIllus.style.display = previewData.showIllustrations ? "" : "none";

  if (els.actor) els.actor.style.display = previewData.showActor ? "" : "none";

  if (els.highlightText) els.highlightText.style.display = previewData.showSubtitles ? "" : "none";

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
  if (els.actorContextMenu) {
    els.actorContextMenu.hidden = true;
  }
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
  const normalColor = els.textColor ? els.textColor.value : "#202525";
  const hlColor = els.highlightColor ? els.highlightColor.value : "#3ac6c6";
  const subWeight = els.subFontWeightSelect ? els.subFontWeightSelect.value : "700";

  if (els.highlightText) els.highlightText.style.fontWeight = subWeight;
  els.highlightText.innerHTML = words.map((word, i) => {
    const active = lineMode || i === state.wordIndex;
    const color = active ? hlColor : normalColor;
    return `<span class="word ${active ? "active-word" : ""}" style="color: ${color}">${escapeHtml(word)}</span>`;
  }).join(" ");
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

function readVideoBgImage(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    state.videoBgImage = reader.result;
    state.globalConfigs.videoBgImage = reader.result;
    if (els.videoBgImageRemoveBtn) els.videoBgImageRemoveBtn.hidden = false;
    render();
  };
  reader.readAsDataURL(file);
}

if (els.videoBgImageUpload) {
  els.videoBgImageUpload.addEventListener("change", (e) => {
    readVideoBgImage(e.target.files[0]);
    e.target.value = "";
  });
}

if (els.videoBgImageRemoveBtn) {
  els.videoBgImageRemoveBtn.addEventListener("click", () => {
    state.videoBgImage = "";
    state.globalConfigs.videoBgImage = "";
    els.videoBgImageRemoveBtn.hidden = true;
    render();
    showToast("Đã xóa ảnh nền video ✓");
  });
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

// Non-styling config inputs still use simple render listeners
[els.scriptInput, els.voiceSelect, els.styleSelect, els.highlightMode, els.bracketLangSelect, els.jaVoiceSelect, els.enVoiceSelect, els.zhVoiceSelect, els.speechRateSelect, els.foreignSpeechRateSelect, els.ttsEngineSelect].forEach((item) => {
  if (item) {
    item.addEventListener("input", render);
    item.addEventListener("change", render);
  }
});

// Styling config inputs automatically update global or per-scene state
Object.entries(CONFIG_KEYS).forEach(([elId, key]) => {
  const item = els[elId];
  if (item) {
    const handler = () => {
      let val;
      if (item.type === "checkbox") {
        val = item.checked;
      } else if (item.tagName === "INPUT" && (elId.includes("Size") || elId.includes("Scale"))) {
        val = parseInt(item.value, 10) || 0;
      } else {
        val = item.value;
      }
      
      if (state.activeScopeIndex === -1) {
        state.globalConfigs[key] = val;
      } else {
        const idx = state.activeScopeIndex;
        if (!state.sceneOverrides[idx]) {
          state.sceneOverrides[idx] = { isCustom: true };
        }
        state.sceneOverrides[idx].isCustom = true;
        state.sceneOverrides[idx][key] = val;
      }
      render();
    };
    item.addEventListener("input", handler);
    item.addEventListener("change", handler);
  }
});

if (els.termFontSizeDecBtn) {
  els.termFontSizeDecBtn.addEventListener("click", () => {
    const cur = parseInt(els.termFontSizeInput.value, 10) || 56;
    els.termFontSizeInput.value = Math.max(30, cur - 4);
    els.termFontSizeInput.dispatchEvent(new Event("change"));
  });
}
if (els.termFontSizeIncBtn) {
  els.termFontSizeIncBtn.addEventListener("click", () => {
    const cur = parseInt(els.termFontSizeInput.value, 10) || 56;
    els.termFontSizeInput.value = Math.min(120, cur + 4);
    els.termFontSizeInput.dispatchEvent(new Event("change"));
  });
}
if (els.fontSizeDecBtn) {
  els.fontSizeDecBtn.addEventListener("click", () => {
    const cur = parseInt(els.fontSizeInput.value, 10) || 40;
    els.fontSizeInput.value = Math.max(20, cur - 2);
    els.fontSizeInput.dispatchEvent(new Event("change"));
  });
}
if (els.fontSizeIncBtn) {
  els.fontSizeIncBtn.addEventListener("click", () => {
    const cur = parseInt(els.fontSizeInput.value, 10) || 40;
    els.fontSizeInput.value = Math.min(80, cur + 2);
    els.fontSizeInput.dispatchEvent(new Event("change"));
  });
}
if (els.actorScaleDecBtn) {
  els.actorScaleDecBtn.addEventListener("click", () => {
    const cur = parseInt(els.actorScaleInput.value, 10) || 100;
    els.actorScaleInput.value = Math.max(30, cur - 5);
    els.actorScaleInput.dispatchEvent(new Event("change"));
  });
}
if (els.actorScaleIncBtn) {
  els.actorScaleIncBtn.addEventListener("click", () => {
    const cur = parseInt(els.actorScaleInput.value, 10) || 100;
    els.actorScaleInput.value = Math.min(250, cur + 5);
    els.actorScaleInput.dispatchEvent(new Event("change"));
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
        leftColor: eff.leftColor,
        rightColor: eff.rightColor,
        textColor: eff.textColor,
        highlightColor: eff.highlightColor,
        fontSize: eff.fontSize,
        termFontSize: eff.termFontSize,
        termFontWeight: eff.termFontWeight,
        subFontWeight: eff.subFontWeight,
        actorScale: eff.actorScale,
        fontFamily: eff.fontFamily,
        videoBg: eff.videoBg,
        videoBgImage: eff.videoBgImage,
        showSubtitles: eff.showSubtitles,
        showTerms: eff.showTerms,
        showIllustrations: eff.showIllustrations,
        showActor: eff.showActor
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

els.actorResetBtn.addEventListener("click", () => {
  ["point-left", "point-right", "think", "explain-1", "explain-2", "explain-3"].forEach((pose) => {
    setActorImage(pose, "");
    localStorage.removeItem(`riki:actor:${pose}`);
  });
  showToast("Đã xóa tất cả ảnh nhân vật");
});

function buildRenderConfig() {
  const list = scenes();
  const voiceModeRadio = document.querySelector('input[name="voiceSourceMode"]:checked');
  const mode = voiceModeRadio ? voiceModeRadio.value : "local";
  const isDrk = mode === "drk_api";
  const isCloud = mode === "cloud";
  const keys = loadApiKeys();
  const drkModel = els.drkModelSelect ? els.drkModelSelect.value : "voice51";
  const drkVoice = els.drkVoiceSelect ? els.drkVoiceSelect.value : "voice51:0";

  return {
    provider: mode,
    engine: isDrk ? "drk_api" : (isCloud ? "cloud" : (els.ttsEngineSelect ? els.ttsEngineSelect.value : "vieneu")),
    modelId: isDrk ? drkModel : "lingual_speech_v2",
    voiceId: isDrk ? drkVoice : (isCloud ? (els.cloudVoiceSelect ? els.cloudVoiceSelect.value : "21m00Tcm4TlvDq8ikWAM") : (els.voiceSelect ? els.voiceSelect.value : "Minh Đức")),
    drkApiKey: keys.drk || "",
    leftTerm: state.globalTerms.left,
    rightTerm: state.globalTerms.right,
    leftColor: els.leftColor.value,
    rightColor: els.rightColor.value,
    leftImage: state.images.left || "",
    rightImage: state.images.right || "",
    voice: isDrk ? drkVoice : (isCloud 
      ? (els.cloudVoiceSelect ? els.cloudVoiceSelect.value : "21m00Tcm4TlvDq8ikWAM")
      : (els.voiceSelect ? els.voiceSelect.value : "Minh Đức")),
    elevenlabsApiKey: keys.elevenlabs || "",
    kokoroVoice: els.kokoroVoiceSelect ? els.kokoroVoiceSelect.value : "diem_trinh",
    style: els.styleSelect.value,
    highlight: els.highlightMode.value,
    fontSize: els.fontSizeInput ? (parseInt(els.fontSizeInput.value, 10) || 40) : 40,
    termFontSize: els.termFontSizeInput ? (parseInt(els.termFontSizeInput.value, 10) || 56) : 56,
    termFontWeight: els.termFontWeightSelect ? els.termFontWeightSelect.value : "900",
    subFontWeight: els.subFontWeightSelect ? els.subFontWeightSelect.value : "700",
    actorScale: els.actorScaleInput ? (parseInt(els.actorScaleInput.value, 10) || 100) : 100,
    fontFamily: els.fontSelect ? els.fontSelect.value : "Segoe UI, Arial, sans-serif",
    videoBg: els.videoBg.value,
    videoBgImage: state.videoBgImage || "",
    textColor: els.textColor ? els.textColor.value : "#202525",
    highlightColor: els.highlightColor ? els.highlightColor.value : "#3ac6c6",
    showSubtitles: els.showSubtitlesToggle ? els.showSubtitlesToggle.checked : true,
    showTerms: els.showTermsToggle ? els.showTermsToggle.checked : true,
    showIllustrations: els.showIllustrationsToggle ? els.showIllustrationsToggle.checked : true,
    showActor: els.showActorToggle ? els.showActorToggle.checked : true,
    outputPath: settingsState.outputPath,
    bracketLang: els.bracketLangSelect ? els.bracketLangSelect.value : "none",
    jaVoice: els.jaVoiceSelect ? els.jaVoiceSelect.value : "ja-JP-NanamiNeural",
    enVoice: els.enVoiceSelect ? els.enVoiceSelect.value : "en-US-AriaNeural",
    zhVoice: els.zhVoiceSelect ? els.zhVoiceSelect.value : "zh-CN-XiaoxiaoNeural",
    speechRate: els.speechRateSelect ? parseFloat(els.speechRateSelect.value) || 1.0 : 1.0,
    foreignSpeechRate: els.foreignSpeechRateSelect ? parseFloat(els.foreignSpeechRateSelect.value) || 1.0 : 1.0,
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
        leftColor: eff.leftColor,
        rightColor: eff.rightColor,
        textColor: eff.textColor,
        highlightColor: eff.highlightColor,
        fontSize: eff.fontSize,
        termFontSize: eff.termFontSize,
        termFontWeight: eff.termFontWeight,
        subFontWeight: eff.subFontWeight,
        actorScale: eff.actorScale,
        fontFamily: eff.fontFamily,
        videoBg: eff.videoBg,
        videoBgImage: eff.videoBgImage,
        showSubtitles: eff.showSubtitles,
        showTerms: eff.showTerms,
        showIllustrations: eff.showIllustrations,
        showActor: eff.showActor
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
    const logLevel = (data.type === "error" || data.type === "err") ? "error" : (data.type === "warn" ? "warn" : "info");
    addAppLog(logLevel, "Renderer", data.text);
    if (data.type === "done") {
      els.renderStatus.textContent = `✓ Xuất video hoàn tất!`;
      els.renderOpenBtn.hidden = false;
      els.renderCancelBtn.hidden = true;
    }
    if (data.type === "error" || data.type === "err") {
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
      addAppLog("info", "Render", `Xuất video hoàn tất: ${data.outputFile}`);
    } else {
      els.renderStatus.textContent = "✗ Render thất bại. Xem log chi tiết bên dưới.";
      els.renderCancelBtn.hidden = false;
      addAppLog("error", "Render", `Lỗi kết xuất video MP4 (Exit code ${data.code || 1})`);
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

function initInteractivePreview() {
  function makeTitleEditable(el, key) {
    if (!el) return;
    el.addEventListener("dblclick", () => {
      el.contentEditable = "true";
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });

    const commitChange = () => {
      if (el.contentEditable !== "true") return;
      el.contentEditable = "false";
      const newVal = el.textContent.trim();
      const scopeIdx = state.activeScopeIndex;
      if (scopeIdx === -1) {
        state.globalTerms[key] = newVal;
        if (key === "left" && els.leftTerm) els.leftTerm.value = newVal;
        if (key === "right" && els.rightTerm) els.rightTerm.value = newVal;
      } else {
        if (!state.sceneOverrides[scopeIdx]) {
          state.sceneOverrides[scopeIdx] = { isCustom: true, leftTerm: "", rightTerm: "", leftImage: "", rightImage: "" };
        }
        state.sceneOverrides[scopeIdx].isCustom = true;
        state.sceneOverrides[scopeIdx][`${key}Term`] = newVal;
      }
      render();
    };

    el.addEventListener("blur", commitChange);
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        el.blur();
      }
    });
  }

  makeTitleEditable(els.leftTitle, "left");
  makeTitleEditable(els.rightTitle, "right");

  if (els.leftImageWrap) {
    els.leftImageWrap.addEventListener("click", () => {
      if (els.leftUpload) els.leftUpload.click();
    });
  }
  if (els.rightImageWrap) {
    els.rightImageWrap.addEventListener("click", () => {
      if (els.rightUpload) els.rightUpload.click();
    });
  }

  const poseList = ["point-left", "point-right", "think", "explain-1", "explain-2", "explain-3", "none"];
  if (els.actorContextMenu) {
    els.actorContextMenu.hidden = true;
  }

  if (els.actor) {
    els.actor.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (els.actorContextMenu) {
        els.actorContextMenu.hidden = false;
      }
    });
  }

  if (els.actorContextMenu) {
    els.actorContextMenu.querySelectorAll("button[data-pose]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const selectedPose = btn.dataset.pose;
        if (selectedPose) {
          state.poses[state.sceneIndex] = selectedPose;
          render();
        }
        els.actorContextMenu.hidden = true;
      });
    });
  }

  document.addEventListener("click", (e) => {
    if (els.actorContextMenu && !els.actorContextMenu.contains(e.target) && !els.actor.contains(e.target)) {
      els.actorContextMenu.hidden = true;
    }
  });

  document.addEventListener("contextmenu", (e) => {
    if (els.actorContextMenu && !els.actor.contains(e.target) && !els.actorContextMenu.contains(e.target)) {
      els.actorContextMenu.hidden = true;
    }
  });

  if (els.highlightText) {
    els.highlightText.addEventListener("click", () => {
      const contentTab = document.querySelector('.tab[data-panel="contentPanel"]');
      if (contentTab) contentTab.click();
      if (els.scriptInput) {
        els.scriptInput.focus();
        const lines = els.scriptInput.value.split(/\r?\n/);
        let pos = 0;
        for (let i = 0; i < Math.min(state.sceneIndex, lines.length); i += 1) {
          pos += lines[i].length + 1;
        }
        els.scriptInput.setSelectionRange(pos, pos + (lines[state.sceneIndex] ? lines[state.sceneIndex].length : 0));
      }
    });
  }

  if (els.wrapBracketBtn && els.scriptInput) {
    els.wrapBracketBtn.addEventListener("click", () => {
      const textarea = els.scriptInput;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      if (start === end) {
        showToast("Vui lòng bôi đen từ/cụm từ cần chuyển phát âm trước ✓");
        textarea.focus();
        return;
      }
      const text = textarea.value;
      const selected = text.slice(start, end);
      const wrapped = `[${selected}]`;
      textarea.value = text.slice(0, start) + wrapped + text.slice(end);
      textarea.focus();
      textarea.setSelectionRange(start, start + wrapped.length);
      textarea.dispatchEvent(new Event("input"));
      textarea.dispatchEvent(new Event("change"));
    });
  }

  if (els.previewPhone) {
    let lastScrollTime = 0;
    els.previewPhone.addEventListener("wheel", (e) => {
      const now = Date.now();
      if (now - lastScrollTime < 180) return;
      lastScrollTime = now;
      const list = scenes();
      if (!list.length) return;

      if (e.deltaY > 0 && state.sceneIndex < list.length - 1) {
        state.sceneIndex += 1;
        state.activeScopeIndex = state.sceneIndex;
        state.wordIndex = 0;
        render();
      } else if (e.deltaY < 0 && state.sceneIndex > 0) {
        state.sceneIndex -= 1;
        state.activeScopeIndex = state.sceneIndex;
        state.wordIndex = 0;
        render();
      }
    }, { passive: true });
  }
}

const appLogStore = [];
let currentLogFilter = "all";

function addAppLog(level, source, text) {
  const now = new Date();
  const timeStr = now.toTimeString().split(" ")[0];
  const entry = { timestamp: timeStr, level, source: source || "System", text };
  appLogStore.push(entry);

  if (level === "error") {
    if (els.bugLogBtn) els.bugLogBtn.classList.add("btn-bug-log--has-error");
    if (els.bugLogBadge) els.bugLogBadge.hidden = false;
  }

  updateBugLogUI();
}

function updateBugLogUI() {
  if (!els.bugLogList) return;
  const errorCount = appLogStore.filter(e => e.level === "error").length;
  if (els.bugErrorCount) els.bugErrorCount.textContent = `(${errorCount})`;

  const filtered = currentLogFilter === "all" ? appLogStore : appLogStore.filter(e => e.level === currentLogFilter);

  if (!filtered.length) {
    els.bugLogList.innerHTML = `<div class="bug-log-empty">Chưa có nhật ký ${currentLogFilter !== "all" ? currentLogFilter : ""}.</div>`;
    return;
  }

  els.bugLogList.innerHTML = "";
  filtered.forEach(item => {
    const div = document.createElement("div");
    div.className = `bug-log-entry bug-log-entry--${item.level}`;

    const timeSpan = document.createElement("span");
    timeSpan.className = "bug-log-time";
    timeSpan.textContent = item.timestamp;

    const tagSpan = document.createElement("span");
    tagSpan.className = "bug-log-tag";
    tagSpan.textContent = item.source || item.level;

    const msgSpan = document.createElement("span");
    msgSpan.className = "bug-log-msg";
    msgSpan.textContent = item.text;

    div.appendChild(timeSpan);
    div.appendChild(tagSpan);
    div.appendChild(msgSpan);
    els.bugLogList.appendChild(div);
  });

  els.bugLogList.scrollTop = els.bugLogList.scrollHeight;
}

function initAppLogger() {
  addAppLog("info", "App", "Khởi động hệ thống nhật ký Riki Scene logger...");

  window.addEventListener("error", (e) => {
    addAppLog("error", "JS Runtime", `${e.message} (${e.filename || 'app.js'}:${e.lineno || 0})`);
  });

  window.addEventListener("unhandledrejection", (e) => {
    const msg = e.reason ? (e.reason.message || String(e.reason)) : "Unhandled Promise Rejection";
    addAppLog("error", "Promise", msg);
  });

  if (els.bugLogBtn) {
    els.bugLogBtn.addEventListener("click", () => {
      if (els.bugLogModal) els.bugLogModal.hidden = false;
    });
  }

  const closeBugModal = () => {
    if (els.bugLogModal) els.bugLogModal.hidden = true;
  };

  if (els.bugLogModalClose) els.bugLogModalClose.addEventListener("click", closeBugModal);
  if (els.bugLogModalOkBtn) els.bugLogModalOkBtn.addEventListener("click", closeBugModal);
  if (els.bugLogModalBackdrop) els.bugLogModalBackdrop.addEventListener("click", closeBugModal);

  document.querySelectorAll(".bug-log-filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".bug-log-filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentLogFilter = btn.dataset.filter || "all";
      updateBugLogUI();
    });
  });

  if (els.copyBugLogBtn) {
    els.copyBugLogBtn.addEventListener("click", () => {
      if (!appLogStore.length) {
        showToast("Không có log để sao chép.");
        return;
      }
      const text = appLogStore.map(e => `[${e.timestamp}] [${e.level.toUpperCase()}] [${e.source}] ${e.text}`).join("\n");
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => showToast("Đã sao chép toàn bộ log vào Clipboard ✓"));
      } else {
        showToast("Không thể sử dụng clipboard");
      }
    });
  }

  if (els.clearBugLogBtn) {
    els.clearBugLogBtn.addEventListener("click", () => {
      appLogStore.length = 0;
      if (els.bugLogBtn) els.bugLogBtn.classList.remove("btn-bug-log--has-error");
      if (els.bugLogBadge) els.bugLogBadge.hidden = true;
      updateBugLogUI();
      showToast("Đã làm sạch nhật ký ứng dụng ✓");
    });
  }
}

function initGitUpdater() {
  if (!els.updateCodeBtn) return;
  els.updateCodeBtn.addEventListener("click", async () => {
    if (!window.electronAPI || typeof window.electronAPI.updateCode !== "function") {
      alert("Tính năng cập nhật code chỉ hỗ trợ trong môi trường ứng dụng Electron.");
      return;
    }

    if (!confirm("Bạn có chắc chắn muốn ép kéo code mới nhất từ Git về và khởi chạy lại ứng dụng không?\n(Lưu ý: Bất kỳ thay đổi local nào sẽ bị ghi đè hoàn toàn)")) {
      return;
    }

    const icon = els.updateCodeIcon;
    els.updateCodeBtn.disabled = true;
    if (icon) icon.classList.add("spinning");

    addAppLog("info", "GitUpdate", "Đang kết nối Git server và ép ghi đè code mới nhất...");

    try {
      const res = await window.electronAPI.updateCode();
      if (res.success) {
        addAppLog("info", "GitUpdate", res.message);
        alert(res.message);
      } else {
        alert("Lỗi cập nhật: " + res.message);
        addAppLog("error", "GitUpdate", "Cập nhật thất bại: " + res.message);
        els.updateCodeBtn.disabled = false;
        if (icon) icon.classList.remove("spinning");
      }
    } catch (err) {
      alert("Lỗi không xác định: " + err.message);
      addAppLog("error", "GitUpdate", "Lỗi: " + err.message);
      els.updateCodeBtn.disabled = false;
      if (icon) icon.classList.remove("spinning");
    }
  });
}



// ===================================================================
// CLOUD TTS — ELEVENLABS
// ===================================================================
const ELEVENLABS_STATIC_VOICES = [
  { value: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", gender: "Nữ", accent: "Tự nhiên", type: "free", previewUrl: "https://api.elevenlabs.io/v1/voices/21m00Tcm4TlvDq8ikWAM/premade" },
  { value: "29vD33N1CtxCmqRPOPOx", name: "Drew", gender: "Nam", accent: "Tự nhiên", type: "free", previewUrl: "https://api.elevenlabs.io/v1/voices/29vD33N1CtxCmqRPOPOx/premade" },
  { value: "2EiwWnXFnvU5JabPnv8n", name: "Clyde", gender: "Nam", accent: "Trầm", type: "free", previewUrl: "https://api.elevenlabs.io/v1/voices/2EiwWnXFnvU5JabPnv8n/premade" },
  { value: "5Q0t7uMcjGfiDlcTfDwU", name: "Paul", gender: "Nam", accent: "Tin tức", type: "free", previewUrl: "https://api.elevenlabs.io/v1/voices/5Q0t7uMcjGfiDlcTfDwU/premade" },
  { value: "AZnzlk1XvdvUeBnXmlld", name: "Domi", gender: "Nữ", accent: "Tự tin", type: "free", previewUrl: "https://api.elevenlabs.io/v1/voices/AZnzlk1XvdvUeBnXmlld/premade" },
  { value: "CYw3kZ02Hs0563khs1Fj", name: "Dave", gender: "Nam", accent: "Thường ngày", type: "free", previewUrl: "https://api.elevenlabs.io/v1/voices/CYw3kZ02Hs0563khs1Fj/premade" },
  { value: "D38z5RcWu1voky8WS1ja", name: "Fin", gender: "Nam", accent: "Thân thiện", type: "free", previewUrl: "https://api.elevenlabs.io/v1/voices/D38z5RcWu1voky8WS1ja/premade" },
  { value: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", gender: "Nữ", accent: "Nhẹ nhàng", type: "free", previewUrl: "https://api.elevenlabs.io/v1/voices/EXAVITQu4vr4xnSDxMaL/premade" },
  { value: "ErXwobaYiN019PkySvjV", name: "Antoni", gender: "Nam", accent: "Điềm tĩnh", type: "free", previewUrl: "https://api.elevenlabs.io/v1/voices/ErXwobaYiN019PkySvjV/premade" },
  { value: "GBv7mTt0atIp3Br8iCZE", name: "Thomas", gender: "Nam", accent: "Bình thản", type: "free", previewUrl: "https://api.elevenlabs.io/v1/voices/GBv7mTt0atIp3Br8iCZE/premade" },
];

// ===================================================================
// LOCAL TTS (VieNeu & Kokoro) — Voice Grid Cards
// ===================================================================
const VIENEU_VOICES_DATA = [
  { value: "Minh Đức", name: "Minh Đức", gender: "Nam", accent: "Miền Bắc", style: "Tin tức" },
  { value: "Phạm Tuyên", name: "Phạm Tuyên", gender: "Nam", accent: "Miền Bắc", style: "Tự nhiên" },
  { value: "Thái Sơn", name: "Thái Sơn", gender: "Nam", accent: "Miền Nam", style: "Kể chuyện" },
  { value: "Xuân Vĩnh", name: "Xuân Vĩnh", gender: "Nam", accent: "Miền Nam", style: "Tự nhiên" },
  { value: "Thanh Bình", name: "Thanh Bình", gender: "Nam", accent: "Miền Bắc", style: "Kể chuyện" },
  { value: "Trúc Ly", name: "Trúc Ly", gender: "Nữ", accent: "Miền Bắc", style: "Tự nhiên" },
  { value: "Ngọc Linh", name: "Ngọc Linh", gender: "Nữ", accent: "Miền Bắc", style: "Kể chuyện" },
  { value: "Đoan Trang", name: "Đoan Trang", gender: "Nữ", accent: "Miền Bắc", style: "Tự nhiên" },
  { value: "Mai Anh", name: "Mai Anh", gender: "Nữ", accent: "Miền Bắc", style: "Tin tức" },
  { value: "Thục Đoan", name: "Thục Đoan", gender: "Nữ", accent: "Miền Nam", style: "Kể chuyện" },
  { value: "Minh Triết", name: "Minh Triết", gender: "Nam", accent: "Miền Nam", style: "Tin tức" },
  { value: "Thùy Dung", name: "Thùy Dung", gender: "Nữ", accent: "Miền Nam", style: "Tin tức" },
  { value: "Quang Sơn", name: "Quang Sơn", gender: "Nam", accent: "Miền Trung", style: "Tự nhiên" },
  { value: "Ngọc Trân", name: "Ngọc Trân", gender: "Nữ", accent: "Miền Trung", style: "Tự nhiên" },
];

const KOKORO_VOICES_DATA = [
  { value: "diem_trinh", name: "Điểm Trịnh", gender: "Nữ", accent: "Kokoro", style: "Ấm áp" },
  { value: "hung_thinh", name: "Hùng Thịnh", gender: "Nam", accent: "Kokoro", style: "Chuẩn" },
  { value: "mai_linh", name: "Mai Linh", gender: "Nữ", accent: "Kokoro", style: "Truyền cảm" },
  { value: "mai_loan", name: "Mai Loan", gender: "Nữ", accent: "Kokoro", style: "Nhẹ nhàng" },
  { value: "manh_dung", name: "Mạnh Dũng", gender: "Nam", accent: "Kokoro", style: "Trầm ấm" },
  { value: "my_yen", name: "Mỹ Yến", gender: "Nữ", accent: "Kokoro", style: "Tự nhiên" },
  { value: "ngoc_huyen", name: "Ngọc Huyền", gender: "Nữ", accent: "Kokoro", style: "Trong trẻo" },
  { value: "phat_tai", name: "Phát Tài", gender: "Nam", accent: "Kokoro", style: "Năng động" },
  { value: "thanh_dat", name: "Thành Đạt", gender: "Nam", accent: "Kokoro", style: "Tin tức" },
  { value: "thuc_trinh", name: "Thục Trịnh", gender: "Nữ", accent: "Kokoro", style: "Dịu dàng" },
  { value: "tuan_ngoc", name: "Tuấn Ngọc", gender: "Nam", accent: "Kokoro", style: "Kể chuyện" },
  { value: "storyvert", name: "Storyvert", gender: "Nữ", accent: "Kokoro", style: "Đọc truyện" },
  { value: "duc_an", name: "Đức An", gender: "Nam", accent: "Kokoro", style: "Trẻ trung" },
  { value: "duc_duy", name: "Đức Duy", gender: "Nam", accent: "Kokoro", style: "Sôi nổi" },
];

let localCardPreviewAudio = null;
let localCardPlayingBtn = null;

function stopLocalCardPreview() {
  if (localCardPreviewAudio) {
    localCardPreviewAudio.pause();
    localCardPreviewAudio = null;
  }
  if (localCardPlayingBtn) {
    localCardPlayingBtn.innerHTML = `<svg viewBox="0 0 24 24"><polygon points="6 4 20 12 6 20 6 4"/></svg>`;
    localCardPlayingBtn.title = "Nghe thử";
    localCardPlayingBtn = null;
  }
}

function initLocalVoiceSwitcher() {
  const engineSel = els.ttsEngineSelect;
  const styleSel = els.styleSelect;
  const vieneuVoiceSel = els.voiceSelect;
  const kokoroVoiceSel = els.kokoroVoiceSelect;
  const listContainer = document.getElementById("localVoiceList");

  if (!engineSel || !listContainer) return;

  function renderLocalVoiceCards() {
    stopLocalCardPreview();
    const engine = engineSel.value;
    const isKokoro = engine === "kokoro";

    if (els.vieneuStyleLabel) {
      els.vieneuStyleLabel.hidden = isKokoro;
    }

    const voiceList = isKokoro ? KOKORO_VOICES_DATA : VIENEU_VOICES_DATA;
    const currentVoiceSel = isKokoro ? kokoroVoiceSel : vieneuVoiceSel;
    const storageKey = isKokoro ? "riki:settings:kokoro-voice" : "riki:settings:voice";
    const defaultVal = isKokoro ? "diem_trinh" : "Minh Đức";
    const selectedVoice = localStorage.getItem(storageKey) || (currentVoiceSel ? currentVoiceSel.value : defaultVal);

    if (currentVoiceSel) currentVoiceSel.value = selectedVoice;

    listContainer.innerHTML = "";

    voiceList.forEach(v => {
      const card = document.createElement("div");
      const isSelected = v.value === selectedVoice;
      card.className = `voice-card ${isSelected ? 'selected' : ''}`;
      card.dataset.voiceValue = v.value;

      const isFemale = v.gender === "Nữ";
      const genderClass = isFemale ? "voice-card__tag--female" : "voice-card__tag--male";

      card.innerHTML = `
        <div class="voice-card__top">
          <button type="button" class="voice-card__play-btn" title="Nghe thử">
            <svg viewBox="0 0 24 24"><polygon points="6 4 20 12 6 20 6 4"/></svg>
          </button>
          <div class="voice-card__name" title="${v.name}">${v.name}</div>
        </div>
        <div class="voice-card__tags">
          <span class="voice-card__tag ${genderClass}">${v.gender}</span>
          <span class="voice-card__tag voice-card__tag--accent">${v.accent}</span>
          <span class="voice-card__tag voice-card__tag--free">${v.style}</span>
        </div>
        <div class="voice-card__check">✓</div>
      `;

      card.addEventListener("click", (e) => {
        if (e.target.closest(".voice-card__play-btn")) return;
        listContainer.querySelectorAll(".voice-card").forEach(c => c.classList.remove("selected"));
        card.classList.add("selected");
        if (currentVoiceSel) currentVoiceSel.value = v.value;
        localStorage.setItem(storageKey, v.value);
      });

      const playBtn = card.querySelector(".voice-card__play-btn");
      playBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (localCardPlayingBtn === playBtn) {
          stopLocalCardPreview();
          return;
        }

        stopLocalCardPreview();
        localCardPlayingBtn = playBtn;
        playBtn.innerHTML = `
          <svg class="preview-spinner" viewBox="0 0 24 24" style="animation: spin 1s linear infinite; width: 12px; height: 12px; fill: none; stroke: currentColor;">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" stroke-dasharray="31.4" stroke-linecap="round"/>
          </svg>
        `;

        try {
          const PREVIEW_TEXT = "Xin chào! Đây là giọng đọc thử nghiệm VieNeu xưởng giọng đọc local.";
          const style = styleSel ? styleSel.value : "tu_nhien";
          const speechRate = els.speechRateSelect ? parseFloat(els.speechRateSelect.value) || 1.0 : 1.0;

          const result = await window.electronAPI.previewVoice({
            engine,
            voice: isKokoro ? "Minh Đức" : v.value,
            kokoroVoice: isKokoro ? v.value : "diem_trinh",
            style,
            text: PREVIEW_TEXT,
            speechRate
          });

          if (result && result.success && result.audio) {
            localCardPreviewAudio = new Audio(result.audio);
            playBtn.innerHTML = `<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12"/></svg>`;
            playBtn.title = "Dừng phát";
            localCardPreviewAudio.play();
            localCardPreviewAudio.onended = () => stopLocalCardPreview();
            localCardPreviewAudio.onerror = () => {
              stopLocalCardPreview();
              showToast("❌ Lỗi phát audio preview");
            };
          } else {
            stopLocalCardPreview();
            showToast("❌ Lỗi: " + (result?.error || "Không thể tạo audio preview"));
          }
        } catch (err) {
          stopLocalCardPreview();
          showToast("❌ Lỗi preview: " + err.message);
        }
      });

      listContainer.appendChild(card);
    });
  }

  engineSel.addEventListener("change", () => {
    localStorage.setItem("riki:settings:tts-engine", engineSel.value);
    renderLocalVoiceCards();
  });

  const savedEngine = localStorage.getItem("riki:settings:tts-engine") || "vieneu";
  engineSel.value = savedEngine;
  renderLocalVoiceCards();
}

// ===================================================================
// VOICE SOURCE SWITCHER — Toggle Local / DRK API / Cloud modes
// ===================================================================
function initVoiceSourceSwitcher() {
  const radios = document.querySelectorAll('input[name="voiceSourceMode"]');
  const localSection = els.localTtsSection;
  const drkSection = els.drkApiSection;
  const cloudSection = els.cloudTtsSection;
  const modeLocalLabel = els.modeLocalLabel;
  const modeDrkLabel = els.modeDrkLabel;
  const modeCloudLabel = els.modeCloudLabel;

  function applyMode(mode) {
    const isLocal = mode === "local";
    const isDrk = mode === "drk_api";
    const isCloud = mode === "cloud";

    if (localSection) localSection.hidden = !isLocal;
    if (drkSection) drkSection.hidden = !isDrk;
    if (cloudSection) cloudSection.hidden = !isCloud;

    if (modeLocalLabel) modeLocalLabel.classList.toggle("active", isLocal);
    if (modeDrkLabel) modeDrkLabel.classList.toggle("active", isDrk);
    if (modeCloudLabel) modeCloudLabel.classList.toggle("active", isCloud);

    localStorage.setItem("riki:settings:voice-mode", mode);
  }

  const saved = localStorage.getItem("riki:settings:voice-mode") || "local";
  radios.forEach(r => {
    r.checked = (r.value === saved);
    r.addEventListener("change", () => applyMode(r.value));
  });
  applyMode(saved);
}

// ===================================================================
// DRK API SWITCHER — Dynamic Model & Voice Selector with Cards Grid
// ===================================================================
let drkCardPreviewAudio = null;
let drkCardPlayingBtn = null;

function stopDrkCardPreview() {
  if (drkCardPreviewAudio) {
    drkCardPreviewAudio.pause();
    drkCardPreviewAudio = null;
  }
  if (drkCardPlayingBtn) {
    drkCardPlayingBtn.innerHTML = `<svg viewBox="0 0 24 24"><polygon points="6 4 20 12 6 20 6 4"/></svg>`;
    drkCardPlayingBtn.title = "Nghe thử";
    drkCardPlayingBtn = null;
  }
}

function initDrkApiSwitcher() {
  const modelSel = els.drkModelSelect;
  const voiceSel = els.drkVoiceSelect;
  const listContainer = document.getElementById("drkVoiceList");
  if (!modelSel || !voiceSel || !listContainer) return;

  async function loadVoicesForModel(modelId) {
    stopDrkCardPreview();
    listContainer.innerHTML = "<div style='grid-column: 1/-1; padding: 20px; text-align: center; color: var(--ink-soft); font-size: 13px;'>⏳ Đang tải danh sách giọng đọc dinhrinmkt...</div>";

    try {
      const keys = loadApiKeys();
      const apiKey = keys.drk;
      const res = await window.electronAPI.fetchDrkVoices(modelId, apiKey);
      listContainer.innerHTML = "";
      voiceSel.innerHTML = "";

      let voices = [];
      if (res && res.success && res.voices && res.voices.length > 0) {
        voices = res.voices;
      } else {
        voices = [
          modelId === "capcut_free"
            ? { id: "capcut:bv:BV560_streaming", name: "Anh Dũng (Vi)", gender: "male" }
            : { id: "voice51:0", name: "Giọng Adam", gender: "male" }
        ];
      }

      voices.forEach(v => {
        const opt = document.createElement("option");
        opt.value = v.id;
        opt.textContent = v.name || v.id;
        voiceSel.appendChild(opt);
      });

      const savedVoice = localStorage.getItem(`riki:settings:drk-voice:${modelId}`) || voices[0].id;
      voiceSel.value = savedVoice;

      voices.forEach(v => {
        const card = document.createElement("div");
        const isSelected = v.id === savedVoice;
        card.className = `voice-card ${isSelected ? 'selected' : ''}`;
        card.dataset.voiceId = v.id;

        const gRaw = (v.gender || "").toLowerCase();
        const isFemale = gRaw.includes("female") || gRaw.includes("nữ") || gRaw.includes("nu");
        const genderLabel = isFemale ? "Nữ" : "Nam";
        const genderClass = isFemale ? "voice-card__tag--female" : "voice-card__tag--male";

        const voiceName = v.name || v.id;

        card.innerHTML = `
          <div class="voice-card__top">
            <button type="button" class="voice-card__play-btn" title="Nghe thử">
              <svg viewBox="0 0 24 24"><polygon points="6 4 20 12 6 20 6 4"/></svg>
            </button>
            <div class="voice-card__name" title="${voiceName}">${voiceName}</div>
          </div>
          <div class="voice-card__tags">
            <span class="voice-card__tag ${genderClass}">${genderLabel}</span>
            <span class="voice-card__tag voice-card__tag--free">Miễn phí</span>
          </div>
          <div class="voice-card__check">✓</div>
        `;

        card.addEventListener("click", (e) => {
          if (e.target.closest(".voice-card__play-btn")) return;
          listContainer.querySelectorAll(".voice-card").forEach(c => c.classList.remove("selected"));
          card.classList.add("selected");
          voiceSel.value = v.id;
          voiceSel.dispatchEvent(new Event("change"));
          localStorage.setItem(`riki:settings:drk-voice:${modelId}`, v.id);
        });

        const playBtn = card.querySelector(".voice-card__play-btn");
        playBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          if (drkCardPlayingBtn === playBtn) {
            stopDrkCardPreview();
            return;
          }

          stopDrkCardPreview();
          drkCardPlayingBtn = playBtn;
          playBtn.innerHTML = `
            <svg class="preview-spinner" viewBox="0 0 24 24" style="animation: spin 1s linear infinite; width: 12px; height: 12px; fill: none; stroke: currentColor;">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" stroke-dasharray="31.4" stroke-linecap="round"/>
            </svg>
          `;

          try {
            const PREVIEW_TEXT = "Xin chào! Đây là giọng đọc thử nghiệm dinhrinmkt.";
            const keys = loadApiKeys();
            const result = await window.electronAPI.previewVoice({
              provider: "drk_api",
              engine: "drk_api",
              modelId,
              voiceId: v.id,
              drkApiKey: keys.drk,
              text: PREVIEW_TEXT,
              speechRate: 1.0
            });

            if (result && result.success && result.audio) {
              drkCardPreviewAudio = new Audio(result.audio);
              playBtn.innerHTML = `<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12"/></svg>`;
              playBtn.title = "Dừng phát";
              drkCardPreviewAudio.play();
              drkCardPreviewAudio.onended = () => stopDrkCardPreview();
              drkCardPreviewAudio.onerror = () => {
                stopDrkCardPreview();
                showToast("❌ Lỗi phát audio preview");
              };
            } else {
              stopDrkCardPreview();
              let errText = result?.error || "Không thể tạo audio preview";
              if (errText.includes("402") || errText.includes("credit") || errText.includes("Không đủ credit")) {
                errText = "Giới hạn tạo voice trong ngày với mô hình này đã hết";
              }
              showToast("⚠️ " + errText);
            }
          } catch (err) {
            stopDrkCardPreview();
            let errText = err.message || String(err);
            if (errText.includes("402") || errText.includes("credit") || errText.includes("Không đủ credit")) {
              errText = "Giới hạn tạo voice trong ngày với mô hình này đã hết";
            }
            showToast("⚠️ " + errText);
          }
        });

        listContainer.appendChild(card);
      });

    } catch (err) {
      console.warn("Không thể tải danh sách giọng từ DRK API:", err);
      listContainer.innerHTML = "<div style='grid-column: 1/-1; padding: 20px; text-align: center; color: #cc3322;'>Không thể tải danh sách giọng từ dinhrinmkt API.</div>";
    }
  }

  const savedModel = localStorage.getItem("riki:settings:drk-model") || "voice51";
  modelSel.value = savedModel;

  modelSel.addEventListener("change", () => {
    const m = modelSel.value;
    localStorage.setItem("riki:settings:drk-model", m);
    loadVoicesForModel(m);
  });

  voiceSel.addEventListener("change", () => {
    localStorage.setItem(`riki:settings:drk-voice:${modelSel.value}`, voiceSel.value);
  });

  loadVoicesForModel(savedModel);
}


async function fetchElevenLabsVoices(apiKey) {
  if (!apiKey) return null;
  const headers = { "xi-api-key": apiKey };
  const allVoiceOptions = [];
  const voiceIdSet = new Set();

  try {
    // 1. Tải danh sách giọng cá nhân & mặc định (v1/voices) -> DÙNG ĐƯỢC CHO CẢ TÀI KHOẢN FREE
    const resUser = await fetch("https://api.elevenlabs.io/v1/voices", { headers });
    if (resUser.ok) {
      const dataUser = await resUser.json();
      if (dataUser.voices && Array.isArray(dataUser.voices)) {
        dataUser.voices.forEach(v => {
          voiceIdSet.add(v.voice_id);
          const isPremade = v.category === "premade";
          const gender = v.labels?.gender ? v.labels.gender : "";
          const accent = v.labels?.accent ? v.labels.accent : "";
          allVoiceOptions.push({
            value: v.voice_id,
            name: v.name,
            gender: gender,
            accent: accent,
            type: isPremade ? "free" : "user",
            previewUrl: v.preview_url || "",
            priority: 1
          });
        });
      }
    }

    // 2. Tự động tìm kiếm & tải thêm các Giọng Tiếng Việt từ Shared Voice Library (/v1/shared-voices)
    try {
      const resShared = await fetch("https://api.elevenlabs.io/v1/shared-voices?language=vi&page_size=50", { headers });
      if (resShared.ok) {
        const dataShared = await resShared.json();
        const sharedList = dataShared.shared_voices || dataShared.voices || [];
        if (Array.isArray(sharedList)) {
          sharedList.forEach(v => {
            const vId = v.voice_id || v.public_owner_id;
            if (vId && !voiceIdSet.has(vId)) {
              voiceIdSet.add(vId);
              const gender = v.gender || v.labels?.gender || "";
              const accent = v.accent || v.labels?.accent || "";
              allVoiceOptions.push({
                value: vId,
                name: v.name,
                gender: gender,
                accent: accent,
                type: "paid",
                previewUrl: v.preview_url || "",
                priority: 2
              });
            }
          });
        }
      }
    } catch (sharedErr) {
      console.warn("Không thể tải danh sách shared-voices Tiếng Việt:", sharedErr);
    }

    // Sắp xếp danh sách: Giọng Free OK & Giọng cá nhân (1) -> Giọng Shared Paid (2)
    allVoiceOptions.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.name.localeCompare(b.name);
    });

    return allVoiceOptions.length > 0 ? allVoiceOptions : null;
  } catch (e) {
    console.warn("Không thể tự động tải danh sách giọng từ ElevenLabs API:", e);
  }
  return null;
}

// ===================================================================
// ELEVENLABS CARD SELECTOR — Render voice cards and handle clicks
// ===================================================================
let refreshCurrentCloudVoices = null;
let cardPreviewAudio = null;
let cardPlayingBtn = null;

function initCloudProviderSwitcher() {
  const voiceSel = els.cloudVoiceSelect;
  const listContainer = document.getElementById("cloudVoiceList");
  if (!listContainer) return;

  function stopCardPreview() {
    if (cardPreviewAudio) {
      cardPreviewAudio.pause();
      cardPreviewAudio = null;
    }
    if (cardPlayingBtn) {
      cardPlayingBtn.innerHTML = `<svg viewBox="0 0 24 24"><polygon points="6 4 20 12 6 20 6 4"/></svg>`;
      cardPlayingBtn.title = "Nghe thử";
      cardPlayingBtn = null;
    }
  }

  async function renderVoiceCards() {
    stopCardPreview();
    listContainer.innerHTML = "";
    
    // Default starting list
    let voices = [...ELEVENLABS_STATIC_VOICES];

    // Check if ElevenLabs key exists
    const keys = loadApiKeys();
    if (keys.elevenlabs) {
      const liveVoices = await fetchElevenLabsVoices(keys.elevenlabs);
      if (liveVoices && liveVoices.length > 0) {
        voices = liveVoices;
      }
    }

    // Synchronize to the hidden cloudVoiceSelect for compatibility
    if (voiceSel) {
      voiceSel.innerHTML = "";
      voices.forEach(v => {
        const opt = document.createElement("option");
        opt.value = v.value;
        opt.textContent = v.name || v.label;
        voiceSel.appendChild(opt);
      });
    }

    const savedVoice = localStorage.getItem("riki:settings:cloud-voice") || (voices[0] ? voices[0].value : "");
    if (voiceSel) {
      voiceSel.value = savedVoice;
    }

    voices.forEach(v => {
      const card = document.createElement("div");
      const isSelected = v.value === savedVoice;
      card.className = `voice-card ${isSelected ? 'selected' : ''}`;
      card.dataset.voiceId = v.value;

      const typeLabel = v.type === 'free' ? 'Free OK' : (v.type === 'user' ? 'Cá nhân' : 'Paid Shared');
      const typeClass = v.type || 'free';

      card.innerHTML = `
        <div class="voice-card__top">
          <button type="button" class="voice-card__play-btn" title="Nghe thử">
            <svg viewBox="0 0 24 24"><polygon points="6 4 20 12 6 20 6 4"/></svg>
          </button>
          <div class="voice-card__name" title="${v.name}">${v.name}</div>
        </div>
        <div class="voice-card__tags">
          ${v.gender ? `<span class="voice-card__tag voice-card__tag--gender">${v.gender}</span>` : ''}
          ${v.accent ? `<span class="voice-card__tag voice-card__tag--accent">${v.accent}</span>` : ''}
          <span class="voice-card__tag voice-card__tag--${typeClass}">${typeLabel}</span>
        </div>
        <div class="voice-card__check">✓</div>
      `;

      // Select handler
      card.addEventListener("click", (e) => {
        // Skip selection if clicked play button
        if (e.target.closest(".voice-card__play-btn")) return;
        
        listContainer.querySelectorAll(".voice-card").forEach(c => c.classList.remove("selected"));
        card.classList.add("selected");
        if (voiceSel) {
          voiceSel.value = v.value;
          voiceSel.dispatchEvent(new Event("change"));
        }
        localStorage.setItem("riki:settings:cloud-voice", v.value);
      });

      // Play button handler
      const playBtn = card.querySelector(".voice-card__play-btn");
      playBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (cardPlayingBtn === playBtn) {
          stopCardPreview();
          return;
        }

        stopCardPreview();

        const previewUrl = v.previewUrl;
        if (!previewUrl) {
          const keys = loadApiKeys();
          if (!keys.elevenlabs) {
            showToast("⚠️ Vui lòng cấu hình API Key để nghe thử giọng này.");
            return;
          }
          playBtn.innerHTML = `
            <svg class="preview-spinner" viewBox="0 0 24 24" style="animation: spin 1s linear infinite; width: 12px; height: 12px; fill: none; stroke: currentColor;">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" stroke-dasharray="31.4" stroke-linecap="round"/>
            </svg>
          `;
          try {
            const PREVIEW_TEXT = "Hello! This is a voice preview from ElevenLabs.";
            const audioBlob = await fetchCloudTTSPreview("elevenlabs", { voice: v.value, model: "eleven_multilingual_v2", text: PREVIEW_TEXT, apiKeys: keys });
            if (audioBlob) {
              const url = URL.createObjectURL(audioBlob);
              cardPreviewAudio = new Audio(url);
              cardPlayingBtn = playBtn;
              playBtn.innerHTML = `<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12"/></svg>`;
              playBtn.title = "Dừng phát";
              cardPreviewAudio.play();
              cardPreviewAudio.onended = () => {
                URL.revokeObjectURL(url);
                stopCardPreview();
              };
              cardPreviewAudio.onerror = () => {
                URL.revokeObjectURL(url);
                stopCardPreview();
                showToast("❌ Lỗi phát audio preview");
              };
            }
          } catch (err) {
            stopCardPreview();
            showToast("❌ Lỗi: " + err.message);
          }
        } else {
          cardPlayingBtn = playBtn;
          playBtn.innerHTML = `<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12"/></svg>`;
          playBtn.title = "Dừng phát";
          cardPreviewAudio = new Audio(previewUrl);
          cardPreviewAudio.play();
          cardPreviewAudio.onended = () => {
            stopCardPreview();
          };
          cardPreviewAudio.onerror = () => {
            stopCardPreview();
            showToast("❌ Lỗi phát audio preview");
          };
        }
      });

      listContainer.appendChild(card);
    });
  }

  if (voiceSel) {
    voiceSel.addEventListener("change", () => {
      localStorage.setItem("riki:settings:cloud-voice", voiceSel.value);
    });
  }

  refreshCurrentCloudVoices = renderVoiceCards;
  renderVoiceCards();
}

// ===================================================================
// API KEY STORAGE
// ===================================================================
const API_KEY_STORAGE = {
  drk:          "riki:apikey:drk",
  openai:       "riki:apikey:openai",
  elevenlabs:   "riki:apikey:elevenlabs",
  fptai:        "riki:apikey:fptai",
};

const DEFAULT_DRK_KEY = "drk_4d09a9ddb66ead101af0d93346355bb502c9616f3a2827e2";

function loadApiKeys() {
  return {
    drk:         localStorage.getItem(API_KEY_STORAGE.drk) || DEFAULT_DRK_KEY,
    elevenlabs:  localStorage.getItem(API_KEY_STORAGE.elevenlabs) || "",
  };
}

function saveApiKeys(keys) {
  Object.entries(API_KEY_STORAGE).forEach(([k, storageKey]) => {
    if (keys[k] !== undefined) {
      if (keys[k]) localStorage.setItem(storageKey, keys[k]);
      else localStorage.removeItem(storageKey);
    }
  });
}

// ===================================================================
// API KEY MODAL
// ===================================================================
function initApiKeyModal() {
  const openBtn     = els.openApiKeyModalBtn;
  const openDrkBtn  = els.openDrkApiKeyModalBtn;
  const modal       = els.apiKeyModal;
  const backdrop    = els.apiKeyModalBackdrop;
  const closeBtn    = els.apiKeyModalClose;
  const cancelBtn   = els.apiKeyModalCancel;
  const saveBtn     = els.apiKeyModalSave;
  const statusEl    = els.apiKeyStatus;
  const titleEl     = document.getElementById("apiKeyModalTitle");

  if (!modal) return;

  // Eye toggle buttons for password inputs
  modal.querySelectorAll(".btn-eye").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      if (!input) return;
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      btn.classList.toggle("active", isPassword);
    });
  });

  function updateApiKeyQuickStatus() {
    const statusEl = els.apiKeyQuickStatus;
    if (statusEl) {
      const keys = loadApiKeys();
      if (keys.elevenlabs) {
        statusEl.textContent = "Đã cấu hình ElevenLabs ✓";
        statusEl.classList.add("is-ready");
      } else {
        statusEl.textContent = "Chưa cấu hình";
        statusEl.classList.remove("is-ready");
      }
    }
    const drkStatusEl = els.drkApiKeyQuickStatus;
    if (drkStatusEl) {
      const keys = loadApiKeys();
      if (keys.drk) {
        drkStatusEl.textContent = "Đã sẵn sàng Key ✓";
        drkStatusEl.classList.add("is-ready");
      } else {
        drkStatusEl.textContent = "Chưa cấu hình";
        drkStatusEl.classList.remove("is-ready");
      }
    }
  }

  function updateCardState(cardId, badgeId, value) {
    const card  = document.getElementById(cardId);
    const badge = document.getElementById(badgeId);
    const hasValue = !!(value && value.trim());

    if (card)  card.classList.toggle("has-key", hasValue);
    if (badge) {
      badge.textContent = hasValue ? "Đã cài đặt ✓" : "Chưa thiết lập";
    }
  }

  function updateAllCardStates() {
    updateCardState("cardDrk", "badgeDrk", els.apiKeyDrk ? els.apiKeyDrk.value : DEFAULT_DRK_KEY);
    updateCardState("cardElevenLabs", "badgeElevenLabs", els.apiKeyElevenLabs ? els.apiKeyElevenLabs.value : "");
    updateApiKeyQuickStatus();
  }

  function openModal() {
    if (!modal) return;
    const keys = loadApiKeys();
    if (els.apiKeyDrk) els.apiKeyDrk.value = keys.drk;
    if (els.apiKeyElevenLabs) els.apiKeyElevenLabs.value = keys.elevenlabs;
    if (statusEl) { statusEl.textContent = ""; statusEl.className = "api-key-status"; }
    
    modal.hidden = false;
    updateAllCardStates();
    if (titleEl) {
      titleEl.textContent = "Cấu hình API Key — Voice API Provider & ElevenLabs";
    }
    if (els.apiKeyDrk) {
      setTimeout(() => els.apiKeyDrk.focus(), 100);
    }
  }

  function closeModal() {
    if (modal) modal.hidden = true;
  }

  function saveKeys() {
    const keys = {
      drk:         els.apiKeyDrk ? els.apiKeyDrk.value.trim() : DEFAULT_DRK_KEY,
      elevenlabs:  els.apiKeyElevenLabs ? els.apiKeyElevenLabs.value.trim() : "",
    };
    saveApiKeys(keys);
    updateAllCardStates();
    if (typeof refreshCurrentCloudVoices === "function") {
      refreshCurrentCloudVoices();
    }
    
    if (statusEl) {
      statusEl.textContent = `✅ Đã lưu cấu hình API Keys thành công!`;
      statusEl.className = "api-key-status";
    }
    addAppLog("info", "ApiKey", `API Key đã được cập nhật và lưu local.`);
    setTimeout(() => closeModal(), 1000);
  }

  if (openBtn)    openBtn.addEventListener("click", openModal);
  if (openDrkBtn) openDrkBtn.addEventListener("click", openModal);
  if (closeBtn)   closeBtn.addEventListener("click", closeModal);
  if (cancelBtn)  cancelBtn.addEventListener("click", closeModal);
  if (saveBtn)    saveBtn.addEventListener("click", saveKeys);
  if (backdrop)   backdrop.addEventListener("click", closeModal);

  // Initial status check on page load
  updateApiKeyQuickStatus();
}



// ===================================================================
// CLOUD TTS PREVIEW — Fetch audio from cloud provider API
// ===================================================================
async function fetchCloudTTSPreview(provider, { voice, model, text, apiKeys }) {
  if (provider === "elevenlabs") {
    const voiceId = voice || "21m00Tcm4TlvDq8ikWAM";
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKeys.elevenlabs,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      let detail = err.detail?.message || (typeof err.detail === "string" ? err.detail : null);
      if (detail && (detail.includes("cannot use library voices") || detail.includes("creator tier"))) {
        detail = "Tài khoản ElevenLabs của bạn đang ở gói Free nên không thể gọi giọng từ Shared Library qua API. Vui lòng chọn các giọng có nhãn [Mặc định - Free OK] (như Liam, Sarah, Adam, Bella...) hoặc nâng cấp tài khoản ElevenLabs lên gói Creator!";
      }
      throw new Error(detail || "ElevenLabs API lỗi " + res.status);
    }
    return res.blob();
  }

  throw new Error("Provider không hỗ trợ hoặc đã bị loại bỏ: " + provider);
}

// ===================================================================
// VOICE PREVIEW — Nghe thử giọng
// ===================================================================
function initVoicePreview() {
  const btn = els.previewVoiceBtn;
  if (!btn) return;

  let previewAudio = null;
  let isPlaying = false;

  const PREVIEW_TEXT = "Xin chào! Đây là giọng đọc mẫu của Riki Scene. Chúc bạn tạo được video ưng ý nhất.";

  function setPreviewState(loading, playing) {
    const span = btn.querySelector("span");
    const svg  = btn.querySelector("svg");
    isPlaying = playing;

    if (loading) {
      btn.disabled = true;
      if (svg) svg.style.display = "none";
      if (!btn.querySelector(".preview-spinner")) {
        const sp = document.createElement("span");
        sp.className = "preview-spinner";
        btn.insertBefore(sp, span);
      }
      if (span) span.textContent = "Đang tạo giọng mẫu…";
    } else if (playing) {
      btn.disabled = false;
      if (svg) svg.style.display = "";
      const sp = btn.querySelector(".preview-spinner");
      if (sp) sp.remove();
      if (span) span.textContent = "⏹ Dừng phát mẫu";
    } else {
      btn.disabled = false;
      if (svg) svg.style.display = "";
      const sp = btn.querySelector(".preview-spinner");
      if (sp) sp.remove();
      if (span) span.textContent = "Nghe thử giọng này";
    }
  }

  btn.addEventListener("click", async () => {
    if (isPlaying) {
      if (previewAudio) {
        previewAudio.pause();
        previewAudio = null;
      }
      setPreviewState(false, false);
      return;
    }

    const voiceModeRadio = document.querySelector('input[name="voiceSourceMode"]:checked');
    const mode = voiceModeRadio ? voiceModeRadio.value : "local";

    if (mode === "local") {
      setPreviewState(true, false);
      const engine = els.ttsEngineSelect ? els.ttsEngineSelect.value : "vieneu";
      const kokoroVoice = els.kokoroVoiceSelect ? els.kokoroVoiceSelect.value : "diem_trinh";
      const voice = engine === "kokoro" ? kokoroVoice : (els.voiceSelect ? els.voiceSelect.value : "Minh Đức");
      const style = engine === "vieneu" && els.styleSelect ? els.styleSelect.value : "tu_nhien";
      const speechRate = els.speechRateSelect ? parseFloat(els.speechRateSelect.value) || 1.0 : 1.0;
      const foreignSpeechRate = els.foreignSpeechRateSelect ? parseFloat(els.foreignSpeechRateSelect.value) || 1.0 : 1.0;

      try {
        const result = await window.electronAPI.previewVoice({
          engine,
          voice,
          kokoroVoice,
          style,
          text: PREVIEW_TEXT,
          bracketLang: els.bracketLangSelect ? els.bracketLangSelect.value : "none",
          jaVoice: els.jaVoiceSelect ? els.jaVoiceSelect.value : "ja-JP-NanamiNeural",
          enVoice: els.enVoiceSelect ? els.enVoiceSelect.value : "en-US-AriaNeural",
          zhVoice: els.zhVoiceSelect ? els.zhVoiceSelect.value : "zh-CN-XiaoxiaoNeural",
          speechRate,
          foreignSpeechRate,
        });

        if (result && result.success && result.audio) {
          previewAudio = new Audio(result.audio);
          setPreviewState(false, true);
          previewAudio.play();
          const voiceLabelText = engine === "kokoro" ? `Kokoro: ${kokoroVoice}` : `${voice} (${style})`;
          addAppLog("info", "TTS Preview", `Phát giọng đọc thử thành công: ${voiceLabelText}`);
          showToast(`Đang phát giọng đọc thử: ${voiceLabelText} ✓`);

          previewAudio.onended = () => setPreviewState(false, false);
          previewAudio.onerror = () => {
            showToast("❌ Không thể phát audio preview");
            setPreviewState(false, false);
          };
        } else {
          const errText = result?.error || "Không thể tạo audio";
          addAppLog("error", "TTS Preview", `Lỗi nghe thử giọng: ${errText}`);
          showToast(`❌ Lỗi nghe thử giọng: ${errText}`);
          setPreviewState(false, false);
        }
      } catch (err) {
        addAppLog("error", "TTS Preview", `Lỗi nghe thử giọng: ${err.message}`);
        showToast(`❌ Lỗi preview: ${err.message}`);
        setPreviewState(false, false);
      }

    } else if (mode === "drk_api") {
      const keys = loadApiKeys();
      const modelId = els.drkModelSelect ? els.drkModelSelect.value : "capcut_free";
      const voiceId = els.drkVoiceSelect ? els.drkVoiceSelect.value : "voice51:0";
      const speechRate = els.speechRateSelect ? parseFloat(els.speechRateSelect.value) || 1.0 : 1.0;

      setPreviewState(true, false);
      try {
        const result = await window.electronAPI.previewVoice({
          provider: "drk_api",
          engine: "drk_api",
          modelId,
          voiceId,
          drkApiKey: keys.drk,
          text: PREVIEW_TEXT,
          speechRate
        });

        if (result && result.success && result.audio) {
          previewAudio = new Audio(result.audio);
          setPreviewState(false, true);
          previewAudio.play();
          addAppLog("info", "TTS DRK Preview", `Phát giọng thử Voice API thành công (${modelId} - ${voiceId})`);
          showToast(`Đang phát giọng API Provider (${modelId}): ${voiceId} ✓`);

          previewAudio.onended = () => setPreviewState(false, false);
          previewAudio.onerror = () => {
            showToast("❌ Không thể phát audio preview");
            setPreviewState(false, false);
          };
        } else {
          let errText = result?.error || "Không thể tạo audio từ Voice API";
          if (errText.includes("402") || errText.includes("credit") || errText.includes("Không đủ credit")) {
            errText = "Giới hạn tạo voice trong ngày với mô hình này đã hết";
          }
          addAppLog("error", "TTS DRK Preview", `Lỗi Voice API preview: ${errText}`);
          showToast(`⚠️ ${errText}`);
          setPreviewState(false, false);
        }
      } catch (err) {
        let errText = err.message || String(err);
        if (errText.includes("402") || errText.includes("credit") || errText.includes("Không đủ credit")) {
          errText = "Giới hạn tạo voice trong ngày với mô hình này đã hết";
        }
        addAppLog("error", "TTS DRK Preview", `Lỗi Voice API preview: ${errText}`);
        showToast(`⚠️ ${errText}`);
        setPreviewState(false, false);
      }

    } else {
      const provider = "elevenlabs";
      const apiKeys = loadApiKeys();

      if (!apiKeys.elevenlabs) {
        showToast("⚠️ Bạn chưa nhập API Key cho ElevenLabs. Nhấn '⚙️ Cấu hình Key' để thêm.");
        return;
      }

      setPreviewState(true, false);
      try {
        const voice = els.cloudVoiceSelect ? els.cloudVoiceSelect.value : "21m00Tcm4TlvDq8ikWAM";
        const model = "eleven_multilingual_v2";
        const audioBlob = await fetchCloudTTSPreview(provider, { voice, model, text: PREVIEW_TEXT, apiKeys });
        if (audioBlob) {
          const url = URL.createObjectURL(audioBlob);
          previewAudio = new Audio(url);
          setPreviewState(false, true);
          previewAudio.play();
          addAppLog("info", "TTS Cloud Preview", `Phát giọng đọc thử Cloud thành công (${provider} - ${voice})`);
          showToast(`Đang phát giọng Cloud (${provider}): ${voice} ✓`);

          previewAudio.onended = () => {
            URL.revokeObjectURL(url);
            setPreviewState(false, false);
          };
          previewAudio.onerror = () => {
            showToast("❌ Không thể phát audio Cloud preview");
            setPreviewState(false, false);
          };
        }
      } catch (err) {
        addAppLog("error", "TTS Cloud Preview", `Lỗi Cloud preview: ${err.message}`);
        showToast("❌ Lỗi Cloud preview: " + err.message);
        setPreviewState(false, false);
      }
    }
  });
}


updateVoiceDropdown();
initLocalVoiceSwitcher();
initVoiceSourceSwitcher();
initDrkApiSwitcher();
initCloudProviderSwitcher();
initVoicePreview();
initApiKeyModal();
initActorPreviews();
initInteractivePreview();
initAppLogger();
initGitUpdater();
render();

