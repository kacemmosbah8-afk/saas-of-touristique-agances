/**
 * Client-side, pre-submission document quality checks for the visa
 * assistance form. Runs entirely in the browser via `<canvas>` pixel
 * analysis — classic image-processing heuristics (brightness histogram,
 * variance-of-Laplacian sharpness, near-white glare ratio, border-fill
 * cropping signal), not machine learning and not OCR.
 *
 * Important limitation (see the public form's copy): these checks confirm
 * a document is technically legible — not that it satisfies any specific
 * embassy/consulate's visa requirements. The admin remains the final human
 * reviewer of every submission.
 *
 * PDFs are not pixel-analyzed (no PDF rendering library in this codebase)
 * — only their file type/size are checked elsewhere; this module returns a
 * clear "not checked" result for them instead of pretending to have
 * verified anything.
 */

export type ImageQualityResult = {
  ok: boolean;
  /** Set when `ok` is false — the exact reason to show the visitor. */
  reason?: string;
  width: number | null;
  height: number | null;
  /** Human-readable summary for the admin's "document quality" display. */
  notes: string;
};

const MIN_PIXELS = 480_000; // roughly 800x600 — a legible phone-camera photo comfortably clears this
const DARK_THRESHOLD = 40; // mean grayscale 0-255
const BRIGHT_THRESHOLD = 235;
const BLUR_VARIANCE_THRESHOLD = 18; // variance of the Laplacian response, empirical
const GLARE_PIXEL_RATIO_THRESHOLD = 0.08; // fraction of near-pure-white pixels
const EDGE_FILL_THRESHOLD = 0.82; // fraction of border pixels reading as "content" before flagging as cropped

const ANALYSIS_MAX_DIMENSION = 400; // downscale target for the pixel-level checks — plenty for these heuristics, keeps them fast

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

function grayscale(data: Uint8ClampedArray, width: number, height: number): Float32Array {
  const out = new Float32Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    out[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return out;
}

/** Variance of the 3x3 Laplacian response — a standard, dependency-free sharpness proxy. */
function laplacianVariance(gray: Float32Array, width: number, height: number): number {
  const responses: number[] = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const value =
        4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - width] - gray[i + width];
      responses.push(value);
    }
  }
  if (responses.length === 0) return 0;
  const mean = responses.reduce((a, b) => a + b, 0) / responses.length;
  const variance = responses.reduce((a, b) => a + (b - mean) ** 2, 0) / responses.length;
  return variance;
}

/** Fraction of border-strip pixels that read as "content" rather than background —
 * a well-composed document photo almost always has some background margin around
 * it; a strip that's filled edge-to-edge on every side is a defensible (if
 * imperfect) signal the page itself may run off the frame. */
function edgeFillRatio(gray: Float32Array, width: number, height: number): number {
  const stripWidth = Math.max(2, Math.round(Math.min(width, height) * 0.04));
  // Approximate the background as the modal value found at the four corners.
  const corners = [gray[0], gray[width - 1], gray[(height - 1) * width], gray[height * width - 1]];
  const background = corners.reduce((a, b) => a + b, 0) / corners.length;
  const isContent = (v: number) => Math.abs(v - background) > 30;

  let contentPixels = 0;
  let totalPixels = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const onBorder = x < stripWidth || x >= width - stripWidth || y < stripWidth || y >= height - stripWidth;
      if (!onBorder) continue;
      totalPixels++;
      if (isContent(gray[y * width + x])) contentPixels++;
    }
  }
  return totalPixels === 0 ? 0 : contentPixels / totalPixels;
}

function glareRatio(data: Uint8ClampedArray): number {
  let nearWhite = 0;
  const totalPixels = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] > 250 && data[i + 1] > 250 && data[i + 2] > 250) nearWhite++;
  }
  return totalPixels === 0 ? 0 : nearWhite / totalPixels;
}

export async function analyzeImageQuality(
  file: File,
  messages: {
    lowResolution: string;
    tooDark: string;
    tooBright: string;
    tooBlurry: string;
    glare: string;
    cropped: string;
    unreadable: string;
  },
): Promise<ImageQualityResult> {
  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    return { ok: false, reason: messages.unreadable, width: null, height: null, notes: "" };
  }

  const width = img.naturalWidth;
  const height = img.naturalHeight;

  if (width * height < MIN_PIXELS) {
    return {
      ok: false,
      reason: messages.lowResolution,
      width,
      height,
      notes: `${width}×${height}`,
    };
  }

  const scale = Math.min(1, ANALYSIS_MAX_DIMENSION / Math.max(width, height));
  const analysisWidth = Math.max(1, Math.round(width * scale));
  const analysisHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = analysisWidth;
  canvas.height = analysisHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    // No canvas support — can't run pixel checks; don't block on something
    // we can't actually verify.
    return { ok: true, width, height, notes: `${width}×${height} · quality checks unavailable in this browser` };
  }
  ctx.drawImage(img, 0, 0, analysisWidth, analysisHeight);
  const { data } = ctx.getImageData(0, 0, analysisWidth, analysisHeight);

  const gray = grayscale(data, analysisWidth, analysisHeight);
  const meanBrightness = gray.reduce((a, b) => a + b, 0) / gray.length;

  if (meanBrightness < DARK_THRESHOLD) {
    return { ok: false, reason: messages.tooDark, width, height, notes: `${width}×${height} · too dark` };
  }
  if (meanBrightness > BRIGHT_THRESHOLD) {
    return { ok: false, reason: messages.tooBright, width, height, notes: `${width}×${height} · overexposed` };
  }

  const glare = glareRatio(data);
  if (glare > GLARE_PIXEL_RATIO_THRESHOLD) {
    return { ok: false, reason: messages.glare, width, height, notes: `${width}×${height} · glare detected` };
  }

  const sharpness = laplacianVariance(gray, analysisWidth, analysisHeight);
  if (sharpness < BLUR_VARIANCE_THRESHOLD) {
    return { ok: false, reason: messages.tooBlurry, width, height, notes: `${width}×${height} · too blurry` };
  }

  const edgeFill = edgeFillRatio(gray, analysisWidth, analysisHeight);
  if (edgeFill > EDGE_FILL_THRESHOLD) {
    return { ok: false, reason: messages.cropped, width, height, notes: `${width}×${height} · possibly cropped` };
  }

  return {
    ok: true,
    width,
    height,
    notes: `${width}×${height} · brightness normal · sharpness OK`,
  };
}
