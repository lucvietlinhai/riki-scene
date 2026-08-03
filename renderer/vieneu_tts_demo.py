import argparse
import json
from pathlib import Path

from vieneu import Vieneu


DEFAULT_TEXT = (
    "Đây là bản thử giọng đọc local cho dự án Riki Scene. "
    "Video so sánh sẽ dùng lời thuyết minh này để đồng bộ với từng phân cảnh."
)


def main():
    parser = argparse.ArgumentParser(description="Generate a local Vietnamese TTS WAV with VieNeu-TTS.")
    parser.add_argument("--text", default=DEFAULT_TEXT)
    parser.add_argument("--voice", default="Minh Đức")
    parser.add_argument("--style", default="tin_tuc", choices=["tu_nhien", "tin_tuc", "doc_truyen"])
    parser.add_argument("--output", default="D:/riki-scene/output/vieneu-demo.wav")
    parser.add_argument("--precision", default="int8", choices=["int8", "fp32"])
    args = parser.parse_args()

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)

    vieneu = Vieneu(backend="onnx", precision=args.precision)
    audio = vieneu.infer(args.text, voice=args.voice, style=args.style)
    vieneu.save(audio, str(output))

    meta = {
        "engine": "VieNeu-TTS",
        "backend": "onnx",
        "precision": args.precision,
        "voice": args.voice,
        "style": args.style,
        "sample_rate": 48000,
        "text": args.text,
        "output": str(output),
        "samples": int(len(audio)),
        "duration_seconds": round(len(audio) / 48000, 3),
    }
    output.with_suffix(".json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(str(output))


if __name__ == "__main__":
    main()
