// Re-implementations of the Ghost theme helpers the Source theme relies on,
// so migrated pages render the same URLs and text Ghost produced.
import { site } from '../site.config';

// Source theme package.json "image_sizes"
export const imageSizes = { xs: 160, s: 320, m: 600, l: 960, xl: 1200, xxl: 2000 } as const;
export type ImageSize = keyof typeof imageSizes;

const UNRESIZABLE = /\.(svg|ico)$/i;

// {{img_url image size="m" format="webp"}}
export function imgUrl(src: string | undefined, size?: ImageSize, format?: 'webp'): string {
    if (!src) return '';
    if (!size) return src;
    const width = imageSizes[size];

    if (src.startsWith('https://images.unsplash.com/')) {
        const url = new URL(src);
        url.searchParams.set('w', String(width));
        if (format) url.searchParams.set('fm', format);
        return url.toString();
    }

    const local = src.match(/^(?:https?:\/\/junsong\.xyz)?\/content\/images\/(.+)$/);
    if (!local || UNRESIZABLE.test(local[1])) return src;
    const fmt = format && !/\.gif$/i.test(local[1]) ? `format/${format}/` : '';
    return `/content/images/size/w${width}/${fmt}${local[1]}`;
}

export function absoluteUrl(path: string): string {
    return new URL(path, site.url).toString();
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// {{date format="DD MMM YYYY"}} in the site timezone (moment-style month names)
export function formatDate(date: Date): string {
    const [y, m, d] = isoDate(date).split('-');
    return `${d} ${MONTHS[Number(m) - 1]} ${y}`;
}

// {{date format="YYYY-MM-DD"}}
export function isoDate(date: Date): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: site.timezone }).format(date);
}

// {{reading_time}}
export { readingTime } from './reading-time.mjs';

// Truncate to N words, keeping the original whitespace (like `downsize`).
function truncateWords(text: string, words: number): string {
    let seen = 0;
    const re = /\S+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
        seen += 1;
        if (seen === words) return text.slice(0, m.index + m[0].length);
    }
    return text;
}

// Ghost's generateExcerpt over HTML or plaintext.
function generateExcerpt(input: string, words = 50): string {
    const text = input
        .replace(/<a href="#fn.*?rel="footnote">.*?<\/a>/gi, '')
        .replace(/<div class="footnotes"><ol>.*?<\/ol><\/div>/, '')
        .replace(/(<\/p>|<br>)/gi, ' ')
        .replace(/<\/?[^>]+>/gi, '')
        .replace(/&nbsp;/g, ' ');
    return truncateWords(text, words).trim();
}

// {{excerpt}} as used by post cards
export function cardExcerpt(post: { customExcerpt?: string; plaintext: string }): string {
    return post.customExcerpt ?? generateExcerpt(post.plaintext.slice(0, 500));
}

// og:description / twitter:description
export function metaDescription(post: { customExcerpt?: string; metaDescription?: string; html: string }): string {
    return post.metaDescription ?? post.customExcerpt ?? generateExcerpt(post.html).replace(/\n+/g, '\n');
}

// JSON-LD description
export function ldDescription(post: { customExcerpt?: string; plaintext: string }): string {
    return post.customExcerpt ?? post.plaintext.slice(0, 500);
}
