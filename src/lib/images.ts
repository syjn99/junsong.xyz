import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const cache = new Map<string, { width: number; height: number } | null>();

// Dimensions of a local /content/images file. External images return null.
export async function imageDimensions(src: string | undefined) {
    if (!src || !src.startsWith('/content/images/')) return null;
    if (!cache.has(src)) {
        const file = path.join('public', decodeURI(src));
        if (!fs.existsSync(file)) {
            cache.set(src, null);
        } else {
            const meta = await sharp(file).metadata();
            cache.set(src, meta.width && meta.height ? { width: meta.width, height: meta.height } : null);
        }
    }
    return cache.get(src) ?? null;
}
