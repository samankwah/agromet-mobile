"""Paint the sky backdrops for the Daily and Weekly forecast.

One image for each kind of weather at each time of day, in the manner of the
phone's own weather app: soft, lit cloud, a sun glow or a moon and stars, grey
decks for overcast and rain, dark turbulent cloud for storms, pale haze for
harmattan and fog. Rendered here, offline, at a quality a live shader on a
low-end phone cannot reach, and shipped as WebP in assets/sky.

    python scripts/render-skies.py            # all scenes
    python scripts/render-skies.py clear-day  # one, for tuning

Needs numpy and Pillow (with WebP). Deterministic: the same seed gives the same
sky, so re-running changes nothing unless the code does.
"""

from __future__ import annotations

import sys
import zlib
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

# Painted a little larger and trimmed, so no edge effects from the noise or the
# lighting shifts reach the picture.
OUT_W, OUT_H = 720, 1600
PAD = 24
W, H = OUT_W + 2 * PAD, OUT_H + 2 * PAD
OUT = Path(__file__).resolve().parent.parent / "assets" / "sky"

COVERS = ["clear", "partly", "cloudy", "overcast", "rain", "storm", "fog"]
PHASES = ["day", "dawn", "dusk", "night"]


# --------------------------------------------------------------------------
# Noise
# --------------------------------------------------------------------------

