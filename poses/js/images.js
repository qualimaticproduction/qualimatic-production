/* ============================================
   QUALIMATIC POSES — images.js
   Redimensionnement et compression des photos à l'import.
   ============================================ */

const FULL_SIZE = 1600;   // côté le plus long de la photo plein écran
const FULL_QUALITY = 0.8;
const THUMB_SIZE = 480;   // vignette pour la grille
const THUMB_QUALITY = 0.72;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible')); };
    img.src = url;
  });
}

function toJpeg(img, maxSide, quality) {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const cw = Math.round(w * scale);
  const ch = Math.round(h * scale);
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#F5EFE8'; // fond crème si l'image a de la transparence
  ctx.fillRect(0, 0, cw, ch);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, cw, ch);
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      // libère la mémoire du canvas tout de suite (important sur iPhone)
      canvas.width = 0;
      canvas.height = 0;
      if (!blob) return reject(new Error('Compression impossible'));
      resolve({ buffer: await blob.arrayBuffer(), width: cw, height: ch });
    }, 'image/jpeg', quality);
  });
}

/* Renvoie { full, thumb, ratio } prêts à être stockés */
export async function processPhoto(file) {
  const img = await loadImage(file);
  const full = await toJpeg(img, FULL_SIZE, FULL_QUALITY);
  const thumb = await toJpeg(img, THUMB_SIZE, THUMB_QUALITY);
  return { full: full.buffer, thumb: thumb.buffer, ratio: full.width / full.height };
}

/* Transforme un ArrayBuffer stocké en adresse affichable */
export function bufferToUrl(buffer) {
  return URL.createObjectURL(new Blob([buffer], { type: 'image/jpeg' }));
}
