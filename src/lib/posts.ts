import { getCollection } from 'astro:content';
import tagData from '../data/tags.json';
import translationData from '../data/translations.json';
import seriesData from '../data/series.json';
import { site } from '../site.config';
import { readingTime } from './reading-time.mjs';
import { tagUrl, type Lang } from './i18n';

export type { Lang };

export interface Tag {
    slug: string;
    name: string;
    description?: string;
    feature_image?: string;
    url: string;
}

export interface Post {
    type: 'post' | 'page';
    slug: string;
    lang?: Lang;
    url: string;
    title: string;
    html: string;
    plaintext: string;
    customExcerpt?: string;
    featureImage?: string;
    featureImageAlt?: string;
    featureImageCaption?: string;
    featured: boolean;
    showTitleAndFeatureImage: boolean;
    tags: Tag[];
    primaryTag?: Tag;
    classTags: string[];
    readingTime: string;
    // URL of the same post in the other language, if one exists.
    translation?: string;
    series?: Series;
    publishedAt: Date;
    updatedAt: Date;
    metaTitle?: string;
    metaDescription?: string;
}

// A run of posts in one language, oldest first (src/data/series.json or `series:` front matter).
export interface Series {
    id: string;
    name: string;
    posts: { title: string; url: string }[];
    // Position of the post this is attached to.
    index: number;
}

const seriesDefs = seriesData as Record<string, { name: Record<Lang, string>; posts: string[] }>;
const seriesBySlug = new Map(Object.entries(seriesDefs).flatMap(([id, s]) => s.posts.map((slug) => [slug, id] as const)));

// `open-source` -> "Open Source"
const nameFromSlug = (slug: string) => slug.replace(/(^|-)(\w)/g, (_, sep, c) => (sep ? ' ' : '') + c.toUpperCase());

const tagsBySlug = new Map<string, Omit<Tag, 'url'>>((tagData as Omit<Tag, 'url'>[]).map((t) => [t.slug, t]));

// A tag links to its page in the given language: /tag/x/ or /ko/tag/x/.
export function resolveTag(slug: string, lang?: Lang): Tag {
    let tag = tagsBySlug.get(slug);
    if (!tag) {
        // New tag introduced by a Markdown post: name it after the slug.
        tag = { slug, name: nameFromSlug(slug) };
        tagsBySlug.set(slug, tag);
    }
    return { ...tag, url: tagUrl(slug, lang) };
}

