// npm run new -- "Post title" [--ko] [--slug custom-slug]
// Creates src/content/posts/<lang>/<slug>.md and an image folder for this month.
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const ko = args.includes('--ko');
const slugIdx = args.indexOf('--slug');
const title = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--slug').join(' ').trim();
if (!title) {
    console.error('usage: npm run new -- "Post title" [--ko] [--slug custom-slug]');
    process.exit(1);
}

const slug =
    slugIdx > -1
        ? args[slugIdx + 1]
        : title
              .toLowerCase()
              .normalize('NFKD')
              .replace(/[^a-z0-9\s-]/g, '')
              .trim()
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-');
if (!slug) {
    console.error('Could not derive a slug from the title; pass --slug my-post');
    process.exit(1);
}

const lang = ko ? 'ko' : 'en';
const file = path.join('src/content/posts', lang, `${slug}.md`);
if (fs.existsSync(file) || fs.existsSync(path.join('src/content/legacy', `${slug}.json`))) {
    console.error(`A post with slug "${slug}" already exists.`);
    process.exit(1);
}

const now = new Date();
const month = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
const imageDir = path.join('public/content/images', month);
fs.mkdirSync(imageDir, { recursive: true });
fs.mkdirSync(path.dirname(file), { recursive: true });

fs.writeFileSync(
    file,
    `---
title: ${JSON.stringify(title)}
date: ${now.toISOString()}
tags: []
# excerpt: "One-line summary for cards and social previews"
# feature_image: /content/images/${month}/cover.jpg
# feature_image_caption: "Photo by …"
# translation: ${ko ? 'english-post-slug' : 'korean-post-slug'}   # same post in the other language
draft: true
---

<!--
Images: put files in ${imageDir}/ and reference them as
![alt text](/content/images/${month}/example.png)
-->

Write here.
`,
);

console.log(`Created ${file}`);
console.log(`URL when published: ${ko ? '/ko' : ''}/${slug}/`);
console.log('Remove `draft: true` when it is ready.');
