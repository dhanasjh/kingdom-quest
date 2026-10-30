"""Generate small, royalty-free synthesized music and touch sounds for Kingdom Quest."""

from array import array
from math import pi, sin
from pathlib import Path
import wave


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "frontend" / "assets" / "sounds"
RATE = 22050


def midi(note: int) -> float:
    return 440.0 * 2 ** ((note - 69) / 12)


def write_wav(name: str, samples: list[float], peak: float = 0.45) -> None:
    top = max((abs(v) for v in samples), default=1.0) or 1.0
    pcm = array("h", (int(max(-1, min(1, v / top * peak)) * 32767) for v in samples))
    with wave.open(str(OUT / name), "wb") as file:
        file.setnchannels(1)
        file.setsampwidth(2)
        file.setframerate(RATE)
        file.writeframes(pcm.tobytes())


def add_tone(track: list[float], start: float, note: int, duration: float, volume: float, kind: str = "bell") -> None:
    offset = int(start * RATE)
    count = min(int(duration * RATE), len(track) - offset)
    if count <= 0:
        return
    base = midi(note)
    for i in range(count):
        t = i / RATE
        fade_in = min(1.0, t / (0.08 if kind == "pad" else 0.012))
        if kind == "strings":
            # Soft, slow-attack string-like layer with gentle detuning for width.
            fade_in = min(1.0, t / 0.5)
            envelope = fade_in * min(1.0, max(0.0, (duration - t) / 0.7))
            sound = (
                sin(2 * pi * base * t)
                + 0.34 * sin(2 * pi * base * 1.003 * t)
                + 0.18 * sin(2 * pi * base * 2.0 * t)
                + 0.08 * sin(2 * pi * base * 3.01 * t)
            )
        elif kind == "brass":
            # Warm, rounded low brass color for the adventure's harmonic anchor.
            fade_in = min(1.0, t / 0.24)
            envelope = fade_in * min(1.0, max(0.0, (duration - t) / 0.45))
            sound = sin(2 * pi * base * t) + 0.38 * sin(2 * pi * base * 2.0 * t) + 0.14 * sin(2 * pi * base * 3.0 * t)
        elif kind == "pad":
            envelope = fade_in * min(1.0, max(0.0, (duration - t) / 0.22))
            sound = sin(2 * pi * base * t) + 0.24 * sin(2 * pi * base * 2.003 * t)
        elif kind == "mallet":
            # A warm, glassy bell/marimba timbre that reads clearly on phone speakers.
            envelope = fade_in * (1 - t / duration) ** 2.8
            sound = (
                sin(2 * pi * base * t)
                + 0.46 * sin(2 * pi * base * 2.01 * t)
                + 0.20 * sin(2 * pi * base * 3.98 * t)
                + 0.09 * sin(2 * pi * base * 5.43 * t)
            )
        elif kind == "bass":
            envelope = fade_in * (1 - t / duration) ** 2.2
            sound = sin(2 * pi * base * t) + 0.20 * sin(2 * pi * base * 2.0 * t)
        elif kind == "pluck":
            envelope = (1 - t / duration) ** 3.0
            sound = sin(2 * pi * base * t) + 0.32 * sin(2 * pi * base * 2.01 * t) + 0.13 * sin(2 * pi * base * 3.98 * t)
        else:
            envelope = fade_in * (1 - t / duration) ** 2.2
            sound = sin(2 * pi * base * t) + 0.30 * sin(2 * pi * base * 2.01 * t) + 0.12 * sin(2 * pi * base * 3.98 * t)
        track[offset + i] += sound * envelope * volume


def make_loop(filename: str, bpm: int, chords: list[list[int]], melody: list[int | None], volume: float) -> None:
    beat = 60 / bpm
    bars = 8
    duration = beat * 4 * bars
    track = [0.0] * int(duration * RATE)
    for bar in range(bars):
        chord = chords[bar % len(chords)]
        start = bar * beat * 4
        for pitch in chord:
            add_tone(track, start, pitch - 12, beat * 4, volume * 0.20, "pad")
            add_tone(track, start, pitch, beat * 4, volume * 0.045, "pad")
    step = beat / 2
    for index, pitch in enumerate(melody):
        if pitch is not None:
            add_tone(track, index * step, pitch, beat * 0.7, volume * 0.38)
    write_wav(filename, track, 0.48)


