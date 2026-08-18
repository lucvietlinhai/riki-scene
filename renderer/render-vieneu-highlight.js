const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const sharp = require("sharp");
const ffmpegPath = (() => { try { return require("ffmpeg-static"); } catch { return "ffmpeg"; } })();

const root = path.resolve(__dirname, "..");
const isAsar = root.includes("app.asar");
const resourcesDir = isAsar ? path.resolve(root, "..") : root;

const uvBin = (() => {
  const local = path.join(resourcesDir, "bin", process.platform === "win32" ? "uv.exe" : "uv");
  return fs.existsSync(local) ? local : "uv";
})();
const os = require("os");
const workDir = isAsar
  ? path.join(os.tmpdir(), "riki-scene-renderer")
  : path.join(root, "output", "vieneu-highlight");
const frameDir = path.join(workDir, "svg-frames");
const pngDir = path.join(workDir, "png-frames");
const audioDir = path.join(workDir, "audio");
const manifestPath = path.join(workDir, "manifest.json");
const audioListPath = path.join(workDir, "audio-list.txt");
const combinedAudio = path.join(workDir, "voice.wav");

const width = 1080;
const height = 1920;
const fps = 24;
const defaultFontFamily = "Segoe UI, Arial, sans-serif";

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i += 1) {
    if (args[i].startsWith("--") && i + 1 < args.length) {
      result[args[i].slice(2)] = args[i + 1];
      i += 1;
    }
  }
  return result;
}

const cliArgs = parseArgs();

let manifest;
if (cliArgs.config && fs.existsSync(cliArgs.config)) {
  console.log(`[render] Reading config from: ${cliArgs.config}`);
  manifest = JSON.parse(fs.readFileSync(cliArgs.config, "utf8"));
  if (!manifest.settings) {
    manifest.settings = { width, height, fps, format: "9:16" };
  }
} else {
  manifest = {
    settings: { width, height, fps, format: "9:16" },
    title: "Khách quan và Chủ quan",
    leftTerm: "Khách quan",
    rightTerm: "Chủ quan",
    leftColor: "#b92c1e",
    rightColor: "#5d9a4d",
    voice: "Minh Đức",
    style: "tin_tuc",
    highlight: "word",
    videoBg: "#ffffff",
    scenes: [
      { id: "scene-1", text: "Khách quan là cách nhìn sự việc đúng như nó đang diễn ra.", pose: "point-left" },
      { id: "scene-2", text: "Chủ quan là góc nhìn chịu ảnh hưởng bởi cảm xúc và kinh nghiệm cá nhân.", pose: "point-right" },
      { id: "scene-3", text: "Khi so sánh hai khái niệm, hãy nhìn vào điểm khác nhau trong cách đánh giá.", pose: "think" }
    ]
  };
}

(async () => { await main(); })();

