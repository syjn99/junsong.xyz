// Generates the favicons in public/ from the profile picture (the taco).
// Run after changing the source image or crop: node scripts/make-favicon.mjs
import fs from 'node:fs';
import sharp from 'sharp';

const SRC = 'public/content/images/2024/09/24382437_v642-nap-10-fastfood-min.jpg';
const OUT = process.argv[2] ?? 'public';
// Square crop around the taco (the source is 2000x2000).
const CROP = { left: 330, top: 380, width: 1300, height: 1300 };

const roundedMask = (size) =>
    Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size * 0.22}"/></svg>`);

async function png(size, { round = true } = {}) {
    let img = sharp(SRC).extract(CROP).resize(size, size, { kernel: 'lanczos3' });
    // Only the 16px tab icon needs help keeping its outline.
    if (size <= 16) img = img.sharpen({ sigma: 0.6 });
    if (round) img = img.ensureAlpha().composite([{ input: roundedMask(size), blend: 'dest-in' }]);
    return img.png({ compressionLevel: 9 }).toBuffer();
}

// ICO container holding PNG images, which every current browser reads.
function ico(images) {
    const header = Buffer.alloc(6);
    header.writeUInt16LE(1, 2); // type: icon
    header.writeUInt16LE(images.length, 4);
    let offset = header.length + 16 * images.length;
    const entries = images.map(({ size, data }) => {
        const e = Buffer.alloc(16);
        e.writeUInt8(size, 0);
        e.writeUInt8(size, 1);
        e.writeUInt16LE(1, 4); // colour planes
        e.writeUInt16LE(32, 6); // bits per pixel
        e.writeUInt32LE(data.length, 8);
        e.writeUInt32LE(offset, 12);
        offset += data.length;
        return e;
    });
    return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const icoImages = await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(size) })));
fs.writeFileSync(`${OUT}/favicon.ico`, ico(icoImages));
fs.writeFileSync(`${OUT}/icon-192.png`, await png(192));
// iOS rounds the corners itself and shows transparency as black.
fs.writeFileSync(`${OUT}/apple-touch-icon.png`, await png(180, { round: false }));
console.log(`favicon.ico, icon-192.png, apple-touch-icon.png → ${OUT}/`);
