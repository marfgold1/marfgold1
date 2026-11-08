import { h, type ComponentType } from 'preact';
import { lazy } from 'preact-iso';
import { markUsed } from '@/lib/chunk-usage.js';

// Every `./Name.tsx` in this folder becomes `<Name />` in MDX, lazy-loaded (own chunk,
// fetched only when a post renders it). Export it as `Name` (or default).
const modules = import.meta.glob<Record<string, ComponentType<any>>>('./*.tsx');

export const mdxComponents: Record<string, ComponentType<any>> = Object.fromEntries(
	Object.entries(modules).map(([path, load]) => {
		const name = path.match(/([^/]+)\.tsx$/)![1];
		const Lazy = lazy(() => load().then((m) => m[name] ?? m.default));
		const Tracked = (props: any) => {
			markUsed(`components/mdx/${name}`);
			return h(Lazy, props);
		};
		return [name, Tracked];
	}),
);
