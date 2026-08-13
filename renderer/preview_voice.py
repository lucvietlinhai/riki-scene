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

def generate_drk_tts(text: str, voice_id: str, model_id: str, api_key: str, out_path: Path, ffmpeg_path: str = "ffmpeg"):
    import urllib.request
    import urllib.error
    import time
    import subprocess

    key = api_key or "drk_4d09a9ddb66ead101af0d93346355bb502c9616f3a2827e2"
    url = "https://voice.dinhrinmkt.top/api_member.php"
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    submit_payload = json.dumps({
        "action": "tts_submit",
        "text": text,
        "voiceId": voice_id or "voice51:0",
        "modelId": model_id or "capcut_free",
        "config": {"speed": 1, "volume": 1, "pitch": 1, "export_srt": False}
    }).encode("utf-8")

    req = urllib.request.Request(url, data=submit_payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            res_data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8', errors='ignore')
        if e.code == 402 or "credit" in err_body.lower() or "không đủ credit" in err_body.lower():
            raise RuntimeError("Giới hạn tạo voice trong ngày với mô hình này đã hết")
        raise RuntimeError(f"DinhrinMKT API HTTP Error {e.code}: {err_body}")

    if not res_data.get("ok") and res_data.get("error"):
        err_msg = str(res_data.get("error"))
        if "credit" in err_msg.lower() or "không đủ credit" in err_msg.lower():
            raise RuntimeError("Giới hạn tạo voice trong ngày với mô hình này đã hết")
        raise RuntimeError(f"DinhrinMKT API Error: {err_msg}")

    task_id = (res_data.get("data") or {}).get("taskId") or res_data.get("taskId")
    if not task_id:
        raise RuntimeError("DinhrinMKT API did not return a valid taskId")

    for _ in range(40):
        status_payload = json.dumps({"action": "tts_status", "ids": [task_id]}).encode("utf-8")
        req = urllib.request.Request(url, data=status_payload, headers=headers, method="POST")
        with urllib.request.urlopen(req) as resp:
            status_data = json.loads(resp.read().decode("utf-8"))
        items = (status_data.get("data") or {}).get("items") or status_data.get("items") or []
        status = items[0].get("status", "").lower() if items else ""
        if status == "completed":
            break
        if status in ["failed", "error"]:
            raise RuntimeError(f"Task {task_id} failed on server: {json.dumps(items)}")
        time.sleep(1.5)
    else:
        raise RuntimeError(f"Task {task_id} timed out polling status")

    dl_payload = json.dumps({"action": "download_task", "task_id": task_id}).encode("utf-8")
    req = urllib.request.Request(url, data=dl_payload, headers=headers, method="POST")
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
        temp_audio = Path(f.name)

    try:
        with urllib.request.urlopen(req) as resp:
            temp_audio.write_bytes(resp.read())

        cmd = [
            ffmpeg_path, "-y",
            "-i", str(temp_audio),
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
            if temp_audio.exists():
                temp_audio.unlink()
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
    parser = argparse.ArgumentParser(description="Preview TTS Voice (VieNeu / Kokoro / DinhrinMKT).")
    parser.add_argument("--engine", default="vieneu", choices=["vieneu", "kokoro", "drk_api"])
    parser.add_argument("--provider", default="local")
    parser.add_argument("--model-id", default="capcut_free")
    parser.add_argument("--voice-id", default="")
    parser.add_argument("--drk-api-key", default="")
    parser.add_argument("--voice", default="Minh Đức")
    parser.add_argument("--kokoro-voice", default="diem_trinh")
    parser.add_argument("--style", default="tin_tuc")
    parser.add_argument("--text", default="Xin chào, đây là giọng đọc thử nghiệm.")
    parser.add_argument("--out-wav", required=True)
    parser.add_argument("--ffmpeg-path", default="ffmpeg")
    parser.add_argument("--bracket-lang", default="none")
    parser.add_argument("--ja-voice", default="ja-JP-NanamiNeural")
    parser.add_argument("--en-voice", default="en-US-AriaNeural")
    parser.add_argument("--zh-voice", default="zh-CN-XiaoxiaoNeural")
    parser.add_argument("--speech-rate", type=float, default=1.0)
    parser.add_argument("--foreign-speech-rate", type=float, default=1.0)
    args = parser.parse_args()

    out_path = Path(args.out_wav)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    if args.provider == "drk_api" or args.engine == "drk_api":
        v_id = args.voice_id or args.voice or "voice51:0"
        generate_drk_tts(args.text, v_id, args.model_id, args.drk_api_key, out_path, args.ffmpeg_path)
        if abs(args.speech_rate - 1.0) >= 0.01:
            adjust_wav_speed(out_path, args.speech_rate, args.ffmpeg_path)
        print(f"SUCCESS:{out_path}")
        return

    segments = partition_text(args.text, default_lang=args.bracket_lang)
    if not segments:
        print("ERROR: Empty text")
        return

    temp_wavs = []
    temp_dir = Path(tempfile.mkdtemp())
    vieneu_ref = [None]
    kokoro_ref = [None]

    def gen_vi(txt, dest_path):
        if args.engine == "kokoro":
            try:
                import soundfile as sf
                if kokoro_ref[0] is None:
                    from kokoro_vietnamese import KokoroVietnamese
                    kokoro_ref[0] = KokoroVietnamese(device="cpu", voice=args.kokoro_voice)
                audio, _ = kokoro_ref[0].synthesize(txt)
                sf.write(str(dest_path), audio, 24000)
            except Exception as e:
                print(f"[warn] Kokoro TTS not available ({e}), falling back to VieNeu-TTS...")
                if vieneu_ref[0] is None:
                    from vieneu import Vieneu
                    vieneu_ref[0] = Vieneu(backend="onnx", precision="int8")
                audio = vieneu_ref[0].infer(txt, voice="Minh Đức", style="tu_nhien")
                vieneu_ref[0].save(audio, str(dest_path))
        else:
            if vieneu_ref[0] is None:
                from vieneu import Vieneu
                vieneu_ref[0] = Vieneu(backend="onnx", precision="int8")
            audio = vieneu_ref[0].infer(txt, voice=args.voice, style=args.style)
            vieneu_ref[0].save(audio, str(dest_path))
        normalize_wav_48k(dest_path, args.ffmpeg_path)
        if abs(args.speech_rate - 1.0) >= 0.01:
            adjust_wav_speed(dest_path, args.speech_rate, args.ffmpeg_path)

    try:
        for seg_idx, seg in enumerate(segments):
            seg_text = seg["text"].strip()
            lang = seg["lang"]
            seg_wav_path = temp_dir / f"seg-{seg_idx:03}.wav"
            
            if lang == "vi":
                gen_vi(seg_text, seg_wav_path)
                temp_wavs.append(seg_wav_path)
            else:
                try:
                    await generate_edge_tts(seg_text, lang, seg_wav_path, args.ffmpeg_path, ja_voice=args.ja_voice, en_voice=args.en_voice, zh_voice=args.zh_voice, rate_val=args.foreign_speech_rate)
                    temp_wavs.append(seg_wav_path)
                except Exception as e:
                    gen_vi(seg_text, seg_wav_path)
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

