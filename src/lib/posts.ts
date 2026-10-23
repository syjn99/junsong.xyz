import { getCollection } from 'astro:content';
import tagData from '../data/tags.json';
import { site } from '../site.config';
import { readingTime } from './reading-time.mjs';

export type Lang = 'en' | 'ko';

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
    publishedAt: Date;
    updatedAt: Date;
    metaTitle?: string;
    metaDescription?: string;
}

const tagsBySlug = new Map<string, Tag>(
    (tagData as Omit<Tag, 'url'>[]).map((t) => [t.slug, { ...t, url: `/tag/${t.slug}/` }]),
);

function resolveTag(slug: string): Tag {
    let tag = tagsBySlug.get(slug);
    if (!tag) {
        // New tag introduced by a Markdown post: name it after the slug.
        const name = slug.replace(/(^|-)(\w)/g, (_, sep, c) => (sep ? ' ' : '') + c.toUpperCase());
        tag = { slug, name, url: `/tag/${slug}/` };
        tagsBySlug.set(slug, tag);
    }
    return tag;
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
        const tags = d.tags.map(resolveTag);
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
            primaryTag: d.primary_tag ? resolveTag(d.primary_tag) : undefined,
            classTags: d.class_tags,
            readingTime: d.reading_time,
            publishedAt: d.published_at,
            updatedAt: d.updated_at,
            metaTitle: d.meta_title,
            metaDescription: d.meta_description,
        };
    });

    const markdown = (await getCollection('posts', ({ data }) => import.meta.env.DEV || !data.draft)).map(
        (entry): Post => {
            const d = entry.data;
            const lang = entry.id.split('/')[0] as Lang;
            const slug = d.slug ?? entry.id.split('/').pop()!;
            const html = entry.rendered?.html ?? '';
            const tags = d.tags.map(resolveTag);
            return {
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
        },
    );

    const all = [...legacy, ...markdown].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    const seen = new Set<string>();
    for (const p of all) {
        if (seen.has(p.url)) throw new Error(`Duplicate URL ${p.url} (slug "${p.slug}")`);
        seen.add(p.url);
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

export async function getTags(): Promise<Tag[]> {
    const posts = await getPosts();
    const used = new Set(posts.flatMap((p) => p.tags.map((t) => t.slug)));
    return [...used].map(resolveTag);
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