async function main() {
  const output = manifest.outputPath || path.join(root, "output", "riki-scene-vieneu-highlight.mp4");

  resetDir(workDir);
  fs.mkdirSync(frameDir, { recursive: true });
  fs.mkdirSync(pngDir, { recursive: true });
  fs.mkdirSync(audioDir, { recursive: true });

  // Decode illustration images
  const imagePaths = {};
  for (const side of ["left", "right"]) {
    const key = `${side}Image`;
    const base64Data = manifest[key];
    if (base64Data && base64Data.startsWith("data:image/")) {
      const matches = base64Data.match(/^data:image\/([A-Za-z-+]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
        const buffer = Buffer.from(matches[2], "base64");
        const fileName = `illus-${side}.${ext}`;
        const filePath = path.join(workDir, fileName);
        fs.writeFileSync(filePath, buffer);
        imagePaths[side] = base64Data;
        console.log(`[render] Saved illustration image "${side}" to: ${filePath}`);
      }
    }
  }

  // Process global and per-scene videoBgImage as base64 data URIs for SVG rendering in Sharp
  const globalVideoBgDataUri = toBase64DataUri(manifest.videoBgImage);
  const sceneVideoBgDataUris = (manifest.scenes || []).map((sc) => toBase64DataUri(sc.videoBgImage) || globalVideoBgDataUri);

  // Decode actor images
  const actorFilePaths = {};
  if (manifest.actorImages) {
    for (const pose of ["point-left", "point-right", "think", "explain-1", "explain-2", "explain-3"]) {
      const base64Data = manifest.actorImages[pose];
      if (base64Data && base64Data.startsWith("data:image/")) {
        const matches = base64Data.match(/^data:image\/([A-Za-z-+]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
          const buffer = Buffer.from(matches[2], "base64");
          const fileName = `actor-${pose}.${ext}`;
          const filePath = path.join(workDir, fileName);
          fs.writeFileSync(filePath, buffer);
          actorFilePaths[pose] = filePath.replace(/\\/g, "/");
          console.log(`[render] Saved actor image for pose "${pose}" to: ${actorFilePaths[pose]}`);
        }
      } else if (base64Data && fs.existsSync(base64Data)) {
        actorFilePaths[pose] = base64Data.replace(/\\/g, "/");
        console.log(`[render] Using local actor file for pose "${pose}": ${actorFilePaths[pose]}`);
      }
    }
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  const engine = manifest.engine || "vieneu";
  const voice = manifest.voice || cliArgs.voice || "Minh Đức";
  const kokoroVoice = manifest.kokoroVoice || "diem_trinh";
  const vttsVoice = manifest.vttsVoice || "NF";
  const style = manifest.style || cliArgs.style || "tin_tuc";

  let voiceDisplay = `VieNeu (${voice} · ${style})`;
  if (engine === "kokoro") voiceDisplay = `Kokoro (${kokoroVoice})`;
  else if (engine === "vtts") voiceDisplay = `v-tts (${vttsVoice})`;

  console.log(`[render] Engine: ${engine} · Voice: ${voiceDisplay} · Scenes: ${manifest.scenes.length}`);
  console.log("[PROGRESS:5]");

  const venvPython = process.platform === "win32"
    ? path.join(cwdDir, ".venv", "Scripts", "python.exe")
    : path.join(cwdDir, ".venv", "bin", "python");

  const useDirectPython = fs.existsSync(venvPython);
  const cmd = useDirectPython ? venvPython : ensureTTSEnvironment();
  const scriptPath = path.join(root, "renderer", "vieneu_scene_tts.py");

  const scriptArgs = [
    "--manifest", manifestPath,
    "--out-dir", audioDir,
    "--voice", voice,
    "--style", style,
    "--vtts-voice", vttsVoice,
    "--ffmpeg-path", ffmpegPath
  ];

  const spawnArgs = useDirectPython
    ? [scriptPath, ...scriptArgs]
    : ["run", "--project", cwdDir, "python", scriptPath, ...scriptArgs];

  run(cmd, spawnArgs, cwdDir, { PYTHONIOENCODING: "utf-8", NLTK_DISABLE_IMPORT_SECURITY: "1", HF_HOME: path.join(cwdDir, ".cache") });

  console.log("[PROGRESS:40]");

  const tts = JSON.parse(fs.readFileSync(path.join(audioDir, "tts-scenes.json"), "utf8"));
  writeCombinedAudio(tts.items);
  console.log("[PROGRESS:50]");

  await writeFrames(tts.items, actorFilePaths, imagePaths, globalVideoBgDataUri, sceneVideoBgDataUris);
  console.log("[PROGRESS:82]");

  run(ffmpegPath, [
    "-y",
    "-framerate", String(fps),
    "-i", path.join(pngDir, "frame-%05d.png"),
    "-i", combinedAudio,
    "-map", "0:v:0",
    "-map", "1:a:0",
    "-vf", "format=yuv420p",
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "18",
    "-c:a", "aac",
    "-b:a", "192k",
    "-shortest",
    "-movflags", "+faststart",
    output
  ], root);

  console.log("[PROGRESS:97]");

  const summary = {
    output,
    width,
    height,
    fps,
    totalDuration: tts.totalDuration,
    scenes: tts.items.map((item) => ({
      text: item.text,
      duration: item.duration,
      wav: item.wav
    }))
  };
  fs.writeFileSync(path.join(workDir, "render-summary.json"), JSON.stringify(summary, null, 2), "utf8");
  console.log("[PROGRESS:100]");
  console.log(output);
}

function writeCombinedAudio(items) {
  const lines = items.map((item) => `file '${item.wav.replace(/\\/g, "/")}' `);
  fs.writeFileSync(audioListPath, lines.join("\n"), "utf8");
  run(ffmpegPath, [
    "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", audioListPath,
    "-c", "copy",
    combinedAudio
  ], root);
}

async function writeFrames(items, actorFilePaths, imagePaths, globalVideoBgDataUri, sceneVideoBgDataUris) {
  const TARGET_W = 480;
  const TARGET_H = 680;
  const loadedActors = {};

  for (const [pose, fpath] of Object.entries(actorFilePaths)) {
    if (fpath && fs.existsSync(fpath)) {
      try {
        const meta = await sharp(fpath).metadata();
        const scale = Math.min(TARGET_W / meta.width, TARGET_H / meta.height);
        const newW = Math.max(1, Math.round(meta.width * scale));
        const newH = Math.max(1, Math.round(meta.height * scale));
        const offsetX = Math.round((TARGET_W - newW) / 2);
        const offsetY = TARGET_H - newH;
        const resizedBuf = await sharp(fpath).resize(newW, newH).png().toBuffer();
        const canvasBuf = await sharp({
          create: { width: TARGET_W, height: TARGET_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
        }).composite([{ input: resizedBuf, left: offsetX, top: offsetY }]).png().toBuffer();
        loadedActors[pose] = canvasBuf;
        console.log(`[render] Loaded custom actor for pose '${pose}'`);
      } catch (err) {
        console.error(`[render] Error loading actor '${fpath}': ${err.message}`);
      }
    }
  }

  let frameNo = 1;
  for (let sceneIdx = 0; sceneIdx < items.length; sceneIdx += 1) {
    const item = items[sceneIdx];
    const scene = manifest.scenes[sceneIdx];
    const count = Math.max(1, Math.round(item.duration * fps));
    const hasActor = scene.pose && scene.pose !== "none";
    const actorCanvas = hasActor ? (loadedActors[scene.pose] || null) : null;

    const resolvedVideoBgImage = sceneVideoBgDataUris[sceneIdx] || globalVideoBgDataUri;
    for (let i = 0; i < count; i += 1) {
      const progress = i / Math.max(1, count - 1);
      const svgString = makeFrame(scene, sceneIdx, progress, items.length, item.duration, actorFilePaths, imagePaths, resolvedVideoBgImage);
      const pngPath = path.join(pngDir, `frame-${String(frameNo).padStart(5, "0")}.png`);

      const composites = [];
      if (actorCanvas) {
        const actorScalePct = scene.actorScale || manifest.actorScale || 100;
        const userScale = actorScalePct / 100;
        const targetW = Math.max(80, Math.round(440 * userScale));
        const targetH = Math.max(100, Math.round(600 * userScale));

        const resizedActor = await sharp(actorCanvas)
          .resize(targetW, targetH, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .toBuffer();

        const bobbing = Math.sin(progress * Math.PI) * -16;
        const targetLeft = Math.round(540 - targetW / 2);
        const targetTop = Math.max(0, Math.round(1920 - targetH - 20 + bobbing));

        composites.push({ input: resizedActor, left: targetLeft, top: targetTop });
      }

      await sharp(Buffer.from(svgString))
        .composite(composites)
        .png({ compressionLevel: 1, adaptiveFiltering: false })
        .toFile(pngPath);

      frameNo += 1;
    }

    const pct = Math.round(55 + ((sceneIdx + 1) / items.length) * 25);
    console.log(`[PROGRESS:${pct}]`);
  }
}

function extractDisplayText(text) {
  if (!text) return "";
  return text.replace(/(\S+)\[([^\]]+)\]/g, "$1").replace(/\[([^\]]+)\]/g, "$1").trim();
}

function extractSpeechText(text) {
  if (!text) return "";
  return text.replace(/(\S+)\[([^\]]+)\]/g, "$2").replace(/\[([^\]]+)\]/g, "$1").trim();
}

function toBase64DataUri(val) {
  if (!val) return "";
  if (val.startsWith("data:image/")) return val;
  if (fs.existsSync(val)) {
    const ext = path.extname(val).slice(1) || "png";
    const mime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
    const base64 = fs.readFileSync(val).toString("base64");
    return `data:${mime};base64,${base64}`;
  }
  return "";
}

function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}