def make_startup_fanfare() -> None:
    """Short original, bright orchestral-style game welcome sting."""
    duration = 3.0
    track = [0.0] * int(duration * RATE)
    for start, chord in ((0.0, (48, 55, 60, 64)), (0.82, (53, 60, 65, 69)), (1.68, (55, 62, 67, 71))):
        for pitch in chord:
            add_tone(track, start, pitch, 1.22, 0.28, "pad")
            add_tone(track, start, pitch + 12, 0.9, 0.10, "pad")
    for start, pitch, length in (
        (0.12, 72, 0.48), (0.42, 76, 0.46), (0.76, 79, 0.48),
        (1.08, 84, 0.48), (1.44, 79, 0.42), (1.75, 84, 0.54),
        (2.12, 88, 0.76), (2.42, 91, 0.58),
    ):
        add_tone(track, start, pitch, length, 0.72, "bell")
    write_wav("startup_fanfare.wav", track, 0.42)


def make_kingdom_theme() -> None:
    """An original, cinematic orchestral fantasy theme for the main adventure."""
    bpm = 78
    beat = 60 / bpm
    bars = 8
    track = [0.0] * int(beat * 4 * bars * RATE)
    chords = [
        (55, 59, 62, 67),  # G major / D
        (54, 57, 62, 66),  # D / F-sharp
        (52, 55, 59, 64),  # E minor 7
        (48, 52, 55, 62),  # C add 9
        (50, 55, 59, 62),  # G / B
        (50, 54, 57, 62),  # D
        (48, 52, 55, 60),  # C major
        (50, 55, 59, 62),  # resolve through D back to G
    ]
    melody = (
        ((0.0, 74, 1.55), (1.7, 79, 1.0), (3.0, 81, 0.82)),
        ((0.0, 78, 1.45), (1.65, 74, 0.9), (2.8, 71, 1.0)),
        ((0.0, 76, 1.35), (1.5, 79, 0.9), (2.6, 83, 1.15)),
        ((0.0, 81, 1.3), (1.55, 79, 0.85), (2.65, 76, 1.1)),
        ((0.0, 79, 1.25), (1.45, 83, 0.85), (2.55, 86, 1.2)),
        ((0.0, 85, 1.25), (1.55, 83, 0.85), (2.65, 81, 1.05)),
        ((0.0, 79, 1.2), (1.5, 84, 0.85), (2.6, 83, 1.1)),
        ((0.0, 81, 1.0), (1.15, 79, 1.0), (2.45, 74, 1.4)),
    )
    for bar in range(bars):
        chord = chords[bar]
        start = bar * beat * 4
        for pitch in chord:
            add_tone(track, start, pitch - 12, beat * 4, 0.075, "strings")
            add_tone(track, start, pitch, beat * 4, 0.043, "strings")
        # Slow low-register swells give the progression an orchestral foundation.
        add_tone(track, start, chord[0] - 24, beat * 3.6, 0.12, "brass")
        for beat_offset, pitch, length in melody[bar]:
            add_tone(track, start + beat * beat_offset, pitch, beat * length, 0.19, "strings")
        # Sparse high chimes add a fairytale shimmer without driving the rhythm.
        if bar in (0, 2, 4, 6):
            add_tone(track, start + beat * 3.25, chord[-1] + 12, beat * 0.7, 0.055, "mallet")
    write_wav("music_kingdom.wav", track, 0.34)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    make_startup_fanfare()
    # Bright music-box melody for a cheerful candy-carnival feel.
    make_loop(
        "music_carnival.wav", 94,
        [[60, 64, 67], [65, 69, 72], [57, 60, 64], [67, 71, 74]],
        [72, None, 76, 79, None, 76, 79, 84, 81, None, 79, 76, 74, None, 76, 79,
         72, None, 76, 79, 84, None, 83, 79, 81, 79, 76, None, 74, 76, 72, None,
         79, None, 84, 83, 79, None, 76, 79, 81, None, 84, 88, 86, 84, 81, None,
         79, 76, None, 72, 76, 79, 76, None, 74, None, 72, 76, 72, None, None, None],
        0.7,
    )
    # Softer, slower bell-and-pad loop for winding down between levels.
    make_loop(
        "music_starry.wav", 70,
        [[67, 71, 74], [62, 66, 69], [64, 67, 71], [60, 64, 67]],
        [79, None, 83, None, 86, 83, None, 79, 76, None, 79, 83, None, 81, 79, None,
         74, None, 79, None, 83, 81, 79, None, 76, None, 79, 81, 79, None, None, None,
         79, None, 83, 86, None, 83, 81, None, 79, None, 76, 79, 83, None, 81, None,
         79, 76, None, 74, 76, None, 79, None, 74, None, 71, 74, 79, None, None, None],
        0.55,
    )
    # A mellow enchanted-garden loop and a bright festival parade loop, both original.
    make_loop(
        "music_firefly.wav", 82,
        [[60, 64, 67], [57, 60, 64], [62, 65, 69], [55, 59, 62]],
        [76, None, 79, None, 83, 79, None, 76, 72, None, 76, 79, None, 83, 81, None,
         79, None, 76, 72, 76, None, 79, None, 74, None, 77, 81, 79, None, 76, None,
         72, None, 76, 79, None, 83, 79, None, 81, None, 79, 76, 74, None, 72, None,
         76, 79, None, 83, 86, None, 83, 79, 81, None, 79, 76, 72, None, None, None],
        0.5,
    )
    make_loop(
        "music_festival.wav", 104,
        [[60, 64, 67], [62, 65, 69], [57, 60, 64], [65, 69, 72]],
        [84, 81, 79, None, 76, 79, 81, None, 84, 88, 86, 84, 81, None, 79, None,
         81, 84, 88, None, 86, 84, 81, None, 79, 81, 84, 79, 76, None, 79, None,
         84, 88, 91, None, 88, 86, 84, None, 81, 84, 86, 81, 79, None, 76, None,
         79, 84, 88, None, 86, 84, 81, None, 84, 81, 79, 76, 72, None, None, None],
        0.48,
    )
    # Soft plucky click for pressing a menu or board tile.
    count = int(0.095 * RATE)
    tap = []
    phase = 0.0
    for i in range(count):
        t = i / RATE
        frequency = 1120 - 370 * (i / count)
        phase += 2 * pi * frequency / RATE
        tap.append((sin(phase) + 0.12 * sin(phase * 2)) * (1 - i / count) ** 2)
    write_wav("tap.wav", tap, 0.28)

    # Short original event sounds, designed to be distinct without using recordings.
    spin = []
    phase = 0.0
    for i in range(int(0.72 * RATE)):
        t = i / RATE
        frequency = 420 + 1050 * t
        phase += 2 * pi * frequency / RATE
        env = min(1, t * 8) * max(0, 1 - t / 0.72)
        spin.append((sin(phase) + 0.32 * sin(phase * 1.5)) * env)
    write_wav("festival_spin.wav", spin, 0.36)

    crackle = []
    for i in range(int(0.88 * RATE)):
        t = i / RATE
        env = max(0, 1 - t / 0.88) ** 1.5
        sparkle = sin(2 * pi * (1200 + 900 * t) * t) * 0.28
        pops = (0.8 if (i % 2500) < 80 else 0) + (0.5 if (i % 4100) < 60 else 0)
        crackle.append((sparkle + pops) * env)
    write_wav("festival_firework.wav", crackle, 0.38)

    lamp = [0.0] * int(0.8 * RATE)
    for start, pitch in ((0.02, 84), (0.15, 88), (0.3, 91), (0.46, 96)):
        add_tone(lamp, start, pitch, 0.34, 0.7)
    write_wav("festival_lamp.wav", lamp, 0.34)

    chime = [0.0] * int(0.5 * RATE)
    for start, pitch in ((0.0, 79), (0.07, 84), (0.14, 88)):
        add_tone(chime, start, pitch, 0.25, 0.8)
    write_wav("festival_chime.wav", chime, 0.3)


if __name__ == "__main__":
    main()
