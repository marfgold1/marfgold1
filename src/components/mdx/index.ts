import { h, type ComponentType } from 'preact';
import { lazy } from 'preact-iso';
import { markUsed } from '@/lib/chunk-usage.js';
import { Table } from '@/components/prose/Table.jsx';
import { A } from '@/components/mdx/A.jsx';
import { Figure } from '@/components/mdx/Figure.jsx';

// Every `./Name.tsx` in this folder becomes `<Name />` in MDX, lazy-loaded (own chunk,
// fetched only when a post renders it). Export it as `Name` (or default).
const modules = import.meta.glob<Record<string, ComponentType<any>>>('./*.tsx');

const lazyComponents: Record<string, ComponentType<any>> = Object.fromEntries(
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

// Lazy `<Name />` components plus small, eagerly-bundled overrides for plain markdown elements.
export const mdxComponents: Record<string, ComponentType<any>> = { ...lazyComponents, table: Table, a: A, img: Figure };
