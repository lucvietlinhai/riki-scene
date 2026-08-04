import argparse
import re
from pathlib import Path
from vieneu import Vieneu

def extract_speech_text(text: str) -> str:
    if not text:
        return ""
    t = re.sub(r'(\S+)\[([^\]]+)\]', r'\2', text)
    t = re.sub(r'\[([^\]]+)\]', r'\1', t)
    return t.strip()

def main():
    parser = argparse.ArgumentParser(description="Preview VieNeu-TTS Voice.")
    parser.add_argument("--voice", default="Minh Đức")
    parser.add_argument("--style", default="tin_tuc")
    parser.add_argument("--text", default="Xin chào, đây là giọng đọc thử nghiệm.")
    parser.add_argument("--out-wav", required=True)
    args = parser.parse_args()

    out_path = Path(args.out_wav)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    speech_text = extract_speech_text(args.text)
    vieneu = Vieneu(backend="onnx", precision="int8")
    audio = vieneu.infer(speech_text, voice=args.voice, style=args.style)
    vieneu.save(audio, str(out_path))
    print(f"SUCCESS:{out_path}")

if __name__ == "__main__":
    main()
