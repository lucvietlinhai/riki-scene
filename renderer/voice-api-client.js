const fs = require("fs");
const path = require("path");

const API_URL = "https://voice.dinhrinmkt.top/api_member.php";

function loadEnvFile(filePath = path.resolve(__dirname, "..", ".env.local")) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && !process.env[key]) process.env[key] = value;
  }
}

const DEFAULT_DRK_KEY = "drk_4d09a9ddb66ead101af0d93346355bb502c9616f3a2827e2";

function getApiKey(customKey) {
  if (customKey && customKey.trim()) return customKey.trim();
  loadEnvFile();
  return process.env.DRK_API_KEY || DEFAULT_DRK_KEY;
}

const https = require("https");

async function callMemberApi(payload, options = {}) {
  const apiKey = getApiKey(options.apiKey);
  const bodyString = JSON.stringify(payload);

  if (typeof fetch === "function") {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      body: bodyString
    });

    if (options.binary) {
      if (!response.ok) throw new Error(await response.text());
      return Buffer.from(await response.arrayBuffer());
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { ok: response.ok, raw: text };
    }

    if (!response.ok) {
      const message = typeof data === "object" ? JSON.stringify(data) : text;
      if (response.status === 402 || message.includes("402") || message.includes("credit") || message.includes("Không đủ credit")) {
        throw new Error("Giới hạn tạo voice trong ngày với mô hình này đã hết");
      }
      throw new Error(`API ${response.status}: ${message}`);
    }
    return data;
  }

  // Node.js fallback using https
  const parsedUrl = new URL(API_URL);
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: parsedUrl.hostname,
      servername: parsedUrl.hostname,
      family: 4,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: "POST",
      agent: false,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Content-Length": Buffer.byteLength(bodyString)
      }
    };
    const req = https.request(reqOptions, res => {
      const chunks = [];
      res.on("data", chunk => chunks.push(chunk));
      res.on("end", () => {
        const buffer = Buffer.concat(chunks);
        if (options.binary) {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            const errStr = buffer.toString("utf8");
            if (res.statusCode === 402 || errStr.includes("credit") || errStr.includes("Không đủ credit")) {
              reject(new Error("Giới hạn tạo voice trong ngày với mô hình này đã hết"));
            } else {
              reject(new Error(errStr));
            }
          } else {
            resolve(buffer);
          }
          return;
        }
        const text = buffer.toString("utf8");
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          data = { ok: res.statusCode >= 200 && res.statusCode < 300, raw: text };
        }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const message = typeof data === "object" ? JSON.stringify(data) : text;
          if (res.statusCode === 402 || message.includes("402") || message.includes("credit") || message.includes("Không đủ credit")) {
            reject(new Error("Giới hạn tạo voice trong ngày với mô hình này đã hết"));
          } else {
            reject(new Error(`API ${res.statusCode}: ${message}`));
          }
        } else {
          resolve(data);
        }
      });
    });
    req.on("error", reject);
    req.write(bodyString);
    req.end();
  });
}

function credit(options = {}) {
  return callMemberApi({ action: "credit" }, options);
}

function getVoices(modelId, options = {}) {
  const payload = { action: "voices" };
  if (modelId) payload.modelId = modelId;
  return callMemberApi(payload, options);
}

function ttsSubmit({ text, voiceId, modelId = "lingual_speech_v2", config = {} }, options = {}) {
  return callMemberApi({
    action: "tts_submit",
    text,
    voiceId,
    modelId,
    config: {
      speed: 1,
      volume: 1,
      pitch: 1,
      export_srt: false,
      ...config
    }
  }, options);
}

function ttsStatus(ids, options = {}) {
  return callMemberApi({ action: "tts_status", ids: Array.isArray(ids) ? ids : [ids] }, options);
}

function downloadTask(taskId, options = {}) {
  return callMemberApi({ action: "download_task", task_id: taskId }, { ...options, binary: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateSpeechAudio({ text, voiceId, modelId = "capcut_free", config = {} }, options = {}) {
  const submitRes = await ttsSubmit({ text, voiceId, modelId, config }, options);
  if (!submitRes || (!submitRes.ok && submitRes.error)) {
    throw new Error(submitRes?.error || "Gửi tác vụ TTS thất bại");
  }

  const taskId = submitRes.data?.taskId || submitRes.taskId;
  if (!taskId) {
    throw new Error("Không nhận được taskId từ server API");
  }

  const maxAttempts = options.maxAttempts || 40;
  const pollInterval = options.pollInterval || 1500;

  for (let i = 0; i < maxAttempts; i++) {
    const statusRes = await ttsStatus([taskId], options);
    const item = (statusRes.data?.items || statusRes.items || [])[0];
    const status = String(item?.status || "").toLowerCase();

    if (status === "completed") {
      return await downloadTask(taskId, options);
    }
    if (status === "failed" || status === "error") {
      throw new Error(`Tác vụ đọc giọng thất bại: ${JSON.stringify(item)}`);
    }
    await sleep(pollInterval);
  }

  throw new Error(`Tác vụ đọc giọng (taskId: ${taskId}) quá thời gian xử lý (${maxAttempts * pollInterval / 1000}s)`);
}

module.exports = {
  API_URL,
  DEFAULT_DRK_KEY,
  callMemberApi,
  credit,
  getVoices,
  ttsSubmit,
  ttsStatus,
  downloadTask,
  generateSpeechAudio
};