function makeFrame(scene, sceneIndex, progress, totalScenes, duration, actorFilePaths, imagePaths, resolvedVideoBgImage) {
  const speechText = scene.speechText || extractSpeechText(scene.text);
  const displayText = scene.displayText || extractDisplayText(scene.text);
  const activeWord = activeWordIndex(speechText, progress);
  const videoBg = scene.videoBg || manifest.videoBg || "#ffffff";
  const videoBgImage = resolvedVideoBgImage || "";
  const fontFamily = scene.fontFamily || manifest.fontFamily || defaultFontFamily;
  const leftTerm = scene.leftTerm || manifest.leftTerm || "Trái";
  const rightTerm = scene.rightTerm || manifest.rightTerm || "Phải";
  const animationStyle = scene.animationStyle || manifest.animationStyle || "fade";
  const sceneImagePaths = {
    left: scene.leftImage || "",
    right: scene.rightImage || ""
  };
  const showSubtitles = scene.showSubtitles !== undefined ? scene.showSubtitles : (manifest.showSubtitles !== false);
  const showTerms = scene.showTerms !== undefined ? scene.showTerms : (manifest.showTerms !== false);
  const showIllustrations = scene.showIllustrations !== undefined ? scene.showIllustrations : (manifest.showIllustrations !== false);
  const showActor = scene.showActor !== undefined ? scene.showActor : (manifest.showActor !== false);

  const hasImages = showIllustrations && Boolean(sceneImagePaths.left || sceneImagePaths.right);
  const hasActor = showActor && Boolean(scene.pose && scene.pose !== "none");

  const userFontSize = scene.fontSize || manifest.fontSize || 40;
  let termsY = 110;
  let termFontSize = scene.termFontSize || manifest.termFontSize || 56;
  let highlightY = 640;
  let highlightWidth = 900;
  let highlightFontSize = userFontSize;

  if (hasImages && hasActor) {
    termsY = 110;
    highlightY = 640;
  } else if (!hasImages && hasActor) {
    termsY = 180;
    termFontSize = 64;
    highlightY = 560;
    highlightFontSize = Math.round(userFontSize * 1.15);
  } else if (hasImages && !hasActor) {
    termsY = 110;
    highlightY = 720;
    highlightFontSize = Math.round(userFontSize * 1.15);
  } else {
    termsY = 240;
    termFontSize = 72;
    highlightY = 680;
    highlightWidth = 920;
    highlightFontSize = Math.round(userFontSize * 1.3);
  }

  const offsets = scene.offsets || manifest.offsets || { termsY: 0, imagesY: 0, contentY: 0, actorY: 0 };
  const offTermsY = (offsets.termsY || 0) * 3.6;
  const offImagesY = (offsets.imagesY || 0) * 3.6;
  const offContentY = (offsets.contentY || 0) * 3.6;
  const offActorY = (offsets.actorY || 0) * 3.6;

  termsY = Math.max(40, Math.min(150, termsY + offTermsY));
  const imgY = Math.max(130, Math.min(220, 160 + offImagesY));
  highlightY = Math.max(570, Math.min(1200, highlightY + offContentY));
  const actorY = Math.max(1200, Math.min(1380, 1270 + offActorY));

  // Entrance Animation transform calculation
  const animDur = 0.35;
  const currentSec = progress * (duration || 3);
  const animP = Math.min(1.0, currentSec / animDur);
  const easeP = easeOutCubic(animP);

  let animGroupStart = "";
  let animGroupEnd = "";

  if (animationStyle === "fade") {
    animGroupStart = `<g opacity="${easeP.toFixed(3)}">`;
    animGroupEnd = `</g>`;
  } else if (animationStyle === "slide") {
    const slideY = Math.round((1 - easeP) * 25);
    animGroupStart = `<g opacity="${easeP.toFixed(3)}" transform="translate(0, ${slideY})">`;
    animGroupEnd = `</g>`;
  } else if (animationStyle === "pop") {
    const scale = (0.85 + 0.15 * easeP).toFixed(3);
    animGroupStart = `<g opacity="${easeP.toFixed(3)}" transform="translate(540, 960) scale(${scale}) translate(-540, -960)">`;
    animGroupEnd = `</g>`;
  } else if (animationStyle === "fly") {
    animGroupStart = `<g opacity="${easeP.toFixed(3)}">`;
    animGroupEnd = `</g>`;
  }

  const illustrationMarkup = hasImages ? `
    ${leftIllustration(sceneImagePaths, imgY)}
    ${rightIllustration(sceneImagePaths, imgY)}
  ` : "";

  const actorMarkup = hasActor
    ? `<g clip-path="url(#actorZoneClip)">${actor(scene.pose, 540, actorY + Math.sin(progress * Math.PI) * -16, actorFilePaths, scene)}</g>`
    : "";

  const bgLayer = videoBgImage
    ? `<rect width="${width}" height="${height}" fill="${videoBg}"/><image href="${videoBgImage}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect width="${width}" height="${height}" fill="${videoBg}"/>`;

  const termFontWeight = scene.termFontWeight || manifest.termFontWeight || "900";
  const leftColor = scene.leftColor || manifest.leftColor;
  const rightColor = scene.rightColor || manifest.rightColor;
  const termsMarkup = showTerms ? `
  <text x="300" y="${termsY}" text-anchor="middle" font-family="${fontFamily}" font-size="${termFontSize}" font-weight="${termFontWeight}" fill="${leftColor}">${escapeXml(leftTerm)}</text>
  <text x="780" y="${termsY}" text-anchor="middle" font-family="${fontFamily}" font-size="${termFontSize}" font-weight="${termFontWeight}" fill="${rightColor}">${escapeXml(rightTerm)}</text>
  ` : "";

  const subtitlesMarkup = showSubtitles
    ? `<g clip-path="url(#contentZoneClip)">${highlightText(displayText, activeWord, 90, highlightY, highlightWidth, 60, highlightFontSize, fontFamily, scene)}</g>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <clipPath id="leftClip"><rect x="75" y="${imgY}" width="440" height="380" rx="22"/></clipPath>
    <clipPath id="rightClip"><rect x="565" y="${imgY}" width="440" height="380" rx="22"/></clipPath>
    <clipPath id="contentZoneClip"><rect x="40" y="480" width="1000" height="780"/></clipPath>
    <clipPath id="actorZoneClip"><rect x="0" y="1270" width="1080" height="650"/></clipPath>
  </defs>
  ${bgLayer}

  ${animGroupStart}
  ${termsMarkup}

  ${illustrationMarkup}

  ${subtitlesMarkup}

  ${actorMarkup}
  ${animGroupEnd}
</svg>`;
}

