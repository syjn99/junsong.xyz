import type { APIRoute } from 'astro';
import { getPages, getPosts, getTags } from '../lib/posts';
import { absoluteUrl } from '../lib/ghost';
import { site } from '../site.config';

export const GET: APIRoute = async () => {
    const posts = await getPosts();
    const pages = await getPages();
    // Same set of tag pages as tag-routes.ts: every tag at /tag/x/, plus /ko/tag/x/ where Korean posts exist.
    const tags = [...(await getTags()).map((t) => ({ ...t, url: `/tag/${t.slug}/` })), ...(await getTags('ko'))];
    const newest = posts[0]?.updatedAt ?? new Date();

    const urls: { loc: string; lastmod?: Date }[] = [
        { loc: '/', lastmod: newest },
        { loc: '/ko/', lastmod: newest },
        ...pages.map((p) => ({ loc: p.url, lastmod: p.updatedAt })),
        ...posts.map((p) => ({ loc: p.url, lastmod: p.updatedAt })),
        ...tags.map((t) => ({ loc: t.url })),
        { loc: `/author/${site.author.slug}/` },
    ];

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
    .map(
        (u) =>
            `  <url><loc>${absoluteUrl(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod.toISOString()}</lastmod>` : ''}</url>`,
    )
    .join('\n')}
</urlset>
`;
    return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
