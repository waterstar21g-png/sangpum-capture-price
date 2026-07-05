/** Vercel 요청 한도(약 4.5MB)를 넘지 않도록 클라이언트에서 이미지 축소·압축 */

const MAX_EDGE = 1280;
/** base64 data URL 전체 길이 상한 (여유 포함) */
const MAX_DATA_URL_CHARS = 2.5 * 1024 * 1024;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image_load_failed'));
    img.src = src;
  });
}

function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('read_failed'));
    reader.readAsDataURL(file);
  });
}

function canvasToJpegDataUrl(canvas: HTMLCanvasElement, quality: number): string {
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * 사진/갤러리 이미지를 JPEG로 리사이즈·압축한 data URL 반환.
 * Vision API·Vercel body limit에 맞게 크기를 줄인다.
 */
export async function compressImageToDataUrl(source: Blob | string): Promise<string> {
  const src =
    typeof source === 'string' ? source : await readFileAsDataUrl(source);

  const img = await loadImage(src);
  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_unavailable');
  ctx.drawImage(img, 0, 0, w, h);

  let quality = 0.82;
  let dataUrl = canvasToJpegDataUrl(canvas, quality);
  while (dataUrl.length > MAX_DATA_URL_CHARS && quality > 0.4) {
    quality -= 0.1;
    dataUrl = canvasToJpegDataUrl(canvas, quality);
  }

  if (dataUrl.length > MAX_DATA_URL_CHARS) {
    throw new Error('이미지가 너무 큽니다. 더 작은 사진을 사용해 주세요.');
  }

  return dataUrl;
}

/** 검색 이력·결과 표시용 작은 썸네일 (localStorage 보관) */
export async function compressImageToThumbnail(
  source: Blob | string,
  maxEdge = 240,
  quality = 0.68,
): Promise<string> {
  const src = typeof source === 'string' ? source : await readFileAsDataUrl(source);
  const img = await loadImage(src);
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_unavailable');
  ctx.drawImage(img, 0, 0, w, h);

  let q = quality;
  let dataUrl = canvasToJpegDataUrl(canvas, q);
  while (dataUrl.length > 48_000 && q > 0.45) {
    q -= 0.08;
    dataUrl = canvasToJpegDataUrl(canvas, q);
  }
  return dataUrl;
}
