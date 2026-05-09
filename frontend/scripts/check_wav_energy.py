#!/usr/bin/env python3
import audioop
import glob
import os
import sys
import wave
import contextlib


def main() -> int:
    path = sys.argv[1] if len(sys.argv) > 1 else None
    if not path:
        files = [
            p
            for p in glob.glob("debug_recordings/device_test_*.wav")
            if not p.endswith("device_test_latest.wav")
        ]
        files = sorted(files, key=os.path.getmtime)
        if not files:
            print("No wav files found in debug_recordings/")
            return 1
        path = files[-1]

    if not os.path.exists(path):
        print(f"File not found: {path}")
        return 1

    try:
        with contextlib.closing(wave.open(path, "rb")) as w:
            channels = w.getnchannels()
            width = w.getsampwidth()
            rate = w.getframerate()
            frames = w.getnframes()
            data = w.readframes(frames)
    except wave.Error:
        print(f"{path}: not a RIFF/WAV file.")
        print("Hint: run ./scripts/pull_latest_recording.sh and check detected format.")
        return 4

    if not data:
        print(f"{path}: empty audio payload")
        return 2

    rms = audioop.rms(data, width)
    peak = audioop.max(data, width)
    seconds = frames / rate if rate else 0

    print(path)
    print(
        f"channels={channels} rate={rate}Hz duration={seconds:.2f}s "
        f"rms={rms} peak={peak} bytes={len(data)}"
    )

    # Empirical threshold: near-zero RMS means effectively silence.
    if rms < 30 and peak < 300:
        print("Result: likely SILENT capture")
        return 3

    print("Result: audio energy detected (not silent)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
