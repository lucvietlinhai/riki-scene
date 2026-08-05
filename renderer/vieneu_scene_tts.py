import argparse
import json
import re
from pathlib import Path
import wave
import asyncio
import tempfile
import shutil
import sys

# Extract speech/display text helpers (for backward compatibility if needed)
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
                    # Auto-detect language
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

def normalize_wav_48k(wav_path: Path, ffmpeg_path: str = "ffmpeg"):
    import subprocess
    try:
        with wave.open(str(wav_path), 'rb') as w:
            if w.getframerate() == 48000 and w.getnchannels() == 1:
                return
    except Exception:
        pass
    temp_wav = wav_path.parent / f"norm48k-{wav_path.name}"
    try:
        cmd = [
            ffmpeg_path, "-y",
            "-i", str(wav_path),
            "-ar", "48000",
            "-ac", "1",
            "-c:a", "pcm_s16le",
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
    parser = argparse.ArgumentParser(description="Generate hybrid/multilingual WAVs per video scene.")
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--voice", default="Minh Đức")
    parser.add_argument("--style", default="tin_tuc", choices=["tu_nhien", "tin_tuc", "doc_truyen"])
    parser.add_argument("--precision", default="int8", choices=["int8", "fp32"])
    parser.add_argument("--ffmpeg-path", default="ffmpeg")
    args = parser.parse_args()

    manifest = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
    engine_name = manifest.get("engine", "vieneu")
    kokoro_voice = manifest.get("kokoroVoice", "diem_trinh")
    default_lang = manifest.get("bracketLang", "none")
    ja_voice = manifest.get("jaVoice", "ja-JP-NanamiNeural")
    en_voice = manifest.get("enVoice", "en-US-AriaNeural")
    zh_voice = manifest.get("zhVoice", "zh-CN-XiaoxiaoNeural")
    speech_rate = float(manifest.get("speechRate", 1.0))
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Lazy-load local engines
    vieneu_engine = None
    def get_vieneu():
        nonlocal vieneu_engine
        if vieneu_engine is None:
            print("[render] Initializing local VieNeu-TTS ONNX engine...")
            from vieneu import Vieneu
            vieneu_engine = Vieneu(backend="onnx", precision=args.precision)
        return vieneu_engine

    kokoro_engine = None
    def get_kokoro():
        nonlocal kokoro_engine
        if kokoro_engine is None:
            print(f"[render] Initializing Kokoro-Vietnamese engine ({kokoro_voice})...")
            from kokoro_vietnamese import KokoroVietnamese
            kokoro_engine = KokoroVietnamese(device="cpu", voice=kokoro_voice)
        return kokoro_engine

    def gen_local_vi(seg_text, seg_wav_path):
        if engine_name == "kokoro":
            import soundfile as sf
            k_engine = get_kokoro()
            audio, _ = k_engine.synthesize(seg_text)
            sf.write(str(seg_wav_path), audio, 24000)
        else:
            v_engine = get_vieneu()
            audio = v_engine.infer(seg_text, voice=args.voice, style=args.style)
            v_engine.save(audio, str(seg_wav_path))
        normalize_wav_48k(seg_wav_path, args.ffmpeg_path)
        if abs(speech_rate - 1.0) >= 0.01:
            adjust_wav_speed(seg_wav_path, speech_rate, args.ffmpeg_path)

    audio_items = []

    for index, scene in enumerate(manifest["scenes"]):
        raw_text = scene["text"].strip()
        
        # Split text into language segments
        segments = partition_text(raw_text, default_lang=default_lang)
        if not segments:
            print(f"[render] Scene {index + 1} has empty text, skipping.")
            continue
            
        print(f"[render] Synthesizing Scene {index + 1}: {raw_text}")
        
        temp_wavs = []
        temp_dir = Path(tempfile.mkdtemp())
        
        try:
            for seg_idx, seg in enumerate(segments):
                seg_text = seg["text"].strip()
                lang = seg["lang"]
                seg_wav_path = temp_dir / f"seg-{seg_idx:03}.wav"
                
                if lang == "vi":
                    gen_local_vi(seg_text, seg_wav_path)
                    temp_wavs.append(seg_wav_path)
                else:
                    # Online Edge-TTS
                    print(f"[render]  └─ Synthesizing online '{seg_text}' using Edge-TTS ({lang})...")
                    try:
                        await generate_edge_tts(seg_text, lang, seg_wav_path, args.ffmpeg_path, ja_voice=ja_voice, en_voice=en_voice, zh_voice=zh_voice, rate_val=speech_rate)
                        temp_wavs.append(seg_wav_path)
                    except Exception as e:
                        print(f"[WARN] Edge-TTS failed for '{seg_text}' ({lang}): {str(e)}")
                        print(f"[render]  └─ Falling back to local offline TTS ({engine_name})...")
                        try:
                            gen_local_vi(seg_text, seg_wav_path)
                            temp_wavs.append(seg_wav_path)
                        except Exception as fallback_err:
                            print(f"[ERROR] Offline fallback failed: {str(fallback_err)}")
                            
            if not temp_wavs:
                print(f"[ERROR] Failed to generate any audio segments for scene {index + 1}")
                continue
                
            wav_path = out_dir / f"scene-{index + 1:03}.wav"
            concatenate_wavs(temp_wavs, wav_path)
            
            with wave.open(str(wav_path), 'rb') as w:
                frames = w.getnframes()
                rate = w.getframerate()
                duration = round(frames / float(rate), 3)
                samples = frames
                
            # Build unified text representations for highlight and subtitle
            display_text = scene.get("displayText", "").strip()
            if not display_text:
                t = re.sub(r'(\S+)\[([^\]]+)\]', r'\1', raw_text)
                t = re.sub(r'\[([^\]]+)\]', r'\1', t)
                display_text = re.sub(r'\s+', ' ', t).strip()
            
            audio_items.append({
                "sceneId": scene.get("id", f"scene-{index + 1}"),
                "index": index,
                "text": display_text,
                "speechText": display_text,
                "voice": args.voice,
                "style": args.style,
                "sampleRate": rate,
                "samples": int(samples),
                "duration": duration,
                "wav": str(wav_path)
            })
            
        finally:
            try:
                shutil.rmtree(temp_dir)
            except Exception:
                pass

    metadata = {
        "engine": "VieNeu-TTS + Edge-TTS",
        "backend": "onnx + online",
        "precision": args.precision,
        "voice": args.voice,
        "style": args.style,
        "items": audio_items,
        "totalDuration": round(sum(item["duration"] for item in audio_items), 3)
    }
    (out_dir / "tts-scenes.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    print(str(out_dir / "tts-scenes.json"))

def main():
    asyncio.run(main_async())

if __name__ == "__main__":
    main()
