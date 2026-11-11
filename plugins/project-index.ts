import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import matter from 'gray-matter';
import type { Plugin } from 'vite';

export interface ProjectMeta {
	slug: string;
	name: string;
	description: string;
	tags: string[];
	status: 'live' | 'wip' | 'archived';
	repo?: string;
	demo?: string;
	featured?: boolean;
	commentary?: string;
	demoComponent?: string;
}

const VIRTUAL_ID = 'virtual:project-index';
const RESOLVED_ID = '\0' + VIRTUAL_ID;
const STATUSES = ['live', 'wip', 'archived'];

export function scanProjects(projectsDir: string): ProjectMeta[] {
	const projects: ProjectMeta[] = [];

	for (const file of readdirSync(projectsDir)) {
		if (!file.endsWith('.md')) continue;
		const slug = basename(file, '.md');
		const { data, content } = matter(readFileSync(join(projectsDir, file), 'utf8'));
		const fail = (msg: string) => {
			throw new Error(`[projects] ${file}: ${msg}`);
		};

		if (typeof data.name !== 'string' || !data.name) fail('`name` (string) is required');
		if (typeof data.description !== 'string' || !data.description) fail('`description` (string) is required');
		if (!STATUSES.includes(data.status)) fail(`\`status\` must be one of: ${STATUSES.join(', ')}`);
		if (!Array.isArray(data.tags) || !data.tags.every((t) => typeof t === 'string')) {
			fail('`tags` must be an array of strings');
		}
		if (data.demo && !/^https?:\/\//.test(data.demo)) fail('`demo` must be an absolute http(s) URL');
		if (data.repo && !/^https?:\/\//.test(data.repo)) fail('`repo` must be an absolute http(s) URL');

		projects.push({
			slug,
			name: data.name,
			description: data.description,
			tags: data.tags,
			status: data.status,
			...(typeof data.repo === 'string' && { repo: data.repo }),
			...(typeof data.demo === 'string' && { demo: data.demo }),
			...(typeof data.demoComponent === 'string' && { demoComponent: data.demoComponent }),
			...(data.featured && { featured: true }),
			...(content.trim() && { commentary: content.trim() }),
		});
	}

	return projects.sort((a, b) => (a.featured === b.featured ? a.name.localeCompare(b.name) : a.featured ? -1 : 1));
}

export function projectIndex(projectsDir: string): Plugin {
	return {
		name: 'project-index',
		resolveId(id) {
			if (id === VIRTUAL_ID) return RESOLVED_ID;
		},
		load(id) {
			if (id !== RESOLVED_ID) return;
			return `export const projects = ${JSON.stringify(scanProjects(projectsDir))};`;
		},
		configureServer(server) {
			server.watcher.add(projectsDir);
			const snapshot = () => {
				try {
					return JSON.stringify(scanProjects(projectsDir));
				} catch (e) {
					server.config.logger.warn(String((e as Error).message));
					return undefined;
				}
			};
			let last = snapshot();
			const onFileEvent = (file: string) => {
				if (!file.endsWith('.md')) return;
				const next = snapshot();
				if (next === undefined || next === last) return;
				last = next;
				const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
				if (mod) server.moduleGraph.invalidateModule(mod);
				server.ws.send({ type: 'full-reload' });
			};
			server.watcher.on('change', onFileEvent).on('add', onFileEvent).on('unlink', onFileEvent);
		},
	};
}
