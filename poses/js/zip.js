/* ============================================
   QUALIMATIC POSES — zip.js
   Fichier de sauvegarde au format ZIP (lisible sur Mac/PC :
   on y retrouve un fichier donnees.json et le dossier photos/).
   Les photos sont déjà en JPEG : on les range sans recompresser.
   ============================================ */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function dosDateTime(d) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

/* Construit un ZIP fichier par fichier (économe en mémoire sur iPhone).
   const zip = new ZipWriter(); zip.add('a.txt', données); const blob = zip.finish(); */
export class ZipWriter {
  constructor() {
    this.parts = [];
    this.central = [];
    this.offset = 0;
    this.count = 0;
    this.enc = new TextEncoder();
    this.stamp = dosDateTime(new Date());
  }

  add(fileName, input) {
    const data = input instanceof Uint8Array ? input : new Uint8Array(input);
    const name = this.enc.encode(fileName);
    const crc = crc32(data);
    const { time, date } = this.stamp;

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // noms en UTF-8
    local.setUint16(8, 0, true);      // sans compression
    local.setUint16(10, time, true);
    local.setUint16(12, date, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    local.setUint16(28, 0, true);
    // un Blob par fichier : le navigateur peut sortir les données de la mémoire vive
    this.parts.push(new Blob([local.buffer, name, data]));

    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint16(8, 0x0800, true);
    cd.setUint16(10, 0, true);
    cd.setUint16(12, time, true);
    cd.setUint16(14, date, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, data.length, true);
    cd.setUint32(24, data.length, true);
    cd.setUint16(28, name.length, true);
    cd.setUint32(42, this.offset, true);
    this.central.push(cd.buffer, name);

    this.offset += 30 + name.length + data.length;
    this.count++;
  }

  finish() {
    const cdSize = this.central.reduce((s, p) => s + p.byteLength, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, this.count, true);
    end.setUint16(10, this.count, true);
    end.setUint32(12, cdSize, true);
    end.setUint32(16, this.offset, true);
    return new Blob([...this.parts, ...this.central, end.buffer], { type: 'application/zip' });
  }
}

/* Lit un ZIP (File ou Blob). Renvoie { names, read(name) → ArrayBuffer } */
export async function readZip(file) {
  const tailSize = Math.min(file.size, 65557);
  const tail = new DataView(await file.slice(file.size - tailSize).arrayBuffer());
  let eocd = -1;
  for (let i = tail.byteLength - 22; i >= 0; i--) {
    if (tail.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Ce fichier n’est pas une sauvegarde valide.');

  const count = tail.getUint16(eocd + 10, true);
  const cdSize = tail.getUint32(eocd + 12, true);
  const cdOffset = tail.getUint32(eocd + 16, true);
  const cd = new DataView(await file.slice(cdOffset, cdOffset + cdSize).arrayBuffer());
  const dec = new TextDecoder();
  const entries = new Map();

  let p = 0;
  for (let i = 0; i < count; i++) {
    if (cd.getUint32(p, true) !== 0x02014b50) throw new Error('Sauvegarde endommagée.');
    const method = cd.getUint16(p + 10, true);
    const csize = cd.getUint32(p + 20, true);
    const nameLen = cd.getUint16(p + 28, true);
    const extraLen = cd.getUint16(p + 30, true);
    const commentLen = cd.getUint16(p + 32, true);
    const localOffset = cd.getUint32(p + 42, true);
    const name = dec.decode(new Uint8Array(cd.buffer, p + 46, nameLen));
    entries.set(name, { method, csize, localOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }

  async function read(name) {
    const e = entries.get(name);
    if (!e) return null;
    const lh = new DataView(await file.slice(e.localOffset, e.localOffset + 30).arrayBuffer());
    const start = e.localOffset + 30 + lh.getUint16(26, true) + lh.getUint16(28, true);
    const raw = file.slice(start, start + e.csize);
    if (e.method === 0) return raw.arrayBuffer();
    if (e.method === 8 && typeof DecompressionStream !== 'undefined') {
      // ZIP recompressé (par ex. sur un ordinateur)
      return new Response(raw.stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
    }
    throw new Error('Format de compression non pris en charge.');
  }

  return { names: [...entries.keys()], read };
}
