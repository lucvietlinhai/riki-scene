#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const https = require("https");
const { execSync, spawnSync } = require("child_process");

const ROOT = __dirname;
const BIN_DIR = path.join(ROOT, "bin");

console.log("=================================================");
console.log("  Riki Scene — Setup Binaries");
console.log("=================================================");
console.log("");

if (!fs.existsSync(BIN_DIR)) {
  fs.mkdirSync(BIN_DIR, { recursive: true });
}

function getPlatformInfo() {
  const platform = process.platform;
  const arch = process.arch;
  if (platform === "win32") {
    return { target: "x86_64-pc-windows-msvc", ext: "zip", binName: "uv.exe" };
  } else if (platform === "darwin") {
    const t = arch === "arm64" ? "aarch64-apple-darwin" : "x86_64-apple-darwin";
    return { target: t, ext: "tar.gz", binName: "uv" };
  } else {
    return { target: "x86_64-unknown-linux-gnu", ext: "tar.gz", binName: "uv" };
  }
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    function doRequest(reqUrl) {
      https.get(reqUrl, { headers: { "User-Agent": "riki-scene-setup/1.0" } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303) {
          doRequest(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} from ${reqUrl}`));
          return;
        }
        const totalBytes = parseInt(res.headers["content-length"] || "0", 10);
        let downloaded = 0;
        const file = fs.createWriteStream(dest);
        res.on("data", (chunk) => {
          downloaded += chunk.length;
          if (totalBytes > 0) {
            const pct = Math.round((downloaded / totalBytes) * 100);
            process.stdout.write(`\r  Downloading... ${pct}% (${(downloaded / 1024 / 1024).toFixed(1)} MB)  `);
          }
        });
        res.pipe(file);
        file.on("finish", () => { file.close(); process.stdout.write("\n"); resolve(); });
        file.on("error", (err) => { try { fs.unlinkSync(dest); } catch {} reject(err); });
      }).on("error", reject);
    }
    doRequest(url);
  });
}

function extractArchive(archivePath, destDir) {
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  if (process.platform === "win32") {
    execSync(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${destDir}' -Force"`,
      { stdio: "inherit" }
    );
  } else {
    execSync(`tar -xzf "${archivePath}" -C "${destDir}"`, { stdio: "inherit" });
  }
}

function findBinary(dir, binName) {
  function search(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) { const found = search(full); if (found) return found; }
      else if (entry.name === binName) return full;
    }
    return null;
  }
  return search(dir);
}

async function setupUv() {
  const { target, ext, binName } = getPlatformInfo();
  const uvBinPath = path.join(BIN_DIR, binName);

  if (fs.existsSync(uvBinPath)) {
    console.log(`[1/2] uv already installed at: ${uvBinPath}`);
    return uvBinPath;
  }

  const url = `https://github.com/astral-sh/uv/releases/latest/download/uv-${target}.${ext}`;
  const archivePath = path.join(BIN_DIR, `uv-download.${ext}`);
  const extractDir = path.join(BIN_DIR, "_uv-extract");

  console.log(`[1/2] Downloading uv for ${process.platform} / ${process.arch}`);
  console.log(`  Source: ${url}`);

  try {
    await downloadFile(url, archivePath);

    console.log("  Extracting archive...");
    extractArchive(archivePath, extractDir);

    const found = findBinary(extractDir, binName);
    if (!found) throw new Error(`Cannot find ${binName} in extracted archive`);

    fs.copyFileSync(found, uvBinPath);
    if (process.platform !== "win32") fs.chmodSync(uvBinPath, 0o755);

    try { fs.unlinkSync(archivePath); } catch {}
    try { fs.rmSync(extractDir, { recursive: true, force: true }); } catch {}

    console.log(`  ✓ uv ready: ${uvBinPath}`);
    return uvBinPath;
  } catch (err) {
    console.error(`\n  ✗ Failed to install uv: ${err.message}`);
    console.error("  Please install uv manually: https://docs.astral.sh/uv/getting-started/installation/");
    process.exit(1);
  }
}

function setupTTS(uvBinPath) {
  const ttsDir = path.join(ROOT, "local-tts", "VieNeu-TTS");
  const pyprojectPath = path.join(ttsDir, "pyproject.toml");

  if (!fs.existsSync(pyprojectPath)) {
    console.log("  [!] VieNeu-TTS submodule files missing. Attempting git submodule init...");
    try {
      execSync("git submodule update --init --recursive", { cwd: ROOT, stdio: "inherit" });
    } catch (err) {
      console.warn("  Could not auto-run git submodule:", err.message);
    }
  }

  if (!fs.existsSync(pyprojectPath)) {
    console.error(`  ✗ LỖI: Không tìm thấy file pyproject.toml tại ${pyprojectPath}`);
    console.error("  Vui lòng đảm bảo thư mục local-tts/VieNeu-TTS chứa đầy đủ mã nguồn.");
    process.exit(1);
  }

  console.log("[2/2] Setting up Python TTS environment (VieNeu-TTS)...");
  console.log("  This may take a few minutes on first run.");

  const result = spawnSync(uvBinPath, ["sync", "--project", ttsDir, "--directory", ttsDir, "--no-group", "dev", "--no-group", "gpu"], {
    cwd: ttsDir,
    stdio: "inherit",
    env: { ...process.env }
  });

  if (result.status !== 0) {
    console.error(`  ✗ uv sync failed (exit code ${result.status})`);
    process.exit(result.status || 1);
  }

  console.log("  ✓ TTS environment ready.");
}

(async () => {
  try {
    const uvBinPath = await setupUv();
    setupTTS(uvBinPath);

    console.log("");
    console.log("=================================================");
    console.log("  Setup complete! Run: npm start");
    console.log("=================================================");
  } catch (err) {
    console.error("Setup error:", err.message);
    process.exit(1);
  }
})();