const stripTags = (html: string) =>
    html
        .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
        .replace(/<\/(p|h[1-6]|li|blockquote|pre|figure)>/gi, '\n\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim();

let cache: Post[] | undefined;

async function load(): Promise<Post[]> {
    if (cache) return cache;

    const legacy = (await getCollection('legacy')).map(({ data: d }): Post => {
        const tags = d.tags.map((t) => resolveTag(t, d.lang));
        return {
            type: d.type,
            slug: d.slug,
            lang: d.lang,
            url: d.type === 'page' ? `/${d.slug}/` : d.lang === 'ko' ? `/ko/${d.slug}/` : `/${d.slug}/`,
            title: d.title,
            html: d.html,
            plaintext: d.plaintext,
            customExcerpt: d.custom_excerpt,
            featureImage: d.feature_image,
            featureImageAlt: d.feature_image_alt,
            featureImageCaption: d.feature_image_caption,
            featured: d.featured,
            showTitleAndFeatureImage: d.show_title_and_feature_image,
            tags,
            primaryTag: d.primary_tag ? resolveTag(d.primary_tag, d.lang) : undefined,
            classTags: d.class_tags,
            readingTime: d.reading_time,
            publishedAt: d.published_at,
            updatedAt: d.updated_at,
            metaTitle: d.meta_title,
            metaDescription: d.meta_description,
        };
    });

    // en slug -> ko slug, from translations.json and `translation:` front matter.
    const pairs = new Map<string, string>(Object.entries(translationData));
    // Series ids from `series:` front matter.
    const markdownSeries = new Map<Post, string>();
    const markdown = (await getCollection('posts', ({ data }) => import.meta.env.DEV || !data.draft)).map(
        (entry): Post => {
            const d = entry.data;
            const lang = entry.id.split('/')[0] as Lang;
            const slug = d.slug ?? entry.id.split('/').pop()!;
            const html = entry.rendered?.html ?? '';
            const tags = d.tags.map((t) => resolveTag(t, lang));
            if (d.translation) {
                if (lang === 'en') pairs.set(slug, d.translation);
                else pairs.set(d.translation, slug);
            }
            const post: Post = {
                type: 'post',
                slug,
                lang,
                url: lang === 'ko' ? `/ko/${slug}/` : `/${slug}/`,
                title: d.title,
                html,
                plaintext: stripTags(html),
                customExcerpt: d.excerpt,
                featureImage: d.feature_image,
                featureImageAlt: d.feature_image_alt,
                featureImageCaption: d.feature_image_caption,
                featured: d.featured,
                showTitleAndFeatureImage: true,
                tags,
                primaryTag: tags[0],
                classTags: [...d.tags, lang],
                readingTime: readingTime(html, !!d.feature_image),
                publishedAt: d.date,
                updatedAt: d.updated ?? d.date,
            };
            if (d.series) markdownSeries.set(post, d.series);
            return post;
        },
    );

    const all = [...legacy, ...markdown].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    const seen = new Set<string>();
    for (const p of all) {
        if (seen.has(p.url)) throw new Error(`Duplicate URL ${p.url} (slug "${p.slug}")`);
        seen.add(p.url);
    }
    const urls = new Map(all.filter((p) => p.type === 'post').map((p) => [`${p.lang}/${p.slug}`, p]));
    for (const [en, ko] of pairs) {
        const a = urls.get(`en/${en}`);
        const b = urls.get(`ko/${ko}`);
        // A draft counterpart is missing from production builds; skip the link then.
        if (!a || !b) continue;
        a.translation = b.url;
        b.translation = a.url;
    }

    // Series: group by id and language, oldest first.
    const runs = new Map<string, Post[]>();
    for (const p of [...all].reverse()) {
        const id = markdownSeries.get(p) ?? seriesBySlug.get(p.slug);
        if (!id || p.type !== 'post') continue;
        const key = `${id}/${p.lang}`;
        runs.set(key, [...(runs.get(key) ?? []), p]);
    }
    for (const [key, posts] of runs) {
        const [id, lang] = key.split('/') as [string, Lang];
        const name = seriesDefs[id]?.name[lang] ?? nameFromSlug(id);
        const list = posts.map((p) => ({ title: p.title, url: p.url }));
        posts.forEach((p, index) => (p.series = { id, name, posts: list, index }));
    }

    cache = all;
    return all;
}

// Ghost orders by published_at desc.
export async function getPosts(filter?: { lang?: Lang; tag?: string }): Promise<Post[]> {
    return (await load()).filter(
        (p) =>
            p.type === 'post' &&
            (!filter?.lang || p.lang === filter.lang) &&
            (!filter?.tag || p.tags.some((t) => t.slug === filter.tag)),
    );
}

export async function getPages(): Promise<Post[]> {
    return (await load()).filter((p) => p.type === 'page');
}

// Tags used by posts in `lang` (all posts when omitted), linking to that language's tag pages.
export async function getTags(lang?: Lang): Promise<Tag[]> {
    const posts = await getPosts({ lang });
    const used = new Set(posts.flatMap((p) => p.tags.map((t) => t.slug)));
    return [...used].map((slug) => resolveTag(slug, lang));
}

// Ghost's {{post_class}}
export function postClass(p: Post): string {
    return [p.type, ...p.classTags.map((s) => `tag-${s}`), p.featured ? 'featured' : '', p.featureImage ? '' : 'no-image']
        .filter(Boolean)
        .join(' ');
}

export function paginate<T>(items: T[], page: number, perPage = site.postsPerPage) {
    const pages = Math.max(1, Math.ceil(items.length / perPage));
    return { items: items.slice((page - 1) * perPage, page * perPage), page, pages };
}
