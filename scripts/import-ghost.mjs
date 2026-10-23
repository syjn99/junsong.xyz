// One-off importer: Ghost JSON export -> src/content/legacy/*.json
//
// Usage: node scripts/import-ghost.mjs ghost-export/<export>.json
//
// Cleanup applied while importing (see the 2026 incident write-up):
//   - drops the attacker-created /rce* pages
//   - ignores per-post code injection entirely (it only ever held malware)
//   - strips SEO spam paragraphs and Ghost signup cards from post HTML
//   - rewrites __GHOST_URL__ to site-relative paths
import fs from 'node:fs';
import path from 'node:path';
import { readingTime } from '../src/lib/reading-time.mjs';

const SPAM_DOMAINS = ['camisetatienda.com'];
const BLOCKED_SLUGS = /^rce(-\d+)?$/;
const OUT_DIR = 'src/content/legacy';

const exportPath = process.argv[2];
if (!exportPath) {
    console.error('usage: node scripts/import-ghost.mjs <ghost-export.json>');
    process.exit(1);
}

const db = JSON.parse(fs.readFileSync(exportPath, 'utf8')).db[0].data;

const tagsById = new Map(db.tags.map((t) => [t.id, t]));
const metaByPost = new Map(db.posts_meta.map((m) => [m.post_id, m]));
const tagLinks = new Map();
for (const pt of [...db.posts_tags].sort((a, b) => a.sort_order - b.sort_order)) {
    if (!tagLinks.has(pt.post_id)) tagLinks.set(pt.post_id, []);
    tagLinks.get(pt.post_id).push(tagsById.get(pt.tag_id));
}

// Ghost saved some bookmark thumbnails without a file extension. Static hosts
// serve those as application/octet-stream (+ nosniff), so browsers refuse to
// render them. Keep the original file and add a copy with a real extension.
const IMAGES_DIR = 'public/content/images';
const MAGIC = [
    ['png', (b) => b[0] === 0x89 && b[1] === 0x50],
    ['jpg', (b) => b[0] === 0xff && b[1] === 0xd8],
    ['gif', (b) => b[0] === 0x47 && b[1] === 0x49],
    ['webp', (b) => b.toString('ascii', 8, 12) === 'WEBP'],
];
const extensionFixes = new Map();
for (const dir of ['thumbnail', 'icon']) {
    const abs = path.join(IMAGES_DIR, dir);
    if (!fs.existsSync(abs)) continue;
    for (const name of fs.readdirSync(abs)) {
        if (name.includes('.')) continue;
        const buf = fs.readFileSync(path.join(abs, name));
        const ext = MAGIC.find(([, test]) => test(buf))?.[0];
        if (!ext) continue;
        fs.copyFileSync(path.join(abs, name), path.join(abs, `${name}.${ext}`));
        extensionFixes.set(`/content/images/${dir}/${name}`, `/content/images/${dir}/${name}.${ext}`);
    }
}

const ghostUrl = (s) => {
    if (!s) return s;
    let out = s.replaceAll('__GHOST_URL__', '');
    for (const [from, to] of extensionFixes) out = out.replaceAll(`${from}"`, `${to}"`);
    return out;
};

const decode = (s) =>
    s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"');

// Returns cleaned html plus the text of removed spam paragraphs, so the same
// sentences can be dropped from Ghost's plaintext field.
function cleanHtml(html) {
    let out = html || '';
    const removed = [];
    for (const domain of SPAM_DOMAINS) {
        const esc = domain.replaceAll('.', '\\.');
        out = out.replace(new RegExp(`<p\\b[^>]*>(?:(?!</p>).)*${esc}(?:(?!</p>).)*</p>`, 'gs'), (m) => {
            removed.push(decode(m).trim());
            return '';
        });
        if (out.includes(domain)) throw new Error(`spam domain ${domain} survived cleanup`);
    }
    // Ghost's reading time counted the (hidden) signup card, so measure before removing it.
    const ghostReadingHtml = ghostUrl(out);
    // Signup cards need Ghost members, which the static site doesn't have.
    out = removeBalancedDiv(out, 'kg-signup-card');
    return { html: ghostUrl(out), removed, ghostReadingHtml };
}

