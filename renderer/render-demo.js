const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "output");
const frameDir = path.join(outDir, "frames-demo");
const output = path.join(outDir, "riki-scene-demo.mp4");

const width = 1080;
const height = 1920;
const fps = 24;
const scenes = [
  { text: "Day la khach quan.", duration: 2, pose: "point-left" },
  { text: "Day la chu quan.", duration: 2, pose: "point-right" },
  { text: "Su khac nhau la gi?", duration: 2, pose: "think" },
  { text: "Khach quan nhin nhan su viec dung nhu ban chat thuc te dang dien ra.", duration: 4, pose: "point-left" },
  { text: "Chu quan xuat phat tu cam xuc, kinh nghiem va goc nhin rieng.", duration: 4, pose: "point-right" }
];

fs.mkdirSync(frameDir, { recursive: true });
fs.rmSync(frameDir, { recursive: true, force: true });
fs.mkdirSync(frameDir, { recursive: true });

let frame = 1;
for (const [sceneIndex, scene] of scenes.entries()) {
  const frameCount = Math.round(scene.duration * fps);
  for (let i = 0; i < frameCount; i += 1) {
    const progress = i / Math.max(1, frameCount - 1);
    const svg = makeFrame(scene, sceneIndex, progress);
    fs.writeFileSync(path.join(frameDir, `frame-${String(frame).padStart(5, "0")}.svg`), svg);
    frame += 1;
  }
}

const ffmpegArgs = [
  "-y",
  "-framerate", String(fps),
  "-i", path.join(frameDir, "frame-%05d.svg"),
  "-vf", "format=yuv420p",
  "-c:v", "libx264",
  "-preset", "medium",
  "-crf", "18",
  "-movflags", "+faststart",
  output
];

const result = spawnSync("ffmpeg", ffmpegArgs, { stdio: "inherit" });
if (result.status !== 0) {
  process.exit(result.status || 1);
}

console.log(output);

