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

function getApiKey() {
  loadEnvFile();
  const key = process.env.DRK_API_KEY;
  if (!key) {
    throw new Error("Missing DRK_API_KEY. Create D:\\riki-scene\\.env.local from .env.example.");
  }
  return key;
}

async function callMemberApi(payload, options = {}) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`
    },
    body: JSON.stringify(payload)
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
    throw new Error(`API ${response.status}: ${message}`);
  }
  return data;
}

function credit() {
  return callMemberApi({ action: "credit" });
}

function ttsSubmit({ text, voiceId, modelId = "lingual_speech_v2", config = {} }) {
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
  });
}

module.exports = {
  API_URL,
  callMemberApi,
  credit,
  ttsSubmit
};
