const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const sharp = require("sharp");
const ffmpegPath = (() => { try { return require("ffmpeg-static"); } catch { return "ffmpeg"; } })();

const root = path.resolve(__dirname, "..");
const uvBin = (() => {
  const local = path.join(root, "bin", process.platform === "win32" ? "uv.exe" : "uv");
  return fs.existsSync(local) ? local : "uv";
})();
const workDir = path.join(root, "output", "vieneu-highlight");
const frameDir = path.join(workDir, "svg-frames");
const pngDir = path.join(workDir, "png-frames");
const audioDir = path.join(workDir, "audio");
const manifestPath = path.join(workDir, "manifest.json");
const audioListPath = path.join(workDir, "audio-list.txt");
const combinedAudio = path.join(workDir, "voice.wav");

const width = 1080;
const height = 1920;
const fps = 24;
const fontFamily = "Segoe UI, Arial, sans-serif";

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
        imagePaths[side] = base64Data; // Sử dụng trực tiếp base64 cho SVG để tránh lỗi đường dẫn trên Windows
        console.log(`[render] Saved illustration image "${side}" to: ${filePath}`);
      }
    }
  }

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
      }
    }
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  const voice = manifest.voice || cliArgs.voice || "Minh Đức";
  const style = manifest.style || cliArgs.style || "tin_tuc";

  console.log(`[render] Voice: ${voice} · Style: ${style} · Scenes: ${manifest.scenes.length}`);
  console.log("[PROGRESS:5]");

  const activeUvBin = ensureTTSEnvironment();

  run(activeUvBin, [
    "run",
    "python",
    path.join(root, "renderer", "vieneu_scene_tts.py"),
    "--manifest", manifestPath,
    "--out-dir", audioDir,
    "--voice", voice,
    "--style", style
  ], path.join(root, "local-tts", "VieNeu-TTS"), { PYTHONIOENCODING: "utf-8" });

  console.log("[PROGRESS:40]");

  const tts = JSON.parse(fs.readFileSync(path.join(audioDir, "tts-scenes.json"), "utf8"));
  writeCombinedAudio(tts.items);
  console.log("[PROGRESS:50]");

  await writeFrames(tts.items, actorFilePaths, imagePaths);
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

