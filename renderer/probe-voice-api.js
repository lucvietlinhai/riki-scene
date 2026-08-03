const fs = require("fs");
const path = require("path");
const { callMemberApi, credit, ttsSubmit } = require("./voice-api-client");

const outDir = path.resolve(__dirname, "..", "output", "voice-probe");
fs.mkdirSync(outDir, { recursive: true });

const candidateVoiceActions = [
  "tts_voices",
  "voices",
  "voice_configs",
  "tts_configs",
  "tts_voice_list",
  "list_voices"
];

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const result = {
    checkedAt: new Date().toISOString(),
    credit: null,
    voiceActions: {},
    ttsSubmit: null
  };

  result.credit = await safeCall("credit", () => credit());

  for (const action of candidateVoiceActions) {
    result.voiceActions[action] = await safeCall(action, () => callMemberApi({ action }));
  }

  const voiceId = readArg("--voiceId");
  const shouldSubmit = process.argv.includes("--submit-test");
  if (shouldSubmit) {
    if (!voiceId) {
      result.ttsSubmit = {
        ok: false,
        error: "Missing --voiceId. Example: node renderer/probe-voice-api.js --submit-test --voiceId YOUR_FREE_VOICE_ID"
      };
    } else {
      result.ttsSubmit = await safeCall("tts_submit", () => ttsSubmit({
        voiceId,
        text: "Day la ban thu giong doc cho du an Riki Scene."
      }));
    }
  }

  const file = path.join(outDir, "voice-api-probe.json");
  fs.writeFileSync(file, JSON.stringify(result, null, 2), "utf8");
  console.log(file);
}

async function safeCall(action, fn) {
  try {
    const data = await fn();
    return { ok: true, data: redact(data) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? "" : process.argv[index + 1] || "";
}

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== "object") return value;
  const copy = {};
  for (const [key, item] of Object.entries(value)) {
    if (/key|token|authorization|secret/i.test(key)) {
      copy[key] = "[redacted]";
    } else {
      copy[key] = redact(item);
    }
  }
  return copy;
}
