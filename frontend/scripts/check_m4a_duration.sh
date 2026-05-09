#!/usr/bin/env bash
set -euo pipefail

target="${1:-}"
if [[ -z "$target" ]]; then
  target="$(ls -1t debug_recordings/device_test_*.m4a 2>/dev/null | head -n 1 || true)"
fi

if [[ -z "$target" ]]; then
  echo "No .m4a file found in debug_recordings/"
  exit 1
fi

echo "File: $target"
if command -v ffprobe >/dev/null 2>&1; then
  ffprobe -v error -show_entries format=duration,size -of default=nw=1:nk=0 "$target"
else
  echo "ffprobe not installed; install with: sudo apt install ffmpeg"
fi
