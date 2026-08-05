import argparse
import re
from pathlib import Path
import wave
import asyncio
import tempfile
import shutil

def partition_text(text: str, default_lang: str = "none"):
    if not text:
        return []
    parts = re.split(r'(\[[^\]]+\])', text)
    segments = []
    for part in parts:
        if not part:
            continue
        if part.startswith('[') and part.endswith(']'):
            content = part[1:-1].strip()
            if content.lower().startswith('ja:'):
                segments.append({"text": content[3:].strip(), "lang": "ja"})
            elif content.lower().startswith('en:'):
                segments.append({"text": content[3:].strip(), "lang": "en"})
            elif content.lower().startswith('zh:'):
                segments.append({"text": content[3:].strip(), "lang": "zh"})
            elif content.lower().startswith('vi:'):
                segments.append({"text": content[3:].strip(), "lang": "vi_online"})
            else:
                if default_lang == "ja":
                    segments.append({"text": content, "lang": "ja"})
                elif default_lang == "en":
                    segments.append({"text": content, "lang": "en"})
                elif default_lang == "zh":
                    segments.append({"text": content, "lang": "zh"})
                elif default_lang == "vi":
                    segments.append({"text": content, "lang": "vi_online"})
                elif default_lang == "none":
                    segments.append({"text": content, "lang": "vi"})
                else:
                    if re.search(r'[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]', content):
                        segments.append({"text": content, "lang": "ja"})
                    elif re.search(r'[a-zA-Z]', content) and not re.search(r'[áàảãạâấầẩẫậăắằẳẵặéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđĐ]', content):
                        segments.append({"text": content, "lang": "en"})
                    else:
                        segments.append({"text": content, "lang": "vi"})
        else:
            segments.append({"text": part, "lang": "vi"})
    return [s for s in segments if s["text"].strip()]

