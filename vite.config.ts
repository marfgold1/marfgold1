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
import { blogIndex, scanPosts } from './plugins/blog-index.ts';
import { mdxCss } from './plugins/mdx-css.ts';
import { remarkKatexCss, katexWoff2Only } from './plugins/katex-css.ts';

const blogsDir = fileURLToPath(new URL('./src/blogs', import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(() => {
	const slugs = scanPosts(blogsDir, false).map((p) => p.slug);

	return {
		resolve: {
			alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
		},
		plugins: [
			blogIndex(blogsDir),
			katexWoff2Only(),
			{
				enforce: 'pre',
				...mdx({
					jsxImportSource: 'preact',
					remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter, remarkGfm, remarkMath, remarkKatexCss],
					rehypePlugins: [
						rehypeKatex,
						[rehypeShiki, { themes: { light: 'github-light', dark: 'github-dark' }, defaultColor: false, inline: 'tailing-curly-colon' }],
					],
				}),
			},
			preact({
				prerender: {
					enabled: true,
					renderTarget: '#app',
					additionalPrerenderRoutes: ['/404', '/blog', ...slugs.map((s) => `/blog/${s}`)],
					previewMiddlewareEnabled: true,
					previewMiddlewareFallback: '/404',
				},
			}),
			mdxCss(),
		],
	};
});
