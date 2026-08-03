const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
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

main();

function main() {
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

  run("uv", [
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

  writeFrames(tts.items, actorFilePaths, imagePaths);
  console.log("[PROGRESS:65]");

  run("magick", [
    "mogrify",
    "-format", "png",
    "-path", pngDir,
    path.join(frameDir, "frame-*.svg")
  ], root);

  if (Object.keys(actorFilePaths).length > 0) {
    console.log("[render] Compositing custom actor images via Python PIL...");
    run("uv", [
      "run",
      "python",
      path.join(root, "renderer", "composite_actor.py"),
      "--manifest", manifestPath,
      "--png-dir", pngDir,
      "--audio-json", path.join(audioDir, "tts-scenes.json"),
      "--actor-files", JSON.stringify(actorFilePaths)
    ], path.join(root, "local-tts", "VieNeu-TTS"), { PYTHONIOENCODING: "utf-8" });
  }

  console.log("[PROGRESS:82]");

  run("ffmpeg", [
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
  const lines = items.map((item) => `file '${item.wav.replace(/\\/g, "/")}'`);
  fs.writeFileSync(audioListPath, lines.join("\n"), "utf8");
  run("ffmpeg", [
    "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", audioListPath,
    "-c", "copy",
    combinedAudio
  ], root);
}

function writeFrames(items, actorFilePaths, imagePaths) {
  let frameNo = 1;
  for (let sceneIndex = 0; sceneIndex < items.length; sceneIndex += 1) {
    const item = items[sceneIndex];
    const scene = manifest.scenes[sceneIndex];
    const count = Math.max(1, Math.round(item.duration * fps));
    for (let i = 0; i < count; i += 1) {
      const progress = i / Math.max(1, count - 1);
      const svg = makeFrame(scene, sceneIndex, progress, items.length, item.duration, actorFilePaths, imagePaths);
      fs.writeFileSync(path.join(frameDir, `frame-${String(frameNo).padStart(5, "0")}.svg`), svg, "utf8");
      frameNo += 1;
    }
  }
}

function makeFrame(scene, sceneIndex, progress, totalScenes, duration, actorFilePaths, imagePaths) {
  const activeWord = activeWordIndex(scene.text, progress);
  const photoShift = Math.round(Math.sin(progress * Math.PI) * 18);
  const videoBg = manifest.videoBg || "#ffffff";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <clipPath id="leftClip"><rect x="120" y="410" width="410" height="300" rx="22"/></clipPath>
    <clipPath id="rightClip"><rect x="550" y="410" width="410" height="300" rx="22"/></clipPath>
  </defs>
  <rect width="${width}" height="${height}" fill="${videoBg}"/>

  <text x="300" y="382" text-anchor="middle" font-family="${fontFamily}" font-size="56" font-weight="900" fill="${manifest.leftColor}">${escapeXml(manifest.leftTerm)}</text>
  <text x="780" y="382" text-anchor="middle" font-family="${fontFamily}" font-size="56" font-weight="900" fill="${manifest.rightColor}">${escapeXml(manifest.rightTerm)}</text>

  ${leftIllustration(photoShift, imagePaths)}
  ${rightIllustration(-photoShift, imagePaths)}

  ${highlightText(scene.text, activeWord, 175, 900, 730, 54)}

  ${actor(scene.pose, 540, 1380 + Math.sin(progress * Math.PI) * -16, actorFilePaths)}
</svg>`;
}

function leftIllustration(offset, imagePaths) {
  if (imagePaths && imagePaths.left) {
    return `<g clip-path="url(#leftClip)" transform="translate(${offset} 0)">
    <rect x="120" y="410" width="410" height="300" rx="22" fill="#dde8ef"/>
    <image x="120" y="410" width="410" height="300" xlink:href="${imagePaths.left}" preserveAspectRatio="xMidYMid slice"/>
  </g>`;
  }
  return `<g clip-path="url(#leftClip)" transform="translate(${offset} 0)">
    <rect x="120" y="410" width="410" height="300" rx="22" fill="#b9d7ea"/>
    <circle cx="318" cy="525" r="76" fill="#ffffff" opacity=".78"/>
    <circle cx="318" cy="502" r="28" fill="#347a99"/>
    <path d="M260 590c18-47 96-47 116 0" fill="#347a99"/>
    <path d="M160 674c88-112 155-184 262-230" stroke="#202525" stroke-width="18" stroke-linecap="round" opacity=".25"/>
    <circle cx="448" cy="466" r="18" fill="#fff" opacity=".65"/>
    <circle cx="492" cy="606" r="12" fill="#fff" opacity=".58"/>
  </g>`;
}

function rightIllustration(offset, imagePaths) {
  if (imagePaths && imagePaths.right) {
    return `<g clip-path="url(#rightClip)" transform="translate(${offset} 0)">
    <rect x="550" y="410" width="410" height="300" rx="22" fill="#d5e8d0"/>
    <image x="550" y="410" width="410" height="300" xlink:href="${imagePaths.right}" preserveAspectRatio="xMidYMid slice"/>
  </g>`;
  }
  return `<g clip-path="url(#rightClip)" transform="translate(${offset} 0)">
    <rect x="550" y="410" width="410" height="300" rx="22" fill="#cfe0c8"/>
    <circle cx="670" cy="500" r="54" fill="#fff"/>
    <circle cx="842" cy="500" r="54" fill="#fff"/>
    <text x="650" y="522" font-family="${fontFamily}" font-size="82" font-weight="800" fill="#b64020">6</text>
    <text x="822" y="522" font-family="${fontFamily}" font-size="82" font-weight="800" fill="#b64020">9</text>
    <rect x="608" y="594" width="82" height="88" rx="18" fill="#202525"/>
    <circle cx="649" cy="568" r="30" fill="#f1bd78"/>
    <rect x="816" y="594" width="82" height="88" rx="18" fill="#202525"/>
    <circle cx="857" cy="568" r="30" fill="#f1bd78"/>
    <rect x="705" y="660" width="96" height="28" rx="14" fill="#ea622f"/>
  </g>`;
}

function highlightText(text, activeIndex, x, y, maxWidth, lineHeight) {
  const normalized = text.normalize("NFC");
  const words = normalized.split(/\s+/).filter(Boolean);
  const fontSize = 40;
  const activeFontSize = 44;
  const lines = layoutWords(words, maxWidth, fontSize);
  let wordIndex = 0;
  const chunks = [];
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    let cursor = x + (maxWidth - lines[lineIndex].width) / 2;
    for (const word of lines[lineIndex].words) {
      const current = wordIndex === activeIndex;
      const fill = current ? "#3ac6c6" : "#202525";
      chunks.push(`<text x="${cursor}" y="${y + lineIndex * lineHeight}" font-family="${fontFamily}" font-size="${current ? activeFontSize : fontSize}" font-weight="${current ? 900 : 700}" fill="${fill}">${escapeXml(word.text)}</text>`);
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
  const scale = 1.85;
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
