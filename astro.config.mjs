import { defineConfig } from 'astro/config';

export default defineConfig({
    site: 'https://junsong.xyz',
    // Ghost URLs all end with a slash: /slug/, /tag/x/, /page/2/
    trailingSlash: 'always',
    build: { format: 'directory' },
    markdown: {
        // Ghost used Prism (loaded in the footer) for code highlighting.
        syntaxHighlight: false,
    },
});
