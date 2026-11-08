declare module '*.mdx' {
	import type { ComponentType } from 'preact';
	import type { PostMeta } from '../plugins/blog-index';

	export const frontmatter: Omit<PostMeta, 'slug'>;
	const Content: ComponentType<{ components?: Record<string, ComponentType<any> | string> }>;
	export default Content;
}

declare module 'virtual:blog-index' {
	import type { PostMeta } from '../plugins/blog-index';
	export const posts: PostMeta[];
}
