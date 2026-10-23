import type { Seo } from '../layouts/Base.astro';
import type { Post } from './posts';
import { site } from '../site.config';
import { absoluteUrl, imgUrl, ldDescription, metaDescription } from './ghost';
import { imageDimensions } from './images';

const pagedTitle = (title: string, page: number) => (page > 1 ? `${title} (Page ${page})` : title);

// Ghost's og:image: local images wider than 1200px use the w1200 variant,
// anything else (smaller or external) keeps the original URL.
async function socialImage(src: string) {
    const dims = await imageDimensions(src);
    if (!dims) return { url: src, width: undefined, height: undefined };
    if (dims.width <= 1200) return { url: src, ...dims };
    return { url: imgUrl(src, 'xl'), width: 1200, height: Math.round((dims.height * 1200) / dims.width) };
}

export function collectionSeo(page: number): Seo {
    return {
        title: pagedTitle(site.title, page),
        description: page === 1 ? site.description : undefined,
        image: page === 1 ? site.coverImage : undefined,
    };
}

export function archiveSeo(name: string, page: number, opts: { coverImage?: boolean } = {}): Seo {
    return { title: pagedTitle(`${name} - ${site.title}`, page), image: opts.coverImage ? site.coverImage : undefined };
}

export async function postSeo(post: Post): Promise<Seo> {
    const { url: image, ...dims } = await socialImage(post.featureImage ?? site.coverImage);
    const url = absoluteUrl(post.url);
    const authorImage = absoluteUrl(site.author.profileImage);
    const tagNames = post.tags.map((t) => t.name);

    return {
        title: post.metaTitle ?? post.title,
        description: metaDescription(post),
        type: 'article',
        image,
        imageWidth: dims.width,
        imageHeight: dims.height,
        publishedTime: post.publishedAt,
        modifiedTime: post.updatedAt,
        tags: tagNames,
        author: true,
        jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'Article',
            publisher: {
                '@type': 'Organization',
                name: site.title,
                url: absoluteUrl('/'),
                logo: { '@type': 'ImageObject', url: absoluteUrl('/favicon.ico'), width: 48, height: 48 },
            },
            author: {
                '@type': 'Person',
                name: site.author.name,
                image: { '@type': 'ImageObject', url: authorImage },
                url: absoluteUrl(`/author/${site.author.slug}/`),
                sameAs: [`https://x.com/${site.author.twitter.replace(/^@/, '')}`],
            },
            headline: post.title,
            url,
            datePublished: post.publishedAt.toISOString(),
            dateModified: post.updatedAt.toISOString(),
            ...(post.featureImage && {
                image: {
                    '@type': 'ImageObject',
                    url: absoluteUrl(image),
                    ...(dims.width && { width: dims.width, height: dims.height }),
                },
            }),
            ...(tagNames.length && { keywords: tagNames.join(', ') }),
            description: ldDescription(post),
            mainEntityOfPage: url,
        },
    };
}
