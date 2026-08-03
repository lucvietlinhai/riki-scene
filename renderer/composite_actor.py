import os
import sys
import math
import json
import argparse
from PIL import Image

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--png-dir", required=True)
    parser.add_argument("--audio-json", required=True)
    parser.add_argument("--actor-files", required=True)
    args = parser.parse_args()

    with open(args.manifest, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    with open(args.audio_json, "r", encoding="utf-8") as f:
        tts = json.load(f)

    actor_files = json.loads(args.actor_files)

    loaded_actors = {}
    TARGET_W = 480
    TARGET_H = 680

    for pose, fpath in actor_files.items():
        if fpath and os.path.exists(fpath):
            try:
                img = Image.open(fpath).convert("RGBA")
                w, h = img.size
                scale = min(TARGET_W / w, TARGET_H / h)
                new_w = max(1, int(w * scale))
                new_h = max(1, int(h * scale))
                img_resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                
                canvas = Image.new("RGBA", (TARGET_W, TARGET_H), (0, 0, 0, 0))
                offset_x = (TARGET_W - new_w) // 2
                offset_y = TARGET_H - new_h
                canvas.paste(img_resized, (offset_x, offset_y), img_resized)
                loaded_actors[pose] = canvas
                print(f"[composite] Prepared actor canvas for pose '{pose}' ({new_w}x{new_h})")
            except Exception as e:
                print(f"[composite] Error loading actor image '{fpath}': {e}")

    if not loaded_actors:
        print("[composite] No valid custom actor images to composite.")
        return

    fps = manifest.get("settings", {}).get("fps", 24)
    items = tts.get("items", [])
    
    frame_no = 1
    for scene_idx, item in enumerate(items):
        scene = manifest["scenes"][scene_idx]
        pose = scene.get("pose", "point-left")
        duration = item.get("duration", 0)
        count = max(1, round(duration * fps))

        actor_canvas = loaded_actors.get(pose)

        for i in range(count):
            frame_filename = f"frame-{frame_no:05d}.png"
            frame_path = os.path.join(args.png_dir, frame_filename)

            if actor_canvas and os.path.exists(frame_path):
                progress = i / max(1, count - 1) if count > 1 else 0.0
                bobbing = math.sin(progress * math.pi) * -16
                
                paste_x = 300
                paste_y = int(1240 + bobbing)

                frame_img = Image.open(frame_path).convert("RGBA")
                frame_img.paste(actor_canvas, (paste_x, paste_y), actor_canvas)
                frame_img.save(frame_path)

            frame_no += 1

    print(f"[composite] Composited custom actor images onto {frame_no - 1} frames successfully.")

if __name__ == "__main__":
    main()