function makeFrame(scene, sceneIndex, progress) {
  const leftColor = "#b92c1e";
  const rightColor = "#6f9f42";
  const textLines = wrapText(scene.text, 31);
  const breathe = Math.sin(progress * Math.PI) * 14;
  const leftZoom = 1 + Math.sin(progress * Math.PI) * 0.035;
  const rightZoom = 1 + Math.cos(progress * Math.PI) * 0.025;
  const markerX = 120 + (840 * sceneIndex) / Math.max(1, scenes.length - 1);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <clipPath id="leftClip"><rect x="120" y="410" width="410" height="300" rx="18"/></clipPath>
    <clipPath id="rightClip"><rect x="550" y="410" width="410" height="300" rx="18"/></clipPath>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#202525" flood-opacity=".18"/>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" fill="#f6f4ef"/>
  <rect x="75" y="100" width="930" height="1640" rx="54" fill="#ece5d8" filter="url(#shadow)"/>
  <rect x="105" y="130" width="870" height="1580" rx="42" fill="#f1eadf"/>
  <path d="M105 130H975V430C748 358 488 365 105 458Z" fill="#fffdfa" opacity=".62"/>

  <text x="280" y="302" text-anchor="middle" font-family="Arial, sans-serif" font-size="64" font-weight="900" fill="${leftColor}">Khach quan</text>
  <text x="760" y="302" text-anchor="middle" font-family="Arial, sans-serif" font-size="64" font-weight="900" fill="${rightColor}">Chu quan</text>

  <rect x="120" y="410" width="410" height="300" rx="18" fill="#b9d7ea"/>
  <g clip-path="url(#leftClip)" transform="translate(${(1 - leftZoom) * 325} ${(1 - leftZoom) * 560}) scale(${leftZoom})">
    <rect x="120" y="410" width="410" height="300" fill="#b9d7ea"/>
    <circle cx="316" cy="524" r="74" fill="#ffffff" opacity=".78"/>
    <circle cx="316" cy="503" r="27" fill="#347a99"/>
    <path d="M258 588c18-45 95-45 114 0" fill="#347a99"/>
    <path d="M152 680c88-116 158-189 263-234" stroke="#202525" stroke-width="18" stroke-linecap="round" opacity=".26"/>
    <circle cx="452" cy="462" r="17" fill="#fff" opacity=".65"/>
    <circle cx="490" cy="604" r="12" fill="#fff" opacity=".58"/>
  </g>

  <rect x="550" y="410" width="410" height="300" rx="18" fill="#cfe0c8"/>
  <g clip-path="url(#rightClip)" transform="translate(${(1 - rightZoom) * 755} ${(1 - rightZoom) * 560}) scale(${rightZoom})">
    <rect x="550" y="410" width="410" height="300" fill="#cfe0c8"/>
    <circle cx="670" cy="500" r="54" fill="#fff"/>
    <circle cx="842" cy="500" r="54" fill="#fff"/>
    <text x="650" y="522" font-family="Arial, sans-serif" font-size="82" fill="#b64020">6</text>
    <text x="822" y="522" font-family="Arial, sans-serif" font-size="82" fill="#b64020">9</text>
    <rect x="608" y="594" width="82" height="88" rx="18" fill="#202525"/>
    <circle cx="649" cy="568" r="30" fill="#f1bd78"/>
    <rect x="816" y="594" width="82" height="88" rx="18" fill="#202525"/>
    <circle cx="857" cy="568" r="30" fill="#f1bd78"/>
    <rect x="705" y="660" width="96" height="28" rx="14" fill="#ea622f"/>
  </g>

  <g font-family="Arial, sans-serif" font-weight="900" font-size="58" fill="#202525" text-anchor="middle">
    ${textLines.map((line, index) => `<text x="540" y="${840 + index * 70}">${escapeXml(line)}</text>`).join("")}
  </g>

  ${actor(scene.pose, 540, 1240 - breathe)}

  <rect x="120" y="1610" width="840" height="18" rx="9" fill="#d9ded8"/>
  <rect x="120" y="1610" width="${Math.max(40, 840 * ((sceneIndex + progress) / scenes.length))}" height="18" rx="9" fill="#347a99"/>
  <circle cx="${markerX}" cy="1619" r="18" fill="#ea622f"/>
  <text x="540" y="1688" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="800" fill="#68706c">Scene ${sceneIndex + 1}/${scenes.length} - ${scene.duration}s - ${fps}fps</text>
</svg>`;
}

function actor(pose, x, y) {
  const leftArm = pose === "point-left" ? -128 : 26;
  const rightArm = pose === "point-right" ? 128 : pose === "think" ? -74 : -30;
  const bubble = pose === "point-left" ? "chi trai" : pose === "point-right" ? "chi phai" : pose === "think" ? "thac mac" : "cuoi nhe";
  return `<g transform="translate(${x} ${y})">
    <rect x="-66" y="-88" width="132" height="38" rx="19" fill="#fffdfa" stroke="#d9ded8"/>
    <text x="0" y="-62" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="900" fill="#347a99">${bubble}</text>
    <circle cx="0" cy="0" r="58" fill="#f1bd78" stroke="#202525" stroke-width="6"/>
    <circle cx="-19" cy="-3" r="6" fill="#202525"/><circle cx="19" cy="-3" r="6" fill="#202525"/>
    <path d="M-18 26Q0 38 18 26" fill="none" stroke="#202525" stroke-width="5" stroke-linecap="round"/>
    <rect x="-46" y="62" width="92" height="150" rx="24" fill="#347a99" stroke="#202525" stroke-width="6"/>
    <rect x="-81" y="80" width="26" height="138" rx="13" fill="#202525" transform="rotate(${leftArm} -68 86)"/>
    <rect x="55" y="80" width="26" height="138" rx="13" fill="#202525" transform="rotate(${rightArm} 68 86)"/>
    <rect x="-34" y="205" width="28" height="104" rx="14" fill="#202525" transform="rotate(8 -20 212)"/>
    <rect x="6" y="205" width="28" height="104" rx="14" fill="#202525" transform="rotate(-8 20 212)"/>
  </g>`;
}

function wrapText(text, max) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

function escapeXml(value) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[char]));
}