function leftIllustration(imagePaths, imgY = 160) {
  if (imagePaths && imagePaths.left) {
    return `<g clip-path="url(#leftClip)">
    <rect x="75" y="${imgY}" width="440" height="380" rx="22" fill="#dde8ef"/>
    <image x="75" y="${imgY}" width="440" height="380" xlink:href="${imagePaths.left}" preserveAspectRatio="xMidYMid slice"/>
  </g>`;
  }
  return "";
}

function rightIllustration(imagePaths, imgY = 160) {
  if (imagePaths && imagePaths.right) {
    return `<g clip-path="url(#rightClip)">
    <rect x="565" y="${imgY}" width="440" height="380" rx="22" fill="#d5e8d0"/>
    <image x="565" y="${imgY}" width="440" height="380" xlink:href="${imagePaths.right}" preserveAspectRatio="xMidYMid slice"/>
  </g>`;
  }
  return "";
}

function highlightText(text, activeIndex, x, y, maxWidth, lineHeight, customFontSize, resolvedFontFamily, scene) {
  const normalized = text.normalize("NFC");
  const words = normalized.split(/\s+/).filter(Boolean);
  const fontSize = customFontSize || (scene && scene.fontSize) || manifest.fontSize || 40;
  const activeFontSize = Math.round(fontSize * 1.1);
  const effectiveLineHeight = Math.max(lineHeight || 54, Math.round(fontSize * 1.35));
  const lines = layoutWords(words, maxWidth, fontSize);
  let wordIndex = 0;
  const chunks = [];
  const centerX = Math.round(x + maxWidth / 2);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const lineWords = lines[lineIndex].words;
    const lineY = y + lineIndex * effectiveLineHeight;
    const tspans = [];

    for (let i = 0; i < lineWords.length; i += 1) {
      const word = lineWords[i];
      const current = wordIndex === activeIndex;
      const normalColor = (scene && scene.textColor) || manifest.textColor || "#202525";
      const highlightColor = (scene && scene.highlightColor) || manifest.highlightColor || "#3ac6c6";
      const fill = current ? highlightColor : normalColor;
      const currentSize = current ? activeFontSize : fontSize;
      const baseSubWeight = parseInt((scene && scene.subFontWeight) || manifest.subFontWeight || "700", 10);
      const currentWeight = current ? Math.min(900, baseSubWeight + 200) : baseSubWeight;
      const isLastInLine = i === lineWords.length - 1;
      const trailingSpace = isLastInLine ? "" : " ";

      tspans.push(`<tspan fill="${fill}" font-size="${currentSize}" font-weight="${currentWeight}">${escapeXml(word.text)}${trailingSpace}</tspan>`);
      wordIndex += 1;
    }

    const ff = resolvedFontFamily || defaultFontFamily;
    chunks.push(`<text x="${centerX}" y="${lineY}" text-anchor="middle" font-family="${ff}" xml:space="preserve">${tspans.join("")}</text>`);
  }
  return chunks.join("\n");
}

