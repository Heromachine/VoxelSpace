/**
 * generate_dirt_and_height.js
 *
 * Node.js script that generates:
 *   - images/height_2048.png  (grayscale height map)
 *   - images/dirt_2048.png    (color dirt texture derived from height + slope)
 *
 * Requires: npm install canvas
 *
 * Usage:
 *   node generate_dirt_and_height.js
 *
 * Notes:
 *  - Image size is 2048x2048 (2k). Change SIZE constant if you want a different resolution.
 *  - The noise implementation below is a compact Perlin noise + fBm.
 *  - Dirt texture palette blends mountain-style dirt (rocky/gray) and plains dirt (brown/red)
 *    based on elevation, and uses local slope to introduce rockier colors on steep slopes.
 *  - No grass/vegetation is added (as requested).
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Output config
const OUT_DIR = path.join(__dirname, 'images');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

const SIZE = 2048; // 2k
const HEIGHT_FILENAME = path.join(OUT_DIR, `height_${SIZE}.png`);
const DIRT_FILENAME = path.join(OUT_DIR, `dirt_${SIZE}.png`);

/* ----------------------------------------
   Simple Perlin noise implementation
   (2D) - permutation based classic Perlin
   ---------------------------------------- */
class Perlin {
  constructor(seed = 0) {
    this.perm = new Uint8Array(512);
    this.seed = seed >>> 0;
    this._build();
  }
  _build() {
    // Simple pseudo RNG using seed
    let seed = this.seed || 0xDEADBEEF;
    function rand() {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed;
    }
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = rand() % (i + 1);
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }
  // fade, lerp, grad
  static fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  static lerp(a, b, t) { return a + t * (b - a); }
  static grad(hash, x, y) {
    // Convert low 4 bits of hash code into 12 gradient directions.
    const h = hash & 7; // 8 directions enough
    switch (h) {
      case 0: return  x + y;
      case 1: return -x + y;
      case 2: return  x - y;
      case 3: return -x - y;
      case 4: return  x;
      case 5: return -x;
      case 6: return  y;
      default: return -y;
    }
  }
  noise2D(x, y) {
    // Find unit grid cell containing point
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    // Relative xy
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    // Fade curves
    const u = Perlin.fade(xf);
    const v = Perlin.fade(yf);
    // Hash coords of cube corners
    const aa = this.perm[this.perm[X] + Y];
    const ab = this.perm[this.perm[X] + Y + 1];
    const ba = this.perm[this.perm[X + 1] + Y];
    const bb = this.perm[this.perm[X + 1] + Y + 1];
    // Add blended results for corners
    const x1 = Perlin.lerp(Perlin.grad(aa, xf, yf), Perlin.grad(ba, xf - 1, yf), u);
    const x2 = Perlin.lerp(Perlin.grad(ab, xf, yf - 1), Perlin.grad(bb, xf - 1, yf - 1), u);
    return Perlin.lerp(x1, x2, v);
  }
}

/* ----------------------------------------
   Fractional Brownian Motion using Perlin
   ---------------------------------------- */
function fbm(perlin, x, y, octaves = 6, lacunarity = 2.0, gain = 0.5) {
  let amplitude = 1.0;
  let frequency = 1.0;
  let sum = 0;
  let max = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amplitude * perlin.noise2D(x * frequency, y * frequency);
    max += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }
  return sum / max; // normalized roughly to [-1..1]
}

/* ----------------------------------------
   Utility color helpers
   ---------------------------------------- */
function clamp(v, a=0, b=1) { return Math.max(a, Math.min(b, v)); }
function lerpColor(a, b, t) {
  return [ a[0] + (b[0]-a[0])*t, a[1] + (b[1]-a[1])*t, a[2] + (b[2]-a[2])*t ];
}
function toByte(c) { return Math.round(clamp(c,0,1)*255); }

/* ----------------------------------------
   Dirt palettes (no grass)
   Use two main soil families:
      - plains dirt: brown/reddish warm soils
      - mountain dirt: rockier, grayish, cool soils
   We'll blend between them by elevation.
   ---------------------------------------- */
const PLAINS_PALETTE = [
  [0.20, 0.13, 0.07], // dark brown
  [0.37, 0.22, 0.11],
  [0.45, 0.30, 0.18],
  [0.55, 0.35, 0.20],
  [0.66, 0.44, 0.30]  // lighter sandy
];
const MOUNTAIN_PALETTE = [
  [0.15, 0.15, 0.14], // dark gray earth
  [0.30, 0.28, 0.26],
  [0.40, 0.38, 0.36],
  [0.52, 0.50, 0.48],
  [0.66, 0.64, 0.61]  // lighter scree
];

function samplePalette(palette, t) {
  // t in [0,1]; pick between palette entries smoothly
  const n = palette.length;
  const scaled = t * (n - 1);
  const i = Math.floor(scaled);
  const f = scaled - i;
  const a = palette[clamp(i,0,n-1)];
  const b = palette[clamp(i+1,0,n-1)];
  return lerpColor(a, b, f);
}

/* ----------------------------------------
   Generate height map and texture
   ---------------------------------------- */