def adjust_wav_speed(wav_path: Path, rate_val: float, ffmpeg_path: str = "ffmpeg"):
    if abs(rate_val - 1.0) < 0.01:
        return
    import subprocess
    temp_wav = wav_path.parent / f"temp-speed-{wav_path.name}"
    try:
        cmd = [
            ffmpeg_path, "-y",
            "-i", str(wav_path),
            "-filter:a", f"atempo={rate_val:.2f}",
            str(temp_wav)
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if res.returncode == 0 and temp_wav.exists():
            shutil.move(str(temp_wav), str(wav_path))
    except Exception:
        pass
    finally:
        if temp_wav.exists():
            try: temp_wav.unlink()
            except Exception: pass

async def generate_edge_tts(text: str, lang: str, out_path: Path, ffmpeg_path: str = "ffmpeg", ja_voice: str = "ja-JP-NanamiNeural", en_voice: str = "en-US-AriaNeural", zh_voice: str = "zh-CN-XiaoxiaoNeural", rate_val: float = 1.0):
    import edge_tts
    import subprocess
    voice_map = {
        "ja": ja_voice or "ja-JP-NanamiNeural",
        "en": en_voice or "en-US-AriaNeural",
        "zh": zh_voice or "zh-CN-XiaoxiaoNeural",
        "vi_online": "vi-VN-HoaiMyNeural"
    }
    voice = voice_map.get(lang, en_voice or "en-US-AriaNeural")
    rate_pct = int(round((rate_val - 1.0) * 100))
    rate_str = f"{rate_pct:+d}%"
    communicate = edge_tts.Communicate(text, voice, rate=rate_str)
    
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
        temp_mp3 = Path(f.name)
        
    try:
        await communicate.save(str(temp_mp3))
        # Convert MP3 to 48kHz mono 16-bit PCM WAV using FFmpeg
        cmd = [
            ffmpeg_path,
            "-y",
            "-i", str(temp_mp3),
            "-ar", "48000",
            "-ac", "1",
            "-c:a", "pcm_s16le",
            str(out_path)
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if res.returncode != 0:
            raise RuntimeError(f"FFmpeg conversion failed: {res.stderr.decode('utf-8', errors='ignore')}")
    finally:
        try:
            temp_mp3.unlink()
        except Exception:
            pass

def concatenate_wavs(wav_paths, output_path):
    if not wav_paths:
        return
    if len(wav_paths) == 1:
        shutil.copy(str(wav_paths[0]), str(output_path))
        return
    data = []
    params = None
    for path in wav_paths:
        with wave.open(str(path), 'rb') as w:
            p = w.getparams()
            if params is None:
                params = p
            data.append(w.readframes(p.nframes))
    with wave.open(str(output_path), 'wb') as w:
        w.setparams(params)
        for d in data:
            w.writeframes(d)

async def main_async():
    parser = argparse.ArgumentParser(description="Preview VieNeu-TTS Voice.")
    parser.add_argument("--voice", default="Minh Đức")
    parser.add_argument("--style", default="tin_tuc")
    parser.add_argument("--text", default="Xin chào, đây là giọng đọc thử nghiệm.")
    parser.add_argument("--out-wav", required=True)
    parser.add_argument("--ffmpeg-path", default="ffmpeg")
    parser.add_argument("--bracket-lang", default="none")
    parser.add_argument("--ja-voice", default="ja-JP-NanamiNeural")
    parser.add_argument("--en-voice", default="en-US-AriaNeural")
    parser.add_argument("--zh-voice", default="zh-CN-XiaoxiaoNeural")
    parser.add_argument("--speech-rate", type=float, default=1.0)
    args = parser.parse_args()

    out_path = Path(args.out_wav)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    segments = partition_text(args.text, default_lang=args.bracket_lang)
    if not segments:
        print("ERROR: Empty text")
        return

    # If only one segment and it is local vi, run synchronously without lazy loading complexity
    if len(segments) == 1 and segments[0]["lang"] == "vi":
        from vieneu import Vieneu
        vieneu = Vieneu(backend="onnx", precision="int8")
        audio = vieneu.infer(segments[0]["text"], voice=args.voice, style=args.style)
        vieneu.save(audio, str(out_path))
        if abs(args.speech_rate - 1.0) >= 0.01:
            adjust_wav_speed(out_path, args.speech_rate, args.ffmpeg_path)
        print(f"SUCCESS:{out_path}")
        return

    temp_wavs = []
    temp_dir = Path(tempfile.mkdtemp())
    vieneu_engine = None

    try:
        for seg_idx, seg in enumerate(segments):
            seg_text = seg["text"].strip()
            lang = seg["lang"]
            seg_wav_path = temp_dir / f"seg-{seg_idx:03}.wav"
            
            if lang == "vi":
                if vieneu_engine is None:
                    from vieneu import Vieneu
                    vieneu_engine = Vieneu(backend="onnx", precision="int8")
                audio = vieneu_engine.infer(seg_text, voice=args.voice, style=args.style)
                vieneu_engine.save(audio, str(seg_wav_path))
                if abs(args.speech_rate - 1.0) >= 0.01:
                    adjust_wav_speed(seg_wav_path, args.speech_rate, args.ffmpeg_path)
                temp_wavs.append(seg_wav_path)
            else:
                try:
                    await generate_edge_tts(seg_text, lang, seg_wav_path, args.ffmpeg_path, ja_voice=args.ja_voice, en_voice=args.en_voice, zh_voice=args.zh_voice, rate_val=args.speech_rate)
                    temp_wavs.append(seg_wav_path)
                except Exception as e:
                    # Fallback to local
                    if vieneu_engine is None:
                        from vieneu import Vieneu
                        vieneu_engine = Vieneu(backend="onnx", precision="int8")
                    audio = vieneu_engine.infer(seg_text, voice=args.voice, style=args.style)
                    vieneu_engine.save(audio, str(seg_wav_path))
                    if abs(args.speech_rate - 1.0) >= 0.01:
                        adjust_wav_speed(seg_wav_path, args.speech_rate, args.ffmpeg_path)
                    temp_wavs.append(seg_wav_path)

        if temp_wavs:
            concatenate_wavs(temp_wavs, out_path)
            print(f"SUCCESS:{out_path}")
        else:
            print("ERROR: Failed to generate audio")
    finally:
        try:
            shutil.rmtree(temp_dir)
        except Exception:
            pass

def main():
    asyncio.run(main_async())

if __name__ == "__main__":
    main()