function layoutWords(words, maxWidth, size) {
  const lines = [];
  const spaceWidth = Math.round(size * 0.35);
  let current = { words: [], width: 0 };
  for (const word of words) {
    const width = estimateWidth(word, size);
    const nextWidth = current.words.length ? current.width + spaceWidth + width : width;
    if (nextWidth > maxWidth && current.words.length) {
      lines.push(current);
      current = { words: [], width: 0 };
    }
    current.words.push({ text: word, width });
    current.width = current.words.length === 1 ? width : current.width + spaceWidth + width;
  }
  if (current.words.length) lines.push(current);
  return lines.slice(0, 4);
}

function estimateWidth(word, size) {
  const normalized = word.normalize("NFC");
  let total = 0;
  for (const char of normalized) {
    if ("ijl1!.:;,Itfr/\\|()[]{}".includes(char)) {
      total += 0.38;
    } else if ("mwMW".includes(char)) {
      total += 0.95;
    } else if ("OQGHDCRNKABXYVP".includes(char)) {
      total += 0.80;
    } else if (/[A-Z]/.test(char)) {
      total += 0.75;
    } else {
      total += 0.68;
    }
  }
  return Math.ceil(total * size);
}

function activeWordIndex(text, progress) {
  const count = text.normalize("NFC").split(/\s+/).filter(Boolean).length;
  return Math.min(count - 1, Math.max(0, Math.floor(progress * count)));
}

