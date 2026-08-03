import argparse
from pathlib import Path
from vieneu import Vieneu

def main():
    parser = argparse.ArgumentParser(description="Preview VieNeu-TTS Voice.")
    parser.add_argument("--voice", default="Minh Đức")
    parser.add_argument("--style", default="tin_tuc")
    parser.add_argument("--text", default="Xin chào, đây là giọng đọc thử nghiệm.")
    parser.add_argument("--out-wav", required=True)
    args = parser.parse_args()

    out_path = Path(args.out_wav)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    vieneu = Vieneu(backend="onnx", precision="int8")
    audio = vieneu.infer(args.text, voice=args.voice, style=args.style)
    vieneu.save(audio, str(out_path))
    print(f"SUCCESS:{out_path}")

if __name__ == "__main__":
    main()
