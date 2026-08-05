const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");

const ROOT = path.resolve(__dirname);
const OUTPUT_DIR = path.join(ROOT, "output");
const ffmpegPath = (() => { try { return require("ffmpeg-static"); } catch { return "ffmpeg"; } })();

let mainWindow = null;
let activeRender = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 960,
    minWidth: 900,
    minHeight: 600,
    title: "Riki Scene — xưởng giọng đọc local",
    backgroundColor: "#f7f5ef",
    webPreferences: {
      preload: path.join(ROOT, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(ROOT, "prototype-v4", "index.html"));
  mainWindow.on("closed", () => { mainWindow = null; });
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => { if (!mainWindow) createWindow(); });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("dialog:show-save", async (_event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: options.title || "Lưu video",
    defaultPath: options.defaultPath || path.join(OUTPUT_DIR, "riki-scene-output.mp4"),
    filters: options.filters || [{ name: "MP4 Video", extensions: ["mp4"] }],
  });
  return result;
});

function ensureTTSEnvironment() {
  const ttsDir = path.join(ROOT, "local-tts", "VieNeu-TTS");
  const pyprojectPath = path.join(ttsDir, "pyproject.toml");
  const uvBin = path.join(ROOT, "bin", process.platform === "win32" ? "uv.exe" : "uv");

  if (!fs.existsSync(uvBin) || !fs.existsSync(pyprojectPath) || !fs.existsSync(path.join(ttsDir, ".venv"))) {
    console.log("[Electron] Auto-installing VieNeu-TTS environment...");
    const setupScript = path.join(ROOT, "setup-binaries.js");
    spawnSync("node", [setupScript], { cwd: ROOT, stdio: "inherit" });
  } else {
    const check = spawnSync(uvBin, ["run", "--project", ttsDir, "python", "-c", "import vieneu"], {
      cwd: ttsDir,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      shell: false
    });
    if (check.status !== 0) {
      console.log("[Electron] vieneu module missing in Python venv. Auto-syncing...");
      spawnSync(uvBin, ["sync", "--project", ttsDir, "--directory", ttsDir, "--no-group", "dev", "--no-group", "gpu"], {
        cwd: ttsDir,
        stdio: "inherit",
        env: { ...process.env }
      });
    }
  }
  return fs.existsSync(uvBin) ? uvBin : "uv";
}


ipcMain.handle("voice:preview", async (_event, { engine, voice, kokoroVoice, style, text, bracketLang, jaVoice, enVoice, zhVoice, speechRate }) => {
  const sampleText = text || `Xin chào, đây là giọng đọc thử nghiệm!`;
  const outWav = path.join(os.tmpdir(), `voice-preview-${Date.now()}.wav`);

  const cmd = ensureTTSEnvironment();
  const scriptPath = path.join(ROOT, "renderer", "preview_voice.py");
  const cwdDir = path.join(ROOT, "local-tts", "VieNeu-TTS");

  const spawnArgs = [
    "run",
    "python",
    scriptPath,
    "--engine", engine || "vieneu",
    "--voice", voice || "Minh Đức",
    "--kokoro-voice", kokoroVoice || "diem_trinh",
    "--style", style || "tin_tuc",
    "--text", sampleText,
    "--out-wav", outWav,
    "--ffmpeg-path", ffmpegPath,
    "--bracket-lang", bracketLang || "none",
    "--ja-voice", jaVoice || "ja-JP-NanamiNeural",
    "--en-voice", enVoice || "en-US-AriaNeural",
    "--zh-voice", zhVoice || "zh-CN-XiaoxiaoNeural",
    "--speech-rate", String(speechRate || 1.0)
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(cmd, spawnArgs, {
      cwd: cwdDir,
      env: { ...process.env, PYTHONIOENCODING: "utf-8", NLTK_DISABLE_IMPORT_SECURITY: "1" }
    });

    child.on("close", (code) => {
      if (code === 0 && fs.existsSync(outWav)) {
        try {
          const buffer = fs.readFileSync(outWav);
          const base64 = buffer.toString("base64");
          try { fs.unlinkSync(outWav); } catch {}
          resolve({ success: true, audio: `data:audio/wav;base64,${base64}` });
        } catch (err) {
          resolve({ success: false, error: err.message });
        }
      } else {
        resolve({ success: false, error: `Process exited with code ${code}` });
      }
    });

    child.on("error", (err) => {
      resolve({ success: false, error: err.message });
    });
  });
});