async function generate() {
  const perlin = new Perlin(12345); // choose seed for reproducibility

  // Canvas for height map
  const canvasH = createCanvas(SIZE, SIZE);
  const ctxH = canvasH.getContext('2d');
  const imgH = ctxH.createImageData(SIZE, SIZE);

  // Parameters for height fBm
  const baseFreq = 1 / 1024; // low base frequency
  const octaves = 6;

  // Precompute height values in float array for slope calc
  const heights = new Float32Array(SIZE * SIZE);

  // Generate height map
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      // map coordinates to noise space
      const nx = x * baseFreq;
      const ny = y * baseFreq;

      // Several layers to simulate mountain ranges + plains:
      // large-scale ridges + mid-scale variation + small noise for roughness
      const large = fbm(perlin, nx * 0.5, ny * 0.5, 4, 2.0, 0.6) * 0.8;
      const mid = fbm(perlin, nx * 1.5, ny * 1.5, 5, 2.0, 0.5) * 0.4;
      const fine = fbm(perlin, nx * 6.0, ny * 6.0, 4, 2.0, 0.45) * 0.12;

      // Combine: bias upward a bit and clamp to [0,1]
      let h = (large + mid + fine) * 0.5 + 0.5; // roughly [0..1]
      h = clamp(h, 0, 1);

      heights[y * SIZE + x] = h;
      const byte = toByte(h);
      const idx = (y * SIZE + x) * 4;
      imgH.data[idx + 0] = byte;
      imgH.data[idx + 1] = byte;
      imgH.data[idx + 2] = byte;
      imgH.data[idx + 3] = 255;
    }
  }

  ctxH.putImageData(imgH, 0, 0);

  // Save height PNG
  fs.writeFileSync(HEIGHT_FILENAME, canvasH.toBuffer('image/png'));
  console.log(`Wrote ${HEIGHT_FILENAME}`);

  // Create dirt texture canvas
  const canvasT = createCanvas(SIZE, SIZE);
  const ctxT = canvasT.getContext('2d');
  const imgT = ctxT.createImageData(SIZE, SIZE);

  // Compute slope map (approximate) from heights: use central differences
  function slopeAt(ix, iy) {
    const getH = (xx, yy) => {
      xx = clamp(xx, 0, SIZE - 1);
      yy = clamp(yy, 0, SIZE - 1);
      return heights[yy * SIZE + xx];
    };
    const left = getH(ix - 1, iy);
    const right = getH(ix + 1, iy);
    const up = getH(ix, iy - 1);
    const down = getH(ix, iy + 1);
    const dx = (right - left) * 0.5;
    const dy = (down - up) * 0.5;
    // magnitude of gradient approximates slope
    return Math.sqrt(dx * dx + dy * dy);
  }

  // For lighting/variation, compute a small directional ambient occlusion-like factor
  // by sampling a few offsets along normal direction. Keep cheap.
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const h = heights[y * SIZE + x]; // 0..1
      // elevation influences whether soil is "mountain" or "plains"
      // lower elevation -> plains, higher -> mountain
      // use smoothstep for nicer transitions
      const elevBlend = smoothstep(0.33, 0.72, h); // 0..1
      // sample palette colors
      // choose a subsample t from micro-noise to vary color within region
      const micro = fbm(perlin, x/(SIZE/8), y/(SIZE/8), 3, 2.0, 0.5) * 0.5 + 0.5; // 0..1
      // slope factor
      const s = slopeAt(x, y); // small numbers ~0..0.3
      // amplify slope influence
      const slopeFactor = clamp(s * 6.0, 0.0, 1.0);

      // Choose colors from both palettes
      // base t uses micro variation and elevation blends
      const tBase = clamp(micro * 0.9 + (h * 0.1), 0, 1);
      const plainsColor = samplePalette(PLAINS_PALETTE, tBase);
      const mountainColor = samplePalette(MOUNTAIN_PALETTE, tBase);

      // When slope is steep, shift towards mountain palette + a rocky tint
      const slopeRocky = lerpColor(plainsColor, mountainColor, slopeFactor * 0.9);

      // Blend between plains and mountain by elevation
      const blended = lerpColor(plainsColor, slopeRocky, elevBlend);

      // Add subtle brightness variation based on micro noise and height
      const brightnessVariation = (fbm(perlin, x/(SIZE/16)+10, y/(SIZE/16)+10, 2, 2.0, 0.6) * 0.25);
      const finalColor = [
        clamp(blended[0] * (0.95 + brightnessVariation) + h * 0.02, 0, 1),
        clamp(blended[1] * (0.95 + brightnessVariation) + h * 0.02, 0, 1),
        clamp(blended[2] * (0.95 + brightnessVariation) + h * 0.02, 0, 1)
      ];

      // Slight darkening for depressions (simulate moisture/dampness)
      const depressionDarken = smoothstep(0.0, 0.28, (0.28 - h)) * 0.08;
      finalColor[0] = clamp(finalColor[0] - depressionDarken, 0, 1);
      finalColor[1] = clamp(finalColor[1] - depressionDarken, 0, 1);
      finalColor[2] = clamp(finalColor[2] - depressionDarken, 0, 1);

      const idx = (y * SIZE + x) * 4;
      imgT.data[idx + 0] = toByte(finalColor[0]);
      imgT.data[idx + 1] = toByte(finalColor[1]);
      imgT.data[idx + 2] = toByte(finalColor[2]);
      imgT.data[idx + 3] = 255;
    }
    // progress log occasionally
    if ((y & 127) === 0) process.stdout.write(`Generating texture row ${y}/${SIZE}\r`);
  }

  ctxT.putImageData(imgT, 0, 0);
  fs.writeFileSync(DIRT_FILENAME, canvasT.toBuffer('image/png'));
  console.log(`\nWrote ${DIRT_FILENAME}`);
}

/* ----------------------------------------
   Helpers
   ---------------------------------------- */
function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

/* Kick off generation */
generate().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
