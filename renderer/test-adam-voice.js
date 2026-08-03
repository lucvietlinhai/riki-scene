const fs = require("fs");
const path = require("path");
const { ttsSubmit } = require("./voice-api-client");

const configPath = path.resolve(__dirname, "voice-config.json");
const outDir = path.resolve(__dirname, "..", "output", "voice-probe");
const voiceConfig = JSON.parse(fs.readFileSync(configPath, "utf8")).defaultVoice;

fs.mkdirSync(outDir, { recursive: true });

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function main() {
  const text = process.argv.slice(2).join(" ").trim() || "Day la giong Adam cho du an Riki Scene.";
  const response = await ttsSubmit({
    text,
    voiceId: voiceConfig.voiceId,
    modelId: voiceConfig.modelId,
    config: voiceConfig.config
  });

  const file = path.join(outDir, "adam-tts-submit-response.json");
  fs.writeFileSync(file, JSON.stringify(redact(response), null, 2), "utf8");
  console.log(file);
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
