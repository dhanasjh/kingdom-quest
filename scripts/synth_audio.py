import numpy as np, wave, os

SR = 22050
OUT = "/app/frontend/assets/sounds"
os.makedirs(OUT, exist_ok=True)

def save(name, x, peak=0.8):
    x = np.asarray(x, dtype=np.float64)
    m = np.max(np.abs(x)) or 1
    x = x / m * peak
    d = (x * 32767).astype(np.int16)
    with wave.open(f"{OUT}/{name}.wav", "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(d.tobytes())

def t(dur): return np.arange(int(SR * dur)) / SR
def env(n, a=0.005, decay=8.0):
    tt = np.arange(n) / SR
    e = np.exp(-tt * decay)
    an = max(1, int(a * SR)); e[:an] *= np.linspace(0, 1, an)
    return e
def bell(f, dur, decay=6.0, harm=(1, 0.4, 0.15)):
    tt = t(dur)
    s = sum(h * np.sin(2 * np.pi * f * (i + 1) * tt) for i, h in enumerate(harm))
    return s * env(len(tt), decay=decay)
def note(n): return 440 * 2 ** ((n - 69) / 12)
def mix(*parts):
    L = max(len(p) for p, _ in parts)
    out = np.zeros(L)
    for p, off in parts:
        o = int(off * SR); out[o:o + len(p)] += p[: L - o]
    return out

# pop: quick pitch-dropping bubble
tt = t(0.14)
f = 900 * np.exp(-tt * 18) + 300
pop = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(tt), 0.002, 30)
save("pop", pop)

# swap: soft whoosh tick
tt = t(0.09)
swap = (np.random.randn(len(tt)) * 0.3 + np.sin(2 * np.pi * 520 * tt)) * env(len(tt), 0.003, 40)
save("swap", swap, 0.5)

# invalid: two low boops
inv = mix((bell(220, 0.12, 25, (1, 0.2)), 0), (bell(180, 0.16, 20, (1, 0.2)), 0.1))
save("invalid", inv, 0.6)

# combo chimes (rising)
for i, base in enumerate([76, 79, 83, 86]):
    c = mix((bell(note(base), 0.5, 7), 0), (bell(note(base + 7), 0.5, 7), 0.06))
    save(f"combo{i + 1}", c, 0.7)

# special: boom + sparkle
tt = t(0.5)
boom = np.sin(2 * np.pi * np.cumsum(120 * np.exp(-tt * 6) + 40) / SR) * env(len(tt), 0.002, 7)
noise = np.random.randn(len(tt)) * env(len(tt), 0.001, 14) * 0.4
spark = mix((boom + noise, 0), (bell(note(91), 0.4, 9) * 0.4, 0.05), (bell(note(96), 0.4, 9) * 0.3, 0.12))
save("special", spark, 0.85)

# win: major arpeggio
win = mix(*[(bell(note(n), 0.9, 4), i * 0.11) for i, n in enumerate([72, 76, 79, 84, 88])])
save("win", win, 0.75)

# lose: descending minor
lose = mix(*[(bell(note(n), 0.8, 4, (1, 0.3)), i * 0.18) for i, n in enumerate([72, 68, 65, 60])])
save("lose", lose, 0.65)

# restore: sparkle glissando
restore = mix(*[(bell(note(n), 0.6, 6), i * 0.05) for i, n in enumerate([79, 83, 86, 88, 91, 95, 98])])
save("restore", restore, 0.7)

# coin
coin = mix((bell(note(88), 0.25, 14), 0), (bell(note(93), 0.35, 10), 0.07))
save("coin", coin, 0.6)

# hammer: thunk
tt = t(0.25)
th = np.sin(2 * np.pi * np.cumsum(260 * np.exp(-tt * 20) + 80) / SR) * env(len(tt), 0.001, 16)
save("hammer", th + np.random.randn(len(tt)) * env(len(tt), 0.001, 40) * 0.5, 0.8)

# ---------- gentle fantasy music loop ----------
bpm = 72
beat = 60 / bpm
bars = 8
L = int(SR * beat * 4 * bars)
music = np.zeros(L)

def add_circ(sig, start):
    s = int(start * SR) % L
    n = len(sig)
    end = s + n
    if end <= L: music[s:end] += sig
    else:
        music[s:] += sig[: L - s]
        rem = sig[L - s:]
        music[: len(rem)] += rem[:L]

def pad(freqs, dur):
    tt = t(dur)
    s = sum(np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * f * 2.003 * tt) for f in freqs)
    a = np.minimum(1, tt / 0.8) * np.minimum(1, (dur - tt) / 0.8 + 0.0)
    return s * np.clip(a, 0, 1) * (1 + 0.15 * np.sin(2 * np.pi * 0.3 * tt))

# C - Am - F - G  (x2), each chord 1 bar
chords = [[48, 55, 64], [45, 52, 60], [41, 48, 57], [43, 50, 59]] * 2
for i, ch in enumerate(chords):
    add_circ(pad([note(n) for n in ch], beat * 4 + 0.8) * 0.12, i * beat * 4 - 0.4)
    # soft bass
    add_circ(bell(note(ch[0] - 12), beat * 4, 1.2, (1, 0.25)) * 0.25, i * beat * 4)

# music-box melody (pentatonic), eighth-note grid
mel = [
    76, None, 79, None, 81, 79, 76, None,  72, None, 74, 76, 74, None, None, None,
    72, None, 76, None, 77, 76, 72, None,  74, None, 79, None, 77, 76, 74, None,
    76, None, 79, None, 84, 83, 81, None,  79, None, 76, 79, 81, None, None, None,
    77, None, 76, None, 74, 72, 74, None,  72, None, None, None, 67, None, None, None,
]
for i, n in enumerate(mel):
    if n is None: continue
    add_circ(bell(note(n), 1.6, 2.8, (1, 0.5, 0.2, 0.1)) * 0.22, i * beat / 2)
    add_circ(bell(note(n + 12), 1.2, 4, (1,)) * 0.05, i * beat / 2 + 0.01)

# soft sparkle every 2 bars
for b in range(0, bars, 2):
    add_circ(bell(note(96), 1.5, 3) * 0.04, b * beat * 4 + beat * 3.5)

save("music", music, 0.55)
print("ok", L / SR)

# cheer: bright rising fanfare + sparkle
cheer = mix(*[(bell(note(n), 0.7, 5), i * 0.07) for i, n in enumerate([72, 76, 79, 84])],
            (bell(note(88), 0.9, 4) * 0.8, 0.3), (bell(note(91), 0.9, 4) * 0.6, 0.36),
            (bell(note(96), 0.6, 6) * 0.4, 0.45))
save("cheer", cheer, 0.8)
# spin tick + jackpot
save("tick", bell(note(96), 0.05, 60, (1,)), 0.4)
save("jackpot", mix(*[(bell(note(n), 1.0, 3.5), i * 0.09) for i, n in enumerate([72, 76, 79, 84, 88, 91, 96])]), 0.8)
