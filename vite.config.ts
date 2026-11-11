import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import mdx from '@mdx-js/rollup';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeShiki from '@shikijs/rehype';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { createCssVariablesTheme } from 'shiki';
import { blogIndex, scanPosts } from './plugins/blog-index.ts';
import { projectIndex } from './plugins/project-index.ts';
import { mdxCss } from './plugins/mdx-css.ts';
import { remarkKatexCss, katexWoff2Only } from './plugins/katex-css.ts';

const blogsDir = fileURLToPath(new URL('./src/blogs', import.meta.url));
const projectsDir = fileURLToPath(new URL('./src/projects', import.meta.url));

// Code colours come from CSS variables (--shiki-token-*), mapped to the site tokens in
// src/styles/post.css, so one definition covers light and dark.
const shikiTheme = createCssVariablesTheme({
	name: 'site',
	variablePrefix: '--shiki-',
	variableDefaults: {},
	fontStyle: true,
});

// https://vitejs.dev/config/
export default defineConfig(() => {
	const slugs = scanPosts(blogsDir, false).map((p) => p.slug);

	return {
		resolve: {
			alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
		},
		plugins: [
			blogIndex(blogsDir),
			projectIndex(projectsDir),
			katexWoff2Only(),
			{
				enforce: 'pre',
				...mdx({
					jsxImportSource: 'preact',
					remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter, remarkGfm, remarkMath, remarkKatexCss],
					rehypePlugins: [
						rehypeSlug, // heading ids for deep links and the reading progress UI
						[rehypeAutolinkHeadings, { behavior: 'wrap' }], // the heading text itself links to its anchor
						rehypeKatex,
						[rehypeShiki, { theme: shikiTheme, inline: 'tailing-curly-colon' }],
					],
				}),
			},
			preact({
				prerender: {
					enabled: true,
					renderTarget: '#app',
					additionalPrerenderRoutes: ['/404', '/blog', '/projects', ...slugs.map((s) => `/blog/${s}`)],
					previewMiddlewareEnabled: true,
					previewMiddlewareFallback: '/404',
				},
			}),
			mdxCss(),
		],
	};
});
