import argparse
import json
import os
import re
from pathlib import Path
import wave
import asyncio
import tempfile
import shutil
import sys

# Redirect HuggingFace cache to local-tts/.cache on D: drive to prevent disk full error on C:
if "HF_HOME" not in os.environ:
    cache_dir = Path(__file__).parent.parent / "local-tts" / ".cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    os.environ["HF_HOME"] = str(cache_dir)

FEMALE_VOICES = {
    "Trúc Ly", "Ngọc Linh", "Đoan Trang", "Mai Anh", "Thục Đoan", "Thùy Dung", "Ngọc Trân",
    "diem_trinh", "mai_linh", "mai_loan", "my_yen", "ngoc_huyen", "thuc_trinh", "storyvert",
    "NF", "SF"
}

def get_fallback_voice(req_voice: str) -> str:
    if req_voice in FEMALE_VOICES:
        return "Trúc Ly"
    return "Minh Đức"

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

def trim_wav_silence(wav_path: Path, ffmpeg_path: str = "ffmpeg",
                     start_threshold: float = -40.0, end_threshold: float = -40.0,
                     start_duration: float = 0.04, end_duration: float = 0.06):
    """Trim leading and trailing silence from a WAV file using ffmpeg silenceremove."""
    import subprocess
    temp_wav = wav_path.parent / f"trim-{wav_path.name}"
    try:
        filter_chain = (
            f"silenceremove=start_periods=1:start_duration={start_duration}:"
            f"start_threshold={start_threshold}dB:"
            f"stop_periods=-1:stop_duration={end_duration}:"
            f"stop_threshold={end_threshold}dB"
        )
        cmd = [
            ffmpeg_path, "-y",
            "-i", str(wav_path),
            "-af", filter_chain,
            "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le",
            str(temp_wav)
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if res.returncode == 0 and temp_wav.exists() and temp_wav.stat().st_size > 0:
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

def generate_elevenlabs_tts(text: str, voice_id: str, api_key: str, out_path: Path, ffmpeg_path: str = "ffmpeg"):
    import urllib.request
    import urllib.error
    import subprocess

    if not api_key:
        raise ValueError("Missing ElevenLabs API key in render manifest.")

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json",
    }
    payload = json.dumps({
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}
    }).encode("utf-8")

    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
        temp_mp3 = Path(f.name)

    try:
        with urllib.request.urlopen(req) as response:
            temp_mp3.write_bytes(response.read())

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
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="ignore")
        try:
            err_json = json.loads(error_body)
            detail = err_json.get("detail", {}).get("message", error_body)
        except Exception:
            detail = error_body
        raise RuntimeError(f"ElevenLabs API Error {e.code}: {detail}")
    finally:
        try:
            if temp_mp3.exists():
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
    parser = argparse.ArgumentParser(description="Generate hybrid/multilingual WAVs per video scene.")
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--voice", default="Minh Đức")
    parser.add_argument("--style", default="tin_tuc", choices=["tu_nhien", "tin_tuc", "doc_truyen"])
    parser.add_argument("--precision", default="int8", choices=["int8", "fp32"])
    parser.add_argument("--ffmpeg-path", default="ffmpeg")
    parser.add_argument("--vtts-voice", default="NF")
    args = parser.parse_args()

    manifest = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
    engine_name = manifest.get("engine", "vieneu")
    provider_name = manifest.get("provider", "local")
    drk_model_id = manifest.get("modelId", "capcut_free")
    drk_voice_id = manifest.get("voiceId") or manifest.get("voice") or "voice51:0"
    drk_api_key = manifest.get("drkApiKey", "")
    elevenlabs_api_key = manifest.get("elevenlabsApiKey", "")
    kokoro_voice = manifest.get("kokoroVoice", "diem_trinh")
    vtts_voice = manifest.get("vttsVoice") or args.vtts_voice or "NF"
    default_lang = manifest.get("bracketLang", "none")
    ja_voice = manifest.get("jaVoice", "ja-JP-NanamiNeural")
    en_voice = manifest.get("enVoice", "en-US-AriaNeural")
    zh_voice = manifest.get("zhVoice", "zh-CN-XiaoxiaoNeural")
    speech_rate = float(manifest.get("speechRate", 1.0))
    foreign_speech_rate = float(manifest.get("foreignSpeechRate", 1.0))
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

    vtts_engine = None
    def get_vtts():
        nonlocal vtts_engine
        if vtts_engine is None:
            print(f"[render] Initializing v-tts Multi-Speaker engine ({vtts_voice})...")
            import sys
            vtts_dir = Path(__file__).parent.parent / "local-tts" / "v-tts"
            if str(vtts_dir) not in sys.path:
                sys.path.insert(0, str(vtts_dir))
            from infer import VietnameseTTS
            local_appdata = os.environ.get("LOCALAPPDATA", "")
            ckpt_dir = Path(local_appdata) / "v_tts" / "models" / "vits-vietnamese"
            ckpt_path = ckpt_dir / "G.pth"
            config_path = ckpt_dir / "config.json"
            vtts_engine = VietnameseTTS(checkpoint_path=str(ckpt_path), config_path=str(config_path), device="cpu")
        return vtts_engine

    def gen_local_vi(seg_text, seg_wav_path):
        if provider_name == "drk_api" or engine_name == "drk_api":
            print(f"[render]  └─ Synthesizing via DinhrinMKT API ({drk_model_id} / {drk_voice_id})...")
            generate_drk_tts(seg_text, drk_voice_id, drk_model_id, drk_api_key, seg_wav_path, args.ffmpeg_path)
        elif engine_name == "cloud":
            print(f"[render]  └─ Synthesizing online '{seg_text}' using ElevenLabs ({args.voice})...")
            generate_elevenlabs_tts(seg_text, args.voice, elevenlabs_api_key, seg_wav_path, args.ffmpeg_path)
        elif engine_name == "kokoro":
            try:
                import soundfile as sf
                k_engine = get_kokoro()
                audio, _ = k_engine.synthesize(seg_text)
                sf.write(str(seg_wav_path), audio, 24000)
            except Exception as e:
                fb_v = get_fallback_voice(kokoro_voice)
                print(f"[render warn] Kokoro TTS not available ({e}), falling back to VieNeu-TTS ({fb_v})...")
                v_engine = get_vieneu()
                audio = v_engine.infer(seg_text, voice=fb_v, style="tu_nhien")
                v_engine.save(audio, str(seg_wav_path))
        elif engine_name == "vtts":
            try:
                import soundfile as sf
                vt_engine = get_vtts()
                spk = manifest.get("vttsVoice") or args.vtts_voice or "NF"
                audio, sr = vt_engine.synthesize(seg_text, speaker=spk)
                sf.write(str(seg_wav_path), audio, sr)
            except Exception as e:
                fb_v = get_fallback_voice(vtts_voice)
                print(f"[render warn] v-tts Multi-Speaker failed ({e}), falling back to VieNeu-TTS ({fb_v})...")
                v_engine = get_vieneu()
                audio = v_engine.infer(seg_text, voice=fb_v, style="tu_nhien")
                v_engine.save(audio, str(seg_wav_path))
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
                    if len(segments) > 1:
                        trim_wav_silence(seg_wav_path, args.ffmpeg_path)
                    temp_wavs.append(seg_wav_path)
                else:
                    print(f"[render]  └─ Synthesizing online '{seg_text}' using Edge-TTS ({lang})...")
                    try:
                        await generate_edge_tts(seg_text, lang, seg_wav_path, args.ffmpeg_path, ja_voice=ja_voice, en_voice=en_voice, zh_voice=zh_voice, rate_val=foreign_speech_rate)
                        if len(segments) > 1:
                            trim_wav_silence(seg_wav_path, args.ffmpeg_path)
                        temp_wavs.append(seg_wav_path)
                    except Exception as e:
                        print(f"[WARN] Edge-TTS failed for '{seg_text}' ({lang}): {str(e)}")
                        print(f"[render]  └─ Falling back to local offline TTS ({engine_name})...")
                        try:
                            gen_local_vi(seg_text, seg_wav_path)
                            if len(segments) > 1:
                                trim_wav_silence(seg_wav_path, args.ffmpeg_path)
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
