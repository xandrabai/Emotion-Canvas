// Local-only persistence for finished paintings. No account, no server, no
// sync -- see CLAUDE.md guardrail #4/#5 and the close screen's copy ("lives
// here, just for you"). Every failure here is swallowed on purpose: a full
// or unavailable localStorage should never interrupt the session or surface
// an error to the user.

export type SavedPainting = {
  artworkId: number;
  dataUrl: string;
  savedAt: string;
};

const STORAGE_KEY = "quiet-canvas.paintings";

export function getSavedPaintings(): SavedPainting[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePainting(artworkId: number, dataUrl: string): void {
  try {
    const existing = getSavedPaintings();
    const updated = [...existing, { artworkId, dataUrl, savedAt: new Date().toISOString() }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Storage full, unavailable (private browsing), or quota exceeded --
    // fail quietly rather than blocking or erroring the close flow.
  }
}

// Draws an image onto a canvas the same way CSS `object-fit: cover` would:
// scaled to fill the target area, centered, cropping any overflow.
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number
) {
  const imgRatio = img.width / img.height;
  const targetRatio = targetWidth / targetHeight;
  let drawWidth: number, drawHeight: number, offsetX: number, offsetY: number;

  if (imgRatio > targetRatio) {
    drawHeight = targetHeight;
    drawWidth = drawHeight * imgRatio;
    offsetX = (targetWidth - drawWidth) / 2;
    offsetY = 0;
  } else {
    drawWidth = targetWidth;
    drawHeight = drawWidth / imgRatio;
    offsetX = 0;
    offsetY = (targetHeight - drawHeight) / 2;
  }

  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
}

// Flattens the background artwork (at its current opacity) and the drawn
// strokes into a single image, matching what the user actually saw on
// screen -- not just the transparent stroke layer on its own.
export async function exportPaintingDataUrl(
  strokesCanvas: HTMLCanvasElement,
  artworkImageUrl: string,
  artworkOpacity: number
): Promise<string> {
  const composite = document.createElement("canvas");
  composite.width = strokesCanvas.width;
  composite.height = strokesCanvas.height;
  const ctx = composite.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable");

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.referrerPolicy = "no-referrer";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = artworkImageUrl;
  });

  ctx.globalAlpha = artworkOpacity;
  drawImageCover(ctx, img, composite.width, composite.height);
  ctx.globalAlpha = 1;
  ctx.drawImage(strokesCanvas, 0, 0);

  return composite.toDataURL("image/jpeg", 0.85);
}
