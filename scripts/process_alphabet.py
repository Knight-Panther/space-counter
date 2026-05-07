"""
Process Georgian alphabet audio files for Space Counter game.

- Trims leading and trailing silence
- Applies same compressor + loudnorm chain as numbers
- Converts to mono MP3 22050Hz
- Outputs to public/audio/letter-{key}.mp3
"""

import subprocess
import os
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

FFMPEG = r"C:\Users\VM-Dev\Desktop\Voice compression\ffmpeg-8.0.1-essentials_build\bin\ffmpeg.exe"
INPUT_DIR = r"C:\Users\VM-Dev\Desktop\game\alphabet"
OUTPUT_DIR = r"C:\Users\VM-Dev\Desktop\Space-counter\public\audio"

CHAR_TO_KEY = {
    'ა': 'letter-a',
    'ბ': 'letter-b',
    'გ': 'letter-g',
    'დ': 'letter-d',
    'ე': 'letter-e',
    'ვ': 'letter-v',
    'ზ': 'letter-z',
    'თ': 'letter-th',
    'ი': 'letter-i',
    'კ': 'letter-k',
    'ლ': 'letter-l',
    'მ': 'letter-m',
    'ნ': 'letter-n',
    'ო': 'letter-o',
    'პ': 'letter-p',
    'ჟ': 'letter-zh',
    'რ': 'letter-r',
    'ს': 'letter-s',
    'ტ': 'letter-t',
    'უ': 'letter-u',
    'ფ': 'letter-ph',
    'ქ': 'letter-q',
    'ღ': 'letter-gh',
    'ყ': 'letter-qh',
    'შ': 'letter-sh',
    'ჩ': 'letter-ch',
    'ც': 'letter-ts',
    'ძ': 'letter-dz',
    'წ': 'letter-tw',
    'ჭ': 'letter-chw',
    'ხ': 'letter-kh',
    'ჯ': 'letter-j',
    'ჰ': 'letter-h',
}

# Same compressor + loudnorm as numbers, with lead/trail silence trim
FILTER = (
    "silenceremove=start_periods=1:start_duration=0.05:start_threshold=-50dB"
    ":stop_periods=-1:stop_duration=0.3:stop_threshold=-40dB,"
    "acompressor=threshold=-18dB:ratio=2:attack=20:release=150:makeup=3,"
    "loudnorm=I=-16:LRA=7:TP=-1.5"
)

errors = []
processed = 0

for filename in sorted(os.listdir(INPUT_DIR)):
    name, ext = os.path.splitext(filename)
    if ext.lower() not in ('.mp3', '.wav'):
        continue
    if name not in CHAR_TO_KEY:
        print(f"WARNING: no mapping for '{name}' ({filename})")
        continue

    audio_key = CHAR_TO_KEY[name]
    input_path = os.path.join(INPUT_DIR, filename)
    output_path = os.path.join(OUTPUT_DIR, f"{audio_key}.mp3")

    cmd = [
        FFMPEG, '-y', '-i', input_path,
        '-af', FILTER,
        '-ac', '1',
        '-ar', '22050',
        '-b:a', '128k',
        output_path
    ]

    print(f"  {filename}  →  {audio_key}.mp3", end=' ... ', flush=True)
    result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if result.returncode != 0:
        print("FAILED")
        errors.append((filename, result.stderr[-300:]))
    else:
        size_kb = os.path.getsize(output_path) // 1024
        print(f"OK ({size_kb} KB)")
        processed += 1

print(f"\n{processed}/{len(CHAR_TO_KEY)} letters processed.")
if errors:
    print("\nErrors:")
    for fname, msg in errors:
        print(f"  {fname}: {msg}")
    sys.exit(1)
