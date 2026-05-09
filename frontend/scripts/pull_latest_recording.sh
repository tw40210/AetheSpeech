#!/usr/bin/env bash
set -euo pipefail

PACKAGE_NAME="${1:-com.aethespeech.aethespeech}"
SOURCE_FILE="${2:-}"
OUTPUT_DIR="${3:-debug_recordings}"

mkdir -p "$OUTPUT_DIR"

timestamp="$(date +%Y%m%d_%H%M%S)"
if [[ -z "$SOURCE_FILE" ]]; then
  if adb shell run-as "$PACKAGE_NAME" test -f cache/device_test.m4a; then
    SOURCE_FILE="cache/device_test.m4a"
  elif adb shell run-as "$PACKAGE_NAME" test -f cache/device_test.wav; then
    SOURCE_FILE="cache/device_test.wav"
  else
    echo "No device_test.m4a or device_test.wav found in app cache."
    exit 1
  fi
fi

ext="${SOURCE_FILE##*.}"
output_path="$OUTPUT_DIR/device_test_${timestamp}.${ext}"

adb exec-out run-as "$PACKAGE_NAME" cat "$SOURCE_FILE" > "$output_path"

detected="$(file -b "$output_path" || true)"
if [[ "$detected" == *"RIFF (little-endian) data, WAVE"* ]]; then
  final_path="$OUTPUT_DIR/device_test_${timestamp}.wav"
elif [[ "$detected" == *"ISO Media"* ]] || [[ "$detected" == *"3GPP"* ]]; then
  final_path="$OUTPUT_DIR/device_test_${timestamp}.m4a"
else
  final_path="$OUTPUT_DIR/device_test_${timestamp}.bin"
fi

if [[ "$output_path" != "$final_path" ]]; then
  mv "$output_path" "$final_path"
fi
echo "Saved: $final_path"
echo "Detected format: $detected"