def octave(rng: np.random.Generator, cells_x: int, cells_y: int) -> np.ndarray:
    """Smooth random field: a coarse random grid enlarged with bicubic filtering."""
    grid = rng.random((cells_y + 3, cells_x + 3)).astype(np.float32)
    big = Image.fromarray(grid).resize((W + W // cells_x * 3, H + H // cells_y * 3), Image.BICUBIC)
    arr = np.asarray(big, dtype=np.float32)
    ox, oy = W // cells_x, H // cells_y
    return arr[oy : oy + H, ox : ox + W]


def fbm(rng: np.random.Generator, base_x: int, base_y: int, octaves: int = 6, gain: float = 0.47) -> np.ndarray:
    total = np.zeros((H, W), np.float32)
    amp, norm = 1.0, 0.0
    cx, cy = base_x, base_y
    for _ in range(octaves):
        total += amp * octave(rng, max(1, cx), max(1, cy))
        norm += amp
        amp *= gain
        cx *= 2
        cy *= 2
    return total / norm


def sample(field: np.ndarray, x: np.ndarray, y: np.ndarray) -> np.ndarray:
    """Bilinear lookup of `field` at fractional pixel coordinates, clamped."""
    x = np.clip(x, 0, W - 1.001)
    y = np.clip(y, 0, H - 1.001)
    x0 = x.astype(np.int32)
    y0 = y.astype(np.int32)
    fx = x - x0
    fy = y - y0
    a = field[y0, x0]
    b = field[y0, x0 + 1]
    c = field[y0 + 1, x0]
    d = field[y0 + 1, x0 + 1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def warped(rng: np.random.Generator, base_x: int, base_y: int, strength: float, octaves: int = 6) -> np.ndarray:
    """fbm pushed around by two more fbm fields, so cloud billows instead of
    looking like smoothed static."""
    field = fbm(rng, base_x, base_y, octaves)
    wx = fbm(rng, max(1, base_x // 2), max(1, base_y // 2), 4)
    wy = fbm(rng, max(1, base_x // 2), max(1, base_y // 2), 4)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    return sample(field, xx + (wx - 0.5) * strength, yy + (wy - 0.5) * strength)


def blur(field: np.ndarray, radius: float) -> np.ndarray:
    """A soft copy: shrunk by `radius` and enlarged again with bicubic
    filtering (Pillow's Gaussian blur does not take float images)."""
    factor = max(1, int(radius))
    picture = Image.fromarray(field.astype(np.float32))
    small = picture.resize((max(1, W // factor), max(1, H // factor)), Image.BILINEAR)
    return np.asarray(small.resize((W, H), Image.BICUBIC), dtype=np.float32)


def smoothstep(e0: float, e1: float, x: np.ndarray) -> np.ndarray:
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def shift(field: np.ndarray, dx: int, dy: int) -> np.ndarray:
    """`field` moved by (dx, dy) pixels, edges held."""
    out = np.empty_like(field)
    ys = slice(max(0, -dy), H - max(0, dy))
    yd = slice(max(0, dy), H - max(0, -dy))
    xs = slice(max(0, -dx), W - max(0, dx))
    xd = slice(max(0, dx), W - max(0, -dx))
    out[:] = field
    out[yd, xd] = field[ys, xs]
    return out


# --------------------------------------------------------------------------
# Colour
# --------------------------------------------------------------------------

def hexc(value: str) -> np.ndarray:
    return np.array([int(value[i : i + 2], 16) for i in (1, 3, 5)], np.float32) / 255.0


def vertical(top: str, bottom: str, curve: float = 1.0) -> np.ndarray:
    t = (np.linspace(0, 1, H, dtype=np.float32) ** curve)[:, None, None]
    return hexc(top) * (1 - t) + hexc(bottom) * t * np.ones((1, W, 1), np.float32)


def mix(a: np.ndarray, b: np.ndarray, t: np.ndarray) -> np.ndarray:
    return a * (1 - t[..., None]) + b * t[..., None]


# Sky colours: (top, horizon). Clear skies and grey ones for each time of day.
CLEAR_SKY = {
    "day": ("#1f5fb8", "#9ac4ec"),
    "dawn": ("#2f4a80", "#f3b27c"),
    "dusk": ("#232a5a", "#ee8a5a"),
    "night": ("#040a1a", "#1a2a4a"),
}
GREY_SKY = {
    "day": ("#69737d", "#a9b1b8"),
    "dawn": ("#4f5664", "#a3948a"),
    "dusk": ("#40455a", "#8d7c7c"),
    "night": ("#0e1218", "#232a34"),
}
# Cloud colours: (lit side, shadow side).
CLOUD_LIGHT = {
    "day": ("#ffffff", "#9eabbb"),
    "dawn": ("#ffe0c4", "#8a7a90"),
    "dusk": ("#ffc9a3", "#665a74"),
    "night": ("#56637b", "#141a26"),
}
GREY_CLOUD = {
    "day": ("#d3d8dd", "#6f7983"),
    "dawn": ("#c4b7ae", "#5d5c66"),
    "dusk": ("#b0a2a2", "#4c4a58"),
    "night": ("#3a414c", "#12161d"),
}


# --------------------------------------------------------------------------
# Elements
# --------------------------------------------------------------------------

def sun_glow(img: np.ndarray, phase: str, strength: float) -> np.ndarray:
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    if phase == "day":
        cx, cy, colour = W * 0.88, H * 0.06, hexc("#fff6d8")
    elif phase == "dawn":
        cx, cy, colour = W * 0.15, H * 0.62, hexc("#ffd29a")
    else:
        cx, cy, colour = W * 0.85, H * 0.62, hexc("#ffb27a")
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / W
    glow = (0.55 * np.exp(-d * 3.2) + 0.35 * np.exp(-d * 12.0)) * strength
    return img + colour * glow[..., None]


def moon_and_stars(img: np.ndarray, rng: np.random.Generator, star_amount: float, moon: bool) -> np.ndarray:
    out = img.copy()
    if star_amount > 0:
        count = int(900 * star_amount)
        xs = rng.random(count) * W
        ys = rng.random(count) ** 1.6 * H * 0.75
        mags = rng.random(count) ** 3
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        layer = np.zeros((H, W), np.float32)
        for x, y, m in zip(xs, ys, mags):
            r = 0.6 + m * 1.4
            x0, x1 = int(max(0, x - 4)), int(min(W, x + 5))
            y0, y1 = int(max(0, y - 4)), int(min(H, y + 5))
            d2 = (xx[y0:y1, x0:x1] - x) ** 2 + (yy[y0:y1, x0:x1] - y) ** 2
            layer[y0:y1, x0:x1] += (0.35 + 0.65 * m) * np.exp(-d2 / (r * r))
        out = out + np.clip(layer, 0, 1)[..., None] * hexc("#f2f5ff")
    if moon:
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        cx, cy, r = W * 0.80, H * 0.11, W * 0.045
        d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
        halo = 0.28 * np.exp(-((d / (W * 0.22)) ** 2))
        out = out + halo[..., None] * hexc("#c9d4ff")
        disc = smoothstep(r + 1.5, r - 1.5, d)
        # A gibbous moon: the disc, less a shifted disc for the shadow side.
        shadow = smoothstep(r + 1.5, r - 1.5, np.sqrt((xx - cx + r * 0.55) ** 2 + (yy - cy + r * 0.1) ** 2))
        lit = np.clip(disc - shadow * 0.85, 0, 1)
        out = mix(out, np.broadcast_to(hexc("#f4f1e4"), out.shape).copy(), lit)
    return out


def cloud_layer(
    img: np.ndarray,
    rng: np.random.Generator,
    coverage: float,
    lit: str,
    shade: str,
    scale: tuple[int, int],
    softness: float,
    warp: float,
    opacity: float,
    light_dir: tuple[int, int],
    fade_bottom: float = 0.0,
    stretch_cirrus: bool = False,
) -> np.ndarray:
    """One layer of lit cloud. `coverage` 0..1 sets how much of the sky it fills."""
    sx, sy = scale
    if stretch_cirrus:
        density = warped(rng, sx, sy * 6, warp, 6)
    else:
        density = warped(rng, sx, sy, warp, 6)
    # The noise sits roughly between 0.3 and 0.7: the threshold walks across it.
    threshold = 0.66 - coverage * 0.5
    body = smoothstep(threshold, threshold + softness, density)

    # Light: where density falls off toward the light, the cloud faces it.
    # Worked out on a softened copy, so the shading follows the cloud's big
    # shapes rather than mottling every small grain of the noise.
    smooth = blur(density, 6)
    dx, dy = light_dir
    toward = shift(smooth, -dx, -dy)
    facing = np.clip(0.5 + (smooth - toward) * 11.0, 0, 1)
    # Bases darker than tops, as cloud shades itself from above.
    below = shift(smooth, 0, -16)
    base_shadow = np.clip((smooth - below) * 7.0, 0, 1)
    light = np.clip(facing * 0.85 + 0.25 - base_shadow * 0.35, 0, 1)
    colour = mix(np.broadcast_to(hexc(shade), img.shape).copy(), np.broadcast_to(hexc(lit), img.shape).copy(), light)

    alpha = body * opacity
    if fade_bottom > 0:
        t = np.linspace(0, 1, H, dtype=np.float32)[:, None]
        alpha = alpha * (1 - fade_bottom * smoothstep(0.35, 1.0, t))
    return mix(img, colour, alpha)


def rain_streaks(img: np.ndarray, rng: np.random.Generator, amount: float) -> np.ndarray:
    """Faint slanted veils of falling rain, baked into the deck."""
    noise = rng.random((H // 2, W // 8)).astype(np.float32)
    streaks = np.asarray(Image.fromarray((noise * 255).astype(np.uint8)).resize((W, H), Image.BILINEAR), np.float32) / 255
    streaks = np.asarray(
        Image.fromarray((streaks * 255).astype(np.uint8)).transform((W, H), Image.AFFINE, (1, 0.25, -H * 0.12, 0, 1, 0)),
        np.float32,
    ) / 255
    veil = smoothstep(0.55, 0.95, streaks) * amount
    return mix(img, np.broadcast_to(hexc("#c9d1da"), img.shape).copy(), veil * 0.25)


def haze(img: np.ndarray, colour: str, amount: float) -> np.ndarray:
    t = np.linspace(0, 1, H, dtype=np.float32)[:, None]
    return mix(img, np.broadcast_to(hexc(colour), img.shape).copy(), amount * (0.45 + 0.55 * t) * np.ones((1, W), np.float32))


# --------------------------------------------------------------------------
# Scenes
# --------------------------------------------------------------------------

def render(cover: str, phase: str) -> Image.Image:
    seed = zlib.crc32(f"agromet-sky/{cover}/{phase}".encode())
    rng = np.random.default_rng(seed)
    light_dir = {"day": (12, 10), "dawn": (-14, 4), "dusk": (14, 4), "night": (8, 10)}[phase]
    lit, shade = CLOUD_LIGHT[phase]
    glit, gshade = GREY_CLOUD[phase]

    if cover in ("clear", "partly", "cloudy"):
        img = vertical(*CLEAR_SKY[phase], curve=0.9)
    elif cover == "fog":
        img = vertical(*GREY_SKY[phase], curve=0.8)
    else:
        img = vertical(*GREY_SKY[phase], curve=1.0)

    if cover == "clear":
        if phase != "night":
            img = sun_glow(img, phase, 1.0)
        img = cloud_layer(img, rng, 0.08, lit, shade, (2, 3), 0.35, 120, 0.35, light_dir, stretch_cirrus=True)
        if phase == "night":
            img = moon_and_stars(img, rng, 1.0, True)
    elif cover == "partly":
        if phase != "night":
            img = sun_glow(img, phase, 0.8)
        else:
            img = moon_and_stars(img, rng, 0.7, True)
        img = cloud_layer(img, rng, 0.25, lit, shade, (2, 2), 0.35, 140, 0.45, light_dir, stretch_cirrus=True)
        img = cloud_layer(img, rng, 0.34, lit, shade, (3, 4), 0.10, 120, 0.95, light_dir, fade_bottom=0.4)
    elif cover == "cloudy":
        if phase != "night":
            img = sun_glow(img, phase, 0.45)
        else:
            img = moon_and_stars(img, rng, 0.3, False)
        img = cloud_layer(img, rng, 0.55, glit if phase == "night" else lit, shade, (2, 3), 0.22, 120, 0.75, light_dir)
        img = cloud_layer(img, rng, 0.58, lit, shade, (3, 4), 0.10, 140, 0.95, light_dir, fade_bottom=0.25)
    elif cover == "overcast":
        img = cloud_layer(img, rng, 0.95, glit, gshade, (2, 4), 0.30, 260, 0.9, light_dir)
        img = cloud_layer(img, rng, 0.85, glit, gshade, (4, 7), 0.20, 200, 0.55, light_dir)
    elif cover == "rain":
        img = cloud_layer(img, rng, 1.0, glit, gshade, (2, 4), 0.35, 280, 0.95, light_dir)
        img = cloud_layer(img, rng, 0.8, gshade, gshade, (3, 6), 0.25, 220, 0.5, light_dir)
        img = img * 0.82
        # No baked-in streaks: the app draws moving rain over the picture.
        img = haze(img, GREY_SKY[phase][1], 0.25)
    elif cover == "storm":
        # A heavy, dark deck with paler bulges where the cloud catches what
        # light there is, and a darker band low down where the rain falls.
        img = img * 0.6
        img = cloud_layer(img, rng, 1.0, glit, gshade, (2, 3), 0.28, 160, 0.95, light_dir)
        dark = "#2a3038" if phase != "night" else "#0a0d12"
        img = cloud_layer(img, rng, 0.75, dark, dark, (2, 4), 0.25, 140, 0.8, light_dir)
        img = img * 0.72
        img = haze(img, "#3b4249" if phase != "night" else "#101419", 0.3)
    elif cover == "fog":
        img = cloud_layer(img, rng, 0.6, glit, gshade, (1, 2), 0.5, 160, 0.5, light_dir)
        hazecol = "#cfc6b6" if phase == "day" else ("#bcae9f" if phase in ("dawn", "dusk") else "#3a3f47")
        img = haze(img, hazecol, 0.55)
        if phase != "night":
            img = sun_glow(img, phase, 0.25)

    # A light shade at the top for the white temperature, as Apple does.
    t = np.linspace(0, 1, H, dtype=np.float32)[:, None, None]
    img = img * (1 - 0.18 * smoothstep(0.35, 0.0, t))

    pixels = (np.clip(img, 0, 1) * 255).astype(np.uint8)
    picture = Image.fromarray(pixels, "RGB").filter(ImageFilter.GaussianBlur(0.8))
    return picture.crop((PAD, PAD, PAD + OUT_W, PAD + OUT_H))


def main(names: list[str]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    wanted = names or [f"{c}-{p}" for c in COVERS for p in PHASES]
    for name in wanted:
        cover, phase = name.split("-")
        picture = render(cover, phase)
        path = OUT / f"{name}.webp"
        picture.save(path, "WEBP", quality=78, method=6)
        print(f"{path.name}  {path.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main(sys.argv[1:])
