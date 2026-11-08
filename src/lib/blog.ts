import { posts } from 'virtual:blog-index';
import type { PostMeta } from '../../plugins/blog-index';

export type { PostMeta };

export const getPosts = (): PostMeta[] => posts;
export const getPost = (slug: string): PostMeta | undefined => posts.find((p) => p.slug === slug);

export const formatDate = (iso: string) =>
	new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		timeZone: 'UTC', // fixed tz keeps SSR and client output identical
	});