function actor(pose, x, y, actorFilePaths, scene) {
  const filePath = actorFilePaths && actorFilePaths[pose];
  if (filePath) {
    return `<g transform="translate(${x} ${y})"></g>`;
  }
  const leftArmAngles = {
    "point-left": -128,
    "explain-2": -152,
    "explain-1": -55,
    "explain-3": -30,
  };
  const rightArmAngles = {
    "point-right": 128,
    "think": -74,
    "explain-1": 55,
    "explain-2": -30,
    "explain-3": -74,
  };
  const leftArm = leftArmAngles[pose] !== undefined ? leftArmAngles[pose] : 26;
  const rightArm = rightArmAngles[pose] !== undefined ? rightArmAngles[pose] : -30;
  const userScale = (((scene && scene.actorScale) !== undefined ? scene.actorScale : manifest.actorScale) || 100) / 100;
  const scale = 1.62 * userScale;
  const bodyColor = (scene && scene.highlightColor) || manifest.highlightColor || "#3ac6c6";
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <circle cx="0" cy="0" r="58" fill="#f1bd78" stroke="#202525" stroke-width="6"/>
    <circle cx="-19" cy="-3" r="6" fill="#202525"/><circle cx="19" cy="-3" r="6" fill="#202525"/>
    <path d="M-18 26Q0 38 18 26" fill="none" stroke="#202525" stroke-width="5" stroke-linecap="round"/>
    <rect x="-46" y="62" width="92" height="150" rx="24" fill="${bodyColor}" stroke="#202525" stroke-width="6"/>
    <rect x="-81" y="80" width="26" height="138" rx="13" fill="#202525" transform="rotate(${leftArm} -68 86)"/>
    <rect x="55" y="80" width="26" height="138" rx="13" fill="#202525" transform="rotate(${rightArm} 68 86)"/>
    <rect x="-34" y="205" width="28" height="104" rx="14" fill="#202525" transform="rotate(8 -20 212)"/>
    <rect x="6" y="205" width="28" height="104" rx="14" fill="#202525" transform="rotate(-8 20 212)"/>
  </g>`;
}

function resetDir(dir) {
  if (fs.existsSync(dir)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
    } catch (err) {
      if (err.code === "EPERM" || err.code === "EBUSY" || err.code === "ENOTEMPTY") {
        const hint = [
          ``,
          `[render] ─────────────────────────────────────────────────────`,
          `[render] Lỗi: Không thể xoá thư mục tạm "${dir}"`,
          `[render] Nguyên nhân: Một tiến trình khác đang giữ file trong thư mục này.`,
          `[render] Giải pháp:`,
          `[render]   1. Đóng Windows Explorer nếu đang mở thư mục output`,
          `[render]   2. Đóng trình phát video/nhạc đang mở file trong output`,
          `[render]   3. Đóng VS Code / Preview nếu đang xem file PNG/WAV`,
          `[render]   4. Xoá thủ công thư mục: ${dir}`,
          `[render]   5. Chạy lại lệnh render`,
          `[render] ─────────────────────────────────────────────────────`,
          ``,
        ].join("\n");
        console.error(hint);
        process.exit(1);
      }
      throw err;
    }
  }
  fs.mkdirSync(dir, { recursive: true });
}

function run(command, args, cwd, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: false,
    env: { ...process.env, ...extraEnv }
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[char]));
}

function ensureTTSEnvironment() {
  const ttsDir = path.join(resourcesDir, "local-tts", "VieNeu-TTS");
  const pyprojectPath = path.join(ttsDir, "pyproject.toml");

  if (!fs.existsSync(pyprojectPath)) {
    console.log("[render] VieNeu-TTS files missing. Running setup-binaries.js...");
    run("node", [path.join(resourcesDir, "setup-binaries.js")], resourcesDir);
  }

  const uvLocalPath = path.join(resourcesDir, "bin", process.platform === "win32" ? "uv.exe" : "uv");
  if (!fs.existsSync(uvLocalPath)) {
    console.log("[render] uv binary missing. Running setup-binaries.js...");
    run("node", [path.join(resourcesDir, "setup-binaries.js")], resourcesDir);
  }

  const activeUvBin = fs.existsSync(uvLocalPath) ? uvLocalPath : "uv";

  console.log("[render] Checking VieNeu-TTS Python environment...");
  const checkResult = spawnSync(activeUvBin, ["run", "--project", ttsDir, "python", "-c", "import vieneu"], {
    cwd: ttsDir,
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    shell: false
  });

  if (checkResult.status !== 0) {
    console.log("[render] VieNeu-TTS module missing in Python venv. Auto-installing now...");
    const syncResult = spawnSync(activeUvBin, ["sync", "--project", ttsDir, "--directory", ttsDir, "--no-group", "dev", "--no-group", "gpu"], {
      cwd: ttsDir,
      stdio: "inherit",
      env: { ...process.env }
    });
    if (syncResult.status !== 0) {
      console.error(`[render] ERROR: uv sync failed with exit code ${syncResult.status}`);
      process.exit(syncResult.status || 1);
    }
    console.log("[render] ✓ VieNeu-TTS Python environment ready!");
  }

  return activeUvBin;
}

