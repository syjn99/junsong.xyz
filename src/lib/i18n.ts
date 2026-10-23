// Language helpers for the EN/KO switch. English is the default language and
// lives at the site root; Korean lives under /ko/.
export type Lang = 'en' | 'ko';

export const langs: Lang[] = ['en', 'ko'];

export const langPrefix = (lang?: Lang) => (lang === 'ko' ? '/ko' : '');
export const homeUrl = (lang?: Lang) => `${langPrefix(lang)}/`;
export const tagUrl = (slug: string, lang?: Lang) => `${langPrefix(lang)}/tag/${slug}/`;

// Interface strings that change with the language.
export const ui = {
    en: { latest: 'Latest', seeAll: 'See all', readMore: 'Read more', search: 'Search posts, tags and authors' },
    ko: { latest: '최신 글', seeAll: '전체 보기', readMore: '다른 글', search: '글, 태그 검색' },
} satisfies Record<Lang, Record<string, string>>;

// Where the switch sends you for each language.
export type Alternates = Record<Lang, string>;