function cleanPlaintext(text, removed) {
    let out = text || '';
    for (const r of removed) {
        // Ghost's plaintext keeps the link text but may differ in whitespace.
        const pattern = r.split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
        out = out.replace(new RegExp(`\\s*${pattern}`), '');
    }
    return out;
}

// Removes every <div class="... marker ..."> element including nested divs.
function removeBalancedDiv(html, marker) {
    const open = new RegExp(`<div class="[^"]*\\b${marker}\\b[^"]*"[^>]*>`, 'g');
    let m;
    while ((m = open.exec(html))) {
        let depth = 0;
        const tag = /<\/?div\b[^>]*>/g;
        tag.lastIndex = m.index;
        let t;
        while ((t = tag.exec(html))) {
            depth += t[0][1] === '/' ? -1 : 1;
            if (depth === 0) break;
        }
        html = html.slice(0, m.index) + html.slice(tag.lastIndex);
        open.lastIndex = m.index;
    }
    return html;
}

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const tagsUsed = new Map();
let count = 0;
for (const p of db.posts) {
    if (p.status !== 'published' || BLOCKED_SLUGS.test(p.slug)) continue;

    const tags = tagLinks.get(p.id) || [];
    // Ghost routes.yaml split collections by the internal #en / #ko tags.
    const lang = tags.some((t) => t.name === '#ko') ? 'ko' : 'en';
    const publicTags = tags.filter((t) => t.visibility === 'public');
    for (const t of tags) tagsUsed.set(t.slug, t);

    const meta = metaByPost.get(p.id) || {};
    const { html, removed, ghostReadingHtml } = cleanHtml(p.html);
    const plaintext = cleanPlaintext(p.plaintext, removed);
    if (/camiseta/i.test(plaintext)) throw new Error(`spam text survived in plaintext of ${p.slug}`);
    const entry = {
        type: p.type,
        slug: p.slug,
        lang: p.type === 'page' ? undefined : lang,
        title: p.title,
        html,
        plaintext,
        custom_excerpt: p.custom_excerpt || undefined,
        feature_image: ghostUrl(p.feature_image) || undefined,
        feature_image_alt: meta.feature_image_alt || undefined,
        feature_image_caption: ghostUrl(meta.feature_image_caption) || undefined,
        featured: Boolean(p.featured),
        show_title_and_feature_image: p.show_title_and_feature_image !== 0,
        tags: publicTags.map((t) => t.slug),
        // All tag slugs in Ghost's order, for {{post_class}} / {{body_class}}.
        class_tags: tags.map((t) => t.slug),
        // Ghost only exposes a primary tag when the first tag is public.
        primary_tag: tags[0]?.visibility === 'public' ? tags[0].slug : undefined,
        // Computed on Ghost's original HTML so migrated posts keep their label.
        reading_time: readingTime(ghostReadingHtml, Boolean(p.feature_image)),
        published_at: p.published_at,
        updated_at: p.updated_at,
        meta_title: meta.meta_title || undefined,
        meta_description: meta.meta_description || undefined,
    };
    fs.writeFileSync(path.join(OUT_DIR, `${p.slug}.json`), JSON.stringify(entry, null, 2) + '\n');
    count++;
}

const tagsOut = [...tagsUsed.values()]
    .filter((t) => t.visibility === 'public')
    .map((t) => ({ slug: t.slug, name: t.name, description: t.description || undefined, feature_image: ghostUrl(t.feature_image) || undefined }));
fs.writeFileSync('src/data/tags.json', JSON.stringify(tagsOut, null, 2) + '\n');

console.log(`imported ${count} entries, ${tagsOut.length} public tags`);
