// Checks the built site in dist/:
//   - every URL from the old Ghost sitemap/pagination still exists
//   - every internal href/src/srcset (and og:image) resolves to a file in dist
//   - no known-malicious strings made it into the output
// With --snapshots <dir>, also compares key elements against saved Ghost HTML.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = 'dist';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const legacyUrls = fs.readFileSync(path.join(ROOT, 'scripts/legacy-urls.txt'), 'utf8').split('\n').filter(Boolean);
const BLOCKLIST = ['camisetatienda', 'restrictes.com', 'apple99.cc', 'ghost_once_footer', '/rce'];

let failures = 0;
const fail = (msg) => {
    failures++;
    console.error('  ✗ ' + msg);
};

const fileFor = (urlPath) => {
    const p = decodeURI(urlPath.split(/[?#]/)[0]);
    const direct = path.join(DIST, p);
    if (p.endsWith('/')) return path.join(direct, 'index.html');
    return direct;
};

console.log('1. legacy URLs');
for (const u of legacyUrls) if (!fs.existsSync(fileFor(u))) fail(`missing page ${u}`);

function* walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) yield* walk(p);
        else yield p;
    }
}

console.log('2. internal references');
const checked = new Map();
let refs = 0;
for (const file of walk(DIST)) {
    if (!file.endsWith('.html') || file.startsWith(path.join(DIST, 'pagefind'))) continue;
    const html = fs.readFileSync(file, 'utf8');
    for (const bad of BLOCKLIST) if (html.includes(bad)) fail(`${file} contains "${bad}"`);

    const urls = [];
    for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) urls.push(m[1]);
    for (const m of html.matchAll(/\ssrcset="([^"]+)"/g)) urls.push(...m[1].split(',').map((s) => s.trim().split(/\s+/)[0]));
    for (const m of html.matchAll(/property="og:image" content="([^"]+)"/g)) urls.push(m[1]);

    for (let u of urls) {
        u = u.replace(/&amp;/g, '&');
        if (u.startsWith('https://junsong.xyz')) u = u.slice('https://junsong.xyz'.length) || '/';
        if (!u.startsWith('/') || u.startsWith('//')) continue;
        if (u.startsWith('/pagefind/')) continue;
        refs++;
        if (!checked.has(u)) checked.set(u, fs.existsSync(fileFor(u)));
        if (!checked.get(u)) fail(`${path.relative(DIST, file)} → ${u}`);
    }
}
console.log(`   ${refs} references, ${checked.size} unique`);

const snapIdx = process.argv.indexOf('--snapshots');
if (snapIdx > -1) {
    const snapDir = process.argv[snapIdx + 1];
    console.log('3. parity with Ghost snapshots');
    const decode = (s) =>
        s.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#x3D;/g, '=').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    const norm = (s) => decode(s).replace(/https:\/\/junsong\.xyz/g, '').replace(/\s+/g, ' ').trim();
    // The signup card was removed on purpose (no Ghost members anymore).
    const dropSignup = (h) => {
        const start = h.indexOf('<div class="kg-card kg-signup-card');
        if (start < 0) return h;
        const tag = /<\/?div\b[^>]*>/g;
        tag.lastIndex = start;
        let depth = 0;
        let t;
        while ((t = tag.exec(h))) {
            depth += t[0][1] === '/' ? -1 : 1;
            if (depth === 0) break;
        }
        return dropSignup(h.slice(0, start) + h.slice(tag.lastIndex));
    };
    const pick = {
        title: (h) => [h.match(/<title>([^<]*)/)?.[1]],
        'card links': (h) => [...h.matchAll(/class="gh-card-link" href="([^"]+)"/g)].map((m) => m[1]),
        'card images': (h) => [...h.matchAll(/class="gh-card-image">\s*<img\s+srcset="([^"]+)"/g)].map((m) => m[1].split(',')[0]),
        'card tags': (h) => [...h.matchAll(/class="gh-card-tag">([^<]*)/g)].map((m) => m[1]),
        'card dates': (h) => [...h.matchAll(/class="gh-card-date"[^>]*>([^<]*)/g)].map((m) => m[1]),
        'article title': (h) => [h.match(/gh-article-title is-title"[^>]*>([\s\S]*?)<\/h1>/)?.[1]],
        'primary tag': (h) => [h.match(/class="gh-article-tag" href="([^"]+)"/)?.[1]],
        'reading time': (h) => [h.match(/gh-article-meta-length"><span class="bull">—<\/span>([^<]*)/)?.[1]],
        'article date': (h) => [h.match(/gh-article-meta-date"[^>]*>([^<]*)/)?.[1]],
        'feature image': (h) => [h.match(/class="gh-article-image">\s*<img\s+srcset="([^"]+)"/)?.[1]],
        'see all': (h) => [String(h.includes('gh-more'))],
        'body text': (h) => {
            const m = h.match(/<section class="gh-content[^"]*"[^>]*>([\s\S]*?)<\/section>\s*<\/article>/);
            return m ? [m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000)] : [];
        },
    };
    // Every image URL the Ghost pages referenced must still resolve.
    const ghostImages = new Set();
    for (const file of walk(snapDir)) {
        const h = fs.readFileSync(file, 'utf8');
        for (const m of h.matchAll(/(?:https:\/\/junsong\.xyz)?(\/content\/images\/[^\s"'<>,)?]+)/g)) ghostImages.add(m[1]);
    }
    for (const img of ghostImages) if (!fs.existsSync(fileFor(img))) fail(`Ghost image URL gone: ${img}`);
    console.log(`   ${ghostImages.size} Ghost image URLs checked`);

    for (const u of legacyUrls) {
        const rel = u === '/' ? 'index' : u.replace(/^\/|\/$/g, '');
        const snapFile = path.join(snapDir, rel + '.html');
        if (!fs.existsSync(snapFile)) continue;
        const a = dropSignup(fs.readFileSync(snapFile, 'utf8'));
        const b = fs.readFileSync(fileFor(u), 'utf8');

        // Ghost alternated between the original and the w1200 variant for
        // og:image; what matters is that the URL social sites cached still works.
        const ghostOg = decode(a.match(/property="og:image" content="([^"]+)"/)?.[1] ?? '');
        if (ghostOg.startsWith('https://junsong.xyz/') && !fs.existsSync(fileFor(ghostOg.slice(19)))) {
            fail(`${u} Ghost og:image no longer resolves: ${ghostOg}`);
        }
        if (ghostOg && !/property="og:image"/.test(b)) fail(`${u} lost its og:image`);

        for (const [name, fn] of Object.entries(pick)) {
            const va = fn(a).map((x) => norm(x ?? ''));
            const vb = fn(b).map((x) => norm(x ?? ''));
            if (JSON.stringify(va) !== JSON.stringify(vb)) {
                const i = va.findIndex((x, k) => x !== vb[k]);
                fail(`${u} ${name}: ghost=${JSON.stringify(va[i])?.slice(0, 160)} new=${JSON.stringify(vb[i])?.slice(0, 160)} (${va.length} vs ${vb.length})`);
            }
        }
    }
}

console.log(failures ? `\n${failures} problem(s)` : '\nall checks passed');
process.exit(failures ? 1 : 0);
