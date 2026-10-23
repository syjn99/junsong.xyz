// Runs after `astro build`:
//  1. Ghost served /content/images/size/w<N>/[format/webp/]<path> on demand.
//     Generate any such variant the built HTML references but dist lacks.
//  2. Build the Pagefind search index.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const DIST = 'dist';

function* walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) yield* walk(p);
        else yield p;
    }
}

const wanted = new Set();
for (const file of walk(DIST)) {
    if (!file.endsWith('.html')) continue;
    const html = fs.readFileSync(file, 'utf8');
    for (const m of html.matchAll(/(?:https:\/\/junsong\.xyz)?(\/content\/images\/size\/w\d+\/[^\s"'<>,)]+)/g)) {
        wanted.add(decodeURI(m[1]));
    }
}

let generated = 0;
const missing = [];
for (const url of wanted) {
    const out = path.join(DIST, url);
    if (fs.existsSync(out)) continue;
    const m = url.match(/^\/content\/images\/size\/w(\d+)\/(?:format\/(webp|avif|png|jpe?g)\/)?(.+)$/);
    const src = m && path.join(DIST, 'content/images', m[3]);
    if (!m || !fs.existsSync(src)) {
        missing.push(url);
        continue;
    }
    fs.mkdirSync(path.dirname(out), { recursive: true });
    let img = sharp(src, { animated: true }).rotate().resize({ width: Number(m[1]), withoutEnlargement: true });
    if (m[2]) img = img.toFormat(m[2] === 'jpg' ? 'jpeg' : m[2]);
    await img.toFile(out);
    generated++;
}
console.log(`[postbuild] image variants: ${wanted.size} referenced, ${generated} generated`);
if (missing.length) {
    console.error(`[postbuild] ${missing.length} variants have no source image:\n  ${missing.join('\n  ')}`);
    process.exit(1);
}

execFileSync('npx', ['pagefind', '--site', DIST], { stdio: 'inherit' });