async function writeFrames(items, actorFilePaths, imagePaths) {
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

    for (let i = 0; i < count; i += 1) {
      const progress = i / Math.max(1, count - 1);
      const svgString = makeFrame(scene, sceneIdx, progress, items.length, item.duration, actorFilePaths, imagePaths);
      const pngPath = path.join(pngDir, `frame-${String(frameNo).padStart(5, "0")}.png`);

      const composites = [];
      if (actorCanvas) {
        const actorScalePct = scene.actorScale || manifest.actorScale || 100;
        const userScale = actorScalePct / 100;
        const targetW = Math.max(80, Math.round(480 * userScale));
        const targetH = Math.max(100, Math.round(680 * userScale));

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

function makeFrame(scene, sceneIndex, progress, totalScenes, duration, actorFilePaths, imagePaths) {
  const activeWord = activeWordIndex(scene.text, progress);
  const videoBg = manifest.videoBg || "#ffffff";
  const leftTerm = scene.leftTerm || manifest.leftTerm || "Trái";
  const rightTerm = scene.rightTerm || manifest.rightTerm || "Phải";
  const sceneImagePaths = {
    left: scene.leftImage || (imagePaths && imagePaths.left) || "",
    right: scene.rightImage || (imagePaths && imagePaths.right) || ""
  };
  const hasImages = Boolean(sceneImagePaths.left || sceneImagePaths.right);
  const hasActor = Boolean(scene.pose && scene.pose !== "none");

  const userFontSize = manifest.fontSize || 40;
  let termsY = 382;
  let termFontSize = 56;
  let highlightY = 900;
  let highlightWidth = 730;
  let highlightFontSize = userFontSize;

  if (hasImages && hasActor) {
    termsY = 382;
    highlightY = 900;
  } else if (!hasImages && hasActor) {
    termsY = 480;
    termFontSize = 64;
    highlightY = 880;
    highlightFontSize = Math.round(userFontSize * 1.15);
  } else if (hasImages && !hasActor) {
    termsY = 400;
    highlightY = 1040;
    highlightFontSize = Math.round(userFontSize * 1.15);
  } else {
    termsY = 620;
    termFontSize = 72;
    highlightY = 1000;
    highlightWidth = 820;
    highlightFontSize = Math.round(userFontSize * 1.3);
  }

  const illustrationMarkup = hasImages ? `
    ${leftIllustration(sceneImagePaths)}
    ${rightIllustration(sceneImagePaths)}
  ` : "";

  const actorMarkup = hasActor ? actor(scene.pose, 540, 1380 + Math.sin(progress * Math.PI) * -16, actorFilePaths) : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <clipPath id="leftClip"><rect x="120" y="410" width="410" height="300" rx="22"/></clipPath>
    <clipPath id="rightClip"><rect x="550" y="410" width="410" height="300" rx="22"/></clipPath>
  </defs>
  <rect width="${width}" height="${height}" fill="${videoBg}"/>

  <text x="300" y="${termsY}" text-anchor="middle" font-family="${fontFamily}" font-size="${termFontSize}" font-weight="900" fill="${manifest.leftColor}">${escapeXml(leftTerm)}</text>
  <text x="780" y="${termsY}" text-anchor="middle" font-family="${fontFamily}" font-size="${termFontSize}" font-weight="900" fill="${manifest.rightColor}">${escapeXml(rightTerm)}</text>

  ${illustrationMarkup}

  ${highlightText(scene.text, activeWord, 175, highlightY, highlightWidth, 54, highlightFontSize)}

  ${actorMarkup}
</svg>`;
}

function leftIllustration(imagePaths) {
  if (imagePaths && imagePaths.left) {
    return `<g clip-path="url(#leftClip)">
    <rect x="120" y="410" width="410" height="300" rx="22" fill="#dde8ef"/>
    <image x="120" y="410" width="410" height="300" xlink:href="${imagePaths.left}" preserveAspectRatio="xMidYMid slice"/>
  </g>`;
  }
  return "";
}

function rightIllustration(imagePaths) {
  if (imagePaths && imagePaths.right) {
    return `<g clip-path="url(#rightClip)">
    <rect x="550" y="410" width="410" height="300" rx="22" fill="#d5e8d0"/>
    <image x="550" y="410" width="410" height="300" xlink:href="${imagePaths.right}" preserveAspectRatio="xMidYMid slice"/>
  </g>`;
  }
  return "";
}

function highlightText(text, activeIndex, x, y, maxWidth, lineHeight, customFontSize) {
  const normalized = text.normalize("NFC");
  const words = normalized.split(/\s+/).filter(Boolean);
  const fontSize = customFontSize || manifest.fontSize || 40;
  const activeFontSize = Math.round(fontSize * 1.1);
  const effectiveLineHeight = Math.max(lineHeight || 54, Math.round(fontSize * 1.35));
  const lines = layoutWords(words, maxWidth, fontSize);
  let wordIndex = 0;
  const chunks = [];
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    let cursor = x + (maxWidth - lines[lineIndex].width) / 2;
    for (const word of lines[lineIndex].words) {
      const current = wordIndex === activeIndex;
      const fill = current ? "#3ac6c6" : "#202525";
      chunks.push(`<text x="${cursor}" y="${y + lineIndex * effectiveLineHeight}" font-family="${fontFamily}" font-size="${current ? activeFontSize : fontSize}" font-weight="${current ? 900 : 700}" fill="${fill}">${escapeXml(word.text)}</text>`);
      const actualWordWidth = estimateWidth(word.text, current ? activeFontSize : fontSize);
      cursor += actualWordWidth + 18;
      wordIndex += 1;
    }
  }
  return chunks.join("\n");
}

function layoutWords(words, maxWidth, size) {
  const lines = [];
  let current = { words: [], width: 0 };
  for (const word of words) {
    const width = estimateWidth(word, size);
    const nextWidth = current.words.length ? current.width + 18 + width : width;
    if (nextWidth > maxWidth && current.words.length) {
      lines.push(current);
      current = { words: [], width: 0 };
    }
    current.words.push({ text: word, width });
    current.width = current.words.length === 1 ? width : current.width + 18 + width;
  }
  if (current.words.length) lines.push(current);
  return lines.slice(0, 4);
}

function estimateWidth(word, size) {
  const normalized = word.normalize("NFC");
  let total = 0;
  for (const char of normalized) {
    if ("ijl1!.:;,Itfr/\\|()[]{}".includes(char)) {
      total += 0.32;
    } else if ("mwMW".includes(char)) {
      total += 0.85;
    } else if ("OQGHDCRNKABXYVP".includes(char)) {
      total += 0.72;
    } else if (/[A-Z]/.test(char)) {
      total += 0.68;
    } else if (/[a-z0-9]/.test(char)) {
      total += 0.56;
    } else {
      const isUpper = char === char.toUpperCase() && char !== char.toLowerCase();
      total += isUpper ? 0.72 : 0.58;
    }
  }
  return Math.ceil(total * size);
}

function activeWordIndex(text, progress) {
  const count = text.normalize("NFC").split(/\s+/).filter(Boolean).length;
  return Math.min(count - 1, Math.max(0, Math.floor(progress * count)));
}

function actor(pose, x, y, actorFilePaths) {
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
  const userScale = (manifest.actorScale || 100) / 100;
  const scale = 1.85 * userScale;
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <circle cx="0" cy="0" r="58" fill="#f1bd78" stroke="#202525" stroke-width="6"/>
    <circle cx="-19" cy="-3" r="6" fill="#202525"/><circle cx="19" cy="-3" r="6" fill="#202525"/>
    <path d="M-18 26Q0 38 18 26" fill="none" stroke="#202525" stroke-width="5" stroke-linecap="round"/>
    <rect x="-46" y="62" width="92" height="150" rx="24" fill="#3ac6c6" stroke="#202525" stroke-width="6"/>
    <rect x="-81" y="80" width="26" height="138" rx="13" fill="#202525" transform="rotate(${leftArm} -68 86)"/>
    <rect x="55" y="80" width="26" height="138" rx="13" fill="#202525" transform="rotate(${rightArm} 68 86)"/>
    <rect x="-34" y="205" width="28" height="104" rx="14" fill="#202525" transform="rotate(8 -20 212)"/>
    <rect x="6" y="205" width="28" height="104" rx="14" fill="#202525" transform="rotate(-8 20 212)"/>
  </g>`;
}

function resetDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
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
  const ttsDir = path.join(root, "local-tts", "VieNeu-TTS");
  const pyprojectPath = path.join(ttsDir, "pyproject.toml");

  if (!fs.existsSync(pyprojectPath)) {
    console.log("[render] VieNeu-TTS files missing. Running setup-binaries.js...");
    run("node", [path.join(root, "setup-binaries.js")], root);
  }

  const uvLocalPath = path.join(root, "bin", process.platform === "win32" ? "uv.exe" : "uv");
  if (!fs.existsSync(uvLocalPath)) {
    console.log("[render] uv binary missing. Running setup-binaries.js...");
    run("node", [path.join(root, "setup-binaries.js")], root);
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
