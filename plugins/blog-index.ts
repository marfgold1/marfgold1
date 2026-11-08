import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import matter from 'gray-matter';
import type { Plugin } from 'vite';

export interface PostMeta {
	slug: string;
	title: string;
	date: string;
	description: string;
	tags: string[];
	updated?: string;
	cover?: string;
	draft?: boolean;
}

const VIRTUAL_ID = 'virtual:blog-index';
const RESOLVED_ID = '\0' + VIRTUAL_ID;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function toDateString(v: unknown): string | undefined {
	// YAML parses bare dates into Date objects
	if (v instanceof Date) return v.toISOString().slice(0, 10);
	if (typeof v === 'string') return v;
	return undefined;
}

export function scanPosts(blogsDir: string, includeDrafts: boolean): PostMeta[] {
	const posts: PostMeta[] = [];

	for (const file of readdirSync(blogsDir)) {
		if (!file.endsWith('.mdx')) continue;
		const slug = basename(file, '.mdx');
		const { data } = matter(readFileSync(join(blogsDir, file), 'utf8'));
		const fail = (msg: string) => {
			throw new Error(`[blog] ${file}: ${msg}`);
		};

		if (typeof data.title !== 'string' || !data.title) fail('`title` (string) is required');
		if (typeof data.description !== 'string' || !data.description) fail('`description` (string) is required');
		const date = toDateString(data.date);
		if (!date || !DATE_RE.test(date)) fail('`date` must be YYYY-MM-DD');
		if (!Array.isArray(data.tags) || !data.tags.every((t) => typeof t === 'string')) {
			fail('`tags` must be an array of strings');
		}
		const updated = toDateString(data.updated);
		if (updated && !DATE_RE.test(updated)) fail('`updated` must be YYYY-MM-DD');

		if (data.draft && !includeDrafts) continue;

		posts.push({
			slug,
			title: data.title,
			date: date!,
			description: data.description,
			tags: data.tags,
			...(updated && { updated }),
			...(typeof data.cover === 'string' && { cover: data.cover }),
			...(data.draft && { draft: true }),
		});
	}

	return posts.sort((a, b) => b.date.localeCompare(a.date));
}

export function blogIndex(blogsDir: string): Plugin {
	let includeDrafts = true;

	return {
		name: 'blog-index',
		configResolved(config) {
			includeDrafts = config.command === 'serve';
		},
		resolveId(id) {
			if (id === VIRTUAL_ID) return RESOLVED_ID;
		},
		load(id) {
			if (id !== RESOLVED_ID) return;
			return `export const posts = ${JSON.stringify(scanPosts(blogsDir, includeDrafts))};`;
		},
		configureServer(server) {
			// re-scan when a post changes
			server.watcher.add(blogsDir);
			const snapshot = () => {
				try {
					return JSON.stringify(scanPosts(blogsDir, includeDrafts));
				} catch (e) {
					// invalid frontmatter mid-edit: keep last good state, report in terminal
					server.config.logger.warn(String((e as Error).message));
					return undefined;
				}
			};
			let last = snapshot();
			const onFileEvent = (file: string) => {
				if (!file.endsWith('.mdx')) return;
				const next = snapshot();
				if (next === undefined || next === last) return; // body-only edits keep normal HMR
				last = next;
				const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
				if (mod) server.moduleGraph.invalidateModule(mod);
				// the list is baked into importers, so tell the browser to refetch
				server.ws.send({ type: 'full-reload' });
			};
			server.watcher.on('change', onFileEvent).on('add', onFileEvent).on('unlink', onFileEvent);
		},
	};
}
