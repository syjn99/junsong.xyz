import { getPosts, getTags, paginate, type Post, type Tag } from './posts';
import { tagUrl, type Lang } from './i18n';

export interface TagRouteProps {
    tag: Tag;
    page: number;
    pages: number;
    posts: Post[];
    // The same tag's page in the other language, if it has posts there.
    other?: string;
}

// /tag/<slug>/ lists English posts and /ko/tag/<slug>/ Korean posts.
// A tag with no English posts keeps /tag/<slug>/ (old links) and lists them all.
export async function tagRoutes(lang: Lang) {
    const otherLang: Lang = lang === 'ko' ? 'en' : 'ko';
    const inLang = new Set((await getTags(lang)).map((t) => t.slug));
    const inOther = new Set((await getTags(otherLang)).map((t) => t.slug));
    const slugs = lang === 'en' ? [...inLang, ...[...inOther].filter((s) => !inLang.has(s))] : [...inLang];

    const routes = [];
    for (const slug of slugs) {
        const all = await getPosts({ tag: slug, lang: inLang.has(slug) ? lang : undefined });
        const tag = (await getTags()).find((t) => t.slug === slug)!;
        const { pages } = paginate(all, 1);
        for (let page = 1; page <= pages; page++) {
            routes.push({
                params: { path: page === 1 ? slug : `${slug}/page/${page}` },
                props: {
                    tag,
                    page,
                    pages,
                    posts: paginate(all, page).items,
                    other: inOther.has(slug) && inLang.has(slug) ? tagUrl(slug, otherLang) : undefined,
                } satisfies TagRouteProps,
            });
        }
    }
    return routes;
}