ipcMain.on("render:start", (event, config) => {
  if (activeRender) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("render:log", { type: "warn", text: "Đang có tiến trình render. Vui lòng chờ." });
    }
    return;
  }

  const configPath = path.join(os.tmpdir(), `riki-config-${Date.now()}.json`);
  const outputFile = config.outputPath || path.join(OUTPUT_DIR, `${config.videoName || "riki-scene-output"}.mp4`);

  const resolvedActorImages = {};
  if (config.actorImages) {
    for (const [pose, val] of Object.entries(config.actorImages)) {
      if (val) {
        if (val.startsWith("data:image/")) {
          resolvedActorImages[pose] = val;
        } else if (val.startsWith("../") || val.startsWith("./")) {
          resolvedActorImages[pose] = path.resolve(ROOT, "prototype-v4", val);
        } else {
          resolvedActorImages[pose] = val;
        }
      }
    }
  }

  const manifest = {
    settings: { width: 1080, height: 1920, fps: 24, format: "9:16" },
    engine: config.engine || "vieneu",
    title: `${config.leftTerm} và ${config.rightTerm}`,
    leftTerm: config.leftTerm || "Trái",
    rightTerm: config.rightTerm || "Phải",
    leftColor: config.leftColor || "#b92c1e",
    rightColor: config.rightColor || "#5d9a4d",
    leftImage: config.leftImage || "",
    rightImage: config.rightImage || "",
    voice: config.voice || "Minh Đức",
    kokoroVoice: config.kokoroVoice || "diem_trinh",
    style: config.style || "tin_tuc",
    highlight: config.highlight || "word",
    fontSize: config.fontSize || 40,
    actorScale: config.actorScale || 100,
    fontFamily: config.fontFamily || "Segoe UI, Arial, sans-serif",
    outputPath: outputFile,
    videoBg: config.videoBg || "#ffffff",
    actorImages: resolvedActorImages,
    bracketLang: config.bracketLang || "none",
    jaVoice: config.jaVoice || "ja-JP-NanamiNeural",
    enVoice: config.enVoice || "en-US-AriaNeural",
    zhVoice: config.zhVoice || "zh-CN-XiaoxiaoNeural",
    speechRate: config.speechRate || 1.0,
    scenes: (config.scenes || []).map((item, i) => ({
      id: `scene-${i + 1}`,
      text: item.text,
      pose: item.pose || "point-left",
      leftTerm: item.leftTerm || config.leftTerm || "Trái",
      rightTerm: item.rightTerm || config.rightTerm || "Phải",
      leftImage: item.leftImage || config.leftImage || "",
      rightImage: item.rightImage || config.rightImage || "",
    })),
  };

  try {
    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  } catch {}
  fs.writeFileSync(configPath, JSON.stringify(manifest, null, 2), "utf8");

  const rendererScript = path.join(ROOT, "renderer", "render-vieneu-highlight.js");

  const send = (type, text) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("render:log", { type, text });
    }
  };

  const sendProgress = (pct) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("render:progress", pct);
    }
  };

  const activeVoiceLabel = manifest.engine === "kokoro" ? `Kokoro (${manifest.kokoroVoice})` : `${manifest.voice} · ${manifest.style}`;
  send("info", `Bắt đầu render: ${manifest.scenes.length} cảnh · ${activeVoiceLabel}`);
  send("info", `Output: ${outputFile}`);

  const child = spawn("node", [rendererScript, "--config", configPath], {
    cwd: ROOT,
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
    shell: false,
  });

  activeRender = child;

  const progressRegex = /\[PROGRESS:(\d+)\]/;

  child.stdout.on("data", (data) => {
    data.toString().split(/\r?\n/).filter(Boolean).forEach((line) => {
      const match = line.match(progressRegex);
      if (match) {
        sendProgress(parseInt(match[1], 10));
      } else {
        send("out", line);
      }
    });
  });

  child.stderr.on("data", (data) => {
    data.toString().split(/\r?\n/).filter(Boolean).forEach((line) => send("out", line));
  });

  child.on("close", (code) => {
    activeRender = null;
    try { fs.unlinkSync(configPath); } catch {}

    if (code === 0) {
      sendProgress(100);
      send("done", outputFile);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("render:done", { success: true, outputFile });
      }
    } else {
      send("error", `Render thất bại với exit code ${code}`);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("render:done", { success: false, code });
      }
    }
  });

  child.on("error", (err) => {
    activeRender = null;
    send("error", `Không thể khởi động renderer: ${err.message}`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("render:done", { success: false, error: err.message });
    }
  });
});

ipcMain.on("render:cancel", () => {
  if (activeRender) {
    activeRender.kill("SIGTERM");
    activeRender = null;
  }
});

ipcMain.on("render:open-output", (_event, filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    shell.showItemInFolder(filePath);
  } else {
    shell.openPath(OUTPUT_DIR);
  }
});
