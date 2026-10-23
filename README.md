# junsong.xyz

Static version of Jun's Log, migrated from a self-hosted Ghost 6 install in
October 2026. Built with [Astro](https://astro.build), hosted on GitHub Pages.
The look is a port of Ghost's [Source](https://github.com/TryGhost/Source)
theme (MIT, see `public/assets/SOURCE-THEME-LICENSE`), and every URL and image
path from the Ghost site is preserved.

## Writing a post

Full guide (Korean): [docs/writing.md](docs/writing.md)

```bash
nvm use                     # Node version from .nvmrc
npm install                 # first time only
npm run new -- "My post title"          # → src/content/posts/en/my-post-title.md  → /my-post-title/
npm run new -- "제목" --ko --slug my-slug # → src/content/posts/ko/my-slug.md       → /ko/my-slug/
npm run dev                 # preview at http://localhost:4321 (drafts are visible here)
```

Front matter:

| field | notes |
| --- | --- |
| `title` | required |
| `date` | publish date; posts are ordered by it |
| `tags` | tag slugs, e.g. `[retrospect, open-source]`. The first one is shown as the primary tag. Existing: `retrospect`, `open-source`, `core`, `frontend`, `archive` |
| `excerpt` | optional; used for cards and social previews. Otherwise the first ~50 words |
| `feature_image` | optional; e.g. `/content/images/2026/11/cover.jpg` (file in `public/content/images/…`) or an external URL |
| `feature_image_caption` | optional, HTML allowed |
| `slug` | optional; defaults to the file name |
| `translation` | optional; slug of the same post in the other language, e.g. `translation: my-post-ko` in `en/my-post.md`. Setting it on either side is enough |
| `draft` | `true` keeps it out of the production build |

Images go in `public/content/images/<year>/<month>/` and are referenced as
`/content/images/<year>/<month>/<file>`. Resized/WebP variants for cards are
generated at build time.

## Languages

English is the default and lives at the root (`/`, `/my-post/`, `/tag/x/`);
Korean lives under `/ko/`. The EN | KO switch in the header goes to the same
post in the other language when a `translation` is set, otherwise to that
language's home or tag page. Home, tag pages, "Read more" and search only show
posts in the current language. Translations of migrated Ghost posts are listed
in `src/data/translations.json`.

Publish by committing and pushing to `main`. GitHub Actions builds, runs the
link/image checks (`npm run verify`) and deploys to GitHub Pages.

## Layout

```
src/content/legacy/   posts migrated from Ghost (pre-rendered HTML; don't hand-edit unless needed)
src/content/posts/    new Markdown posts, by language
src/site.config.ts    title, navigation, author, theme options
src/lib/ghost.ts      Ghost helper equivalents (img_url, excerpt, dates)
public/content/images all images, same paths as on Ghost
scripts/              importer, postbuild (image variants + search index), verify, new-post
```

Search is [Pagefind](https://pagefind.app), built from the static output.

## Re-running the Ghost import

Only needed if the legacy content must be regenerated from an export:

```bash
node scripts/import-ghost.mjs ghost-export/<export>.json
```

The importer drops the attacker-created `/rce*` pages, ignores Ghost code
injection, strips the SEO spam paragraphs and signup cards, and rewrites
`__GHOST_URL__` to relative paths.
