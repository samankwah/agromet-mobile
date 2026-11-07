import { Skia, type SkRuntimeEffect } from '@shopify/react-native-skia';

import type { SkyScene } from '../../domain/skyScene';

/**
 * The sky, drawn per pixel on the GPU: a gradient, the sun's glow or the stars,
 * three layers of cloud, and haze over all of it.
 *
 * The clouds are layered value noise (fractal Brownian motion), the standard
 * way to draw soft, irregular vapour without bitmaps. Each layer's coverage is
 * a threshold on its noise, so the real cloud cover moves it continuously: at
 * 0.15 only the noise's peaks show, as scattered puffs; at 1.0 everything
 * shows, as an unbroken sheet whose texture is the noise itself.
 *
 *  - Low cloud is the thick, puffy layer. Its noise is warped by a second,
 *    slower noise so the edges billow rather than repeat, and it is shaded by
 *    comparing its density with a sample just above, so tops catch the light
 *    and bases sit in shadow.
 *  - Mid cloud is a softer, flatter layer.
 *  - High cloud is cirrus: the noise is stretched sideways into thin streaks.
 *
 * Each layer drifts sideways at its own speed, low fastest, which gives the
 * slow parallax of Apple's weather app.
 *
 * SkSL, Skia's shading language: floats must be written with a decimal point,
 * and loops need a constant bound.
 */
const SOURCE = `
uniform float2 res;
uniform float t;
uniform float3 cover;
uniform float3 skyTop;
uniform float3 skyBottom;
uniform float3 lit;
uniform float3 shade;
uniform float3 hazeColour;
uniform float haze;
uniform float sunGlow;
uniform float stars;

float hash(float2 p) {
  p = fract(p * float2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + float2(1.0, 0.0));
  float c = hash(i + float2(0.0, 1.0));
  float d = hash(i + float2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(float2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + float2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

// Where the noise has to rise before cloud shows, for a coverage of 0..1.
// fbm here spans roughly 0.15 to 0.85.
float threshold(float c) {
  return mix(0.80, 0.16, c);
}

half4 main(float2 xy) {
  float2 uv = xy / res;
  float aspect = res.x / res.y;
  float2 p = float2(uv.x * aspect, uv.y);

  float3 col = mix(skyTop, skyBottom, uv.y);

  // The sun's glow, top right, off the edge of the screen.
  float d = distance(p, float2(aspect * 0.92, -0.04));
  col += float3(1.0, 0.95, 0.82) * sunGlow * (0.45 * exp(-d * 3.2) + 0.25 * exp(-d * 11.0));

  // Stars: a sparse hash grid, twinkling, thinning toward the horizon.
  if (stars > 0.0) {
    float h = hash(floor(xy / 2.0));
    float twinkle = 0.6 + 0.4 * sin(t * 1.5 + h * 50.0);
    col += float3(step(0.995, h) * twinkle * stars * (1.0 - uv.y));
  }

  // High cloud: cirrus streaks.
  float2 ph = float2(p.x * 1.4 + t * 0.004, p.y * 6.0);
  float th = threshold(cover.z);
  float dh = smoothstep(th, th + 0.35, fbm(ph)) * (1.0 - uv.y * 0.4);
  col = mix(col, lit, dh * 0.5);

  // Mid cloud: soft and flat.
  float2 pm = p * float2(2.4, 3.2) + float2(t * 0.007, 0.0);
  float tm = threshold(cover.y);
  float dm = smoothstep(tm, tm + 0.3, fbm(pm));
  col = mix(col, mix(shade, lit, 0.65), dm * 0.7);

  // Low cloud: billowing, lit from above.
  float2 pl = p * 1.7 + float2(t * 0.012, 0.0);
  float warp = fbm(pl * 0.5 + float2(t * 0.003, 3.1));
  float nl = fbm(pl + float2(warp * 0.7, warp * 0.3));
  float tl = threshold(cover.x);
  float dl = smoothstep(tl, tl + 0.2, nl);
  float above = fbm(pl + float2(warp * 0.7, warp * 0.3 - 0.07));
  float light = clamp(0.55 + (nl - above) * 7.0, 0.0, 1.0);
  // A full deck is lit flatly from above: less contrast than a lone cumulus.
  float3 lowCol = mix(shade, lit, light * (0.5 + 0.5 * (1.0 - cover.x)));
  col = mix(col, lowCol, dl * 0.93);

  // Haze, thicker toward the horizon.
  col = mix(col, hazeColour, haze * (0.35 + 0.45 * uv.y));

  return half4(half3(col), 1.0);
}
`;

let compiled: SkRuntimeEffect | null | undefined;

/** The compiled effect, or null if this device's Skia could not compile it, in
 * which case the sky falls back to its plain gradient. Compiled once. */
export function cloudEffect(): SkRuntimeEffect | null {
  if (compiled === undefined) {
    try {
      compiled = Skia.RuntimeEffect.Make(SOURCE);
    } catch {
      compiled = null;
    }
    if (!compiled && __DEV__) console.warn('[sky] the cloud shader did not compile; showing the plain gradient');
  }
  return compiled;
}

/** The scene's values in the shape the shader declares. `t` is seconds. */
export function cloudUniforms(scene: SkyScene, width: number, height: number, t: number) {
  'worklet';
  return {
    res: [width, height],
    t,
    cover: [scene.cover.low, scene.cover.mid, scene.cover.high],
    skyTop: scene.skyTop,
    skyBottom: scene.skyBottom,
    lit: scene.cloudLit,
    shade: scene.cloudShade,
    hazeColour: scene.hazeColour,
    haze: scene.haze,
    sunGlow: scene.sunGlow,
    stars: scene.stars,
  };
}

/** Test hook: forget the compiled effect. */
export function resetCloudEffect(): void {
  compiled = undefined;
}
