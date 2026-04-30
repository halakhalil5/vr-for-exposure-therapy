#!/usr/bin/env python3
"""Local Whisper transcription helper.

Usage:
    python transcribe.py path/to/audio.webm

Prints JSON to stdout:
    {"text": "transcribed speech"}
"""

import json
import os
import shutil
import sys
from pathlib import Path


def add_bundled_ffmpeg_to_path():
    """Use Python-packaged FFmpeg when system ffmpeg is not on PATH.

    OpenAI Whisper invokes an executable named "ffmpeg". The imageio-ffmpeg
    package ships a versioned .exe on Windows, so we copy it once to a local
    ffmpeg.exe shim folder and prepend that folder to PATH.
    """
    try:
        import imageio_ffmpeg
    except ImportError:
        raise RuntimeError(
            "FFmpeg was not found and imageio-ffmpeg is not installed. "
            "Run: python -m pip install -r requirements-whisper.txt"
        )

    ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
    shim_dir = Path(__file__).resolve().parent / ".ffmpeg-bin"
    shim_dir.mkdir(exist_ok=True)

    shim_name = "ffmpeg.exe" if os.name == "nt" else "ffmpeg"
    shim_path = shim_dir / shim_name

    if not shim_path.exists():
        shutil.copyfile(ffmpeg_path, shim_path)

    os.environ["PATH"] = str(shim_dir) + os.pathsep + os.environ.get("PATH", "")


def main():
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Audio file path argument is required"}))
        return 1

    audio_path = sys.argv[1]

    try:
        import whisper
    except ImportError:
        print(json.dumps({
            "error": "Missing Python package: openai-whisper. Install it with pip install openai-whisper."
        }))
        return 1

    try:
        add_bundled_ffmpeg_to_path()
        model = whisper.load_model("base")
        # CPU machines cannot use FP16; setting fp16=False avoids noisy warnings
        # that can obscure the real error message in the Node.js caller.
        result = model.transcribe(audio_path, fp16=False)
        text = (result.get("text") or "").strip()
        print(json.dumps({"text": text}, ensure_ascii=True))
        return 0
    except Exception as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=True))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
