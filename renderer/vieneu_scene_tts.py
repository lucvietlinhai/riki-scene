import argparse
import json
import re
from pathlib import Path

from vieneu import Vieneu

def extract_speech_text(text: str) -> str:
    if not text:
        return ""
    t = re.sub(r'(\S+)\[([^\]]+)\]', r'\2', text)
    t = re.sub(r'\[([^\]]+)\]', r'\1', t)
    return t.strip()

def extract_display_text(text: str) -> str:
    if not text:
        return ""
    t = re.sub(r'(\S+)\[([^\]]+)\]', r'\1', text)
    t = re.sub(r'\[([^\]]+)\]', r'\1', t)
    return t.strip()


def main():
    parser = argparse.ArgumentParser(description="Generate one VieNeu-TTS WAV per video scene.")
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--voice", default="Minh Đức")
    parser.add_argument("--style", default="tin_tuc", choices=["tu_nhien", "tin_tuc", "doc_truyen"])
    parser.add_argument("--precision", default="int8", choices=["int8", "fp32"])
    args = parser.parse_args()

    manifest = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    vieneu = Vieneu(backend="onnx", precision=args.precision)
    audio_items = []

    for index, scene in enumerate(manifest["scenes"]):
        raw_text = scene["text"].strip()
        speech_text = scene.get("speechText") or extract_speech_text(raw_text)
        display_text = scene.get("displayText") or extract_display_text(raw_text)

        wav_path = out_dir / f"scene-{index + 1:03}.wav"
        audio = vieneu.infer(speech_text, voice=args.voice, style=args.style)
        vieneu.save(audio, str(wav_path))
        audio_items.append({
            "sceneId": scene.get("id", f"scene-{index + 1}"),
            "index": index,
            "text": display_text,
            "speechText": speech_text,
            "voice": args.voice,
            "style": args.style,
            "sampleRate": 48000,
            "samples": int(len(audio)),
            "duration": round(len(audio) / 48000, 3),
            "wav": str(wav_path)
        })

    metadata = {
        "engine": "VieNeu-TTS",
        "backend": "onnx",
        "precision": args.precision,
        "voice": args.voice,
        "style": args.style,
        "items": audio_items,
        "totalDuration": round(sum(item["duration"] for item in audio_items), 3)
    }
    (out_dir / "tts-scenes.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    print(str(out_dir / "tts-scenes.json"))


if __name__ == "__main__":
    main()
