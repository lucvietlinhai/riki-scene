const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const frameDir = path.join(root, "output", "frames-demo");
const pngDir = path.join(root, "output", "png-demo");
const output = path.join(root, "output", "riki-scene-demo.mp4");

if (!fs.existsSync(frameDir)) {
  console.error(`Missing frame folder: ${frameDir}`);
  process.exit(1);
}

fs.mkdirSync(pngDir, { recursive: true });
for (const file of fs.readdirSync(pngDir)) {
  if (file.endsWith(".png")) fs.rmSync(path.join(pngDir, file), { force: true });
}

run("magick", [
  "mogrify",
  "-format", "png",
  "-path", pngDir,
  path.join(frameDir, "frame-*.svg")
]);

run("ffmpeg", [
  "-y",
  "-framerate", "24",
  "-i", path.join(pngDir, "frame-%05d.png"),
  "-vf", "format=yuv420p",
  "-c:v", "libx264",
  "-preset", "medium",
  "-crf", "18",
  "-movflags", "+faststart",
  output
]);

console.log(output);

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: false });
  if (result.status !== 0) process.exit(result.status || 1);
}
