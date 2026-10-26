import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Posts and pages migrated from Ghost: pre-rendered HTML, kept as-is.
const legacy = defineCollection({
    loader: glob({ pattern: '*.json', base: './src/content/legacy' }),
    schema: z.object({
        type: z.enum(['post', 'page']),
        slug: z.string(),
        lang: z.enum(['en', 'ko']).optional(),
        title: z.string(),
        html: z.string(),
        plaintext: z.string(),
        custom_excerpt: z.string().optional(),
        feature_image: z.string().optional(),
        feature_image_alt: z.string().optional(),
        feature_image_caption: z.string().optional(),
        featured: z.boolean(),
        show_title_and_feature_image: z.boolean(),
        tags: z.array(z.string()),
        class_tags: z.array(z.string()),
        primary_tag: z.string().optional(),
        reading_time: z.string(),
        published_at: z.coerce.date(),
        updated_at: z.coerce.date(),
        meta_title: z.string().optional(),
        meta_description: z.string().optional(),
    }),
});

// New writing: src/content/posts/{en,ko}/<slug>.md
// The folder decides the language and URL (/slug/ or /ko/slug/).
const posts = defineCollection({
    loader: glob({ pattern: '{en,ko}/**/*.md', base: './src/content/posts' }),
    schema: z.object({
        title: z.string(),
        date: z.coerce.date(),
        updated: z.coerce.date().optional(),
        slug: z.string().optional(),
        tags: z.array(z.string()).default([]),
        excerpt: z.string().optional(),
        feature_image: z.string().optional(),
        feature_image_alt: z.string().optional(),
        feature_image_caption: z.string().optional(),
        featured: z.boolean().default(false),
        // Slug of the same post in the other language (for the EN/KO switch).
        translation: z.string().optional(),
        // Series id, e.g. `half-year-retrospect` (see src/data/series.json).
        series: z.string().optional(),
        draft: z.boolean().default(false),
    }),
});

export const collections = { legacy, posts };
