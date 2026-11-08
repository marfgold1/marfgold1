import type { Plugin } from 'vite';

// Prerendered pages record the lazy chunks they rendered in
// <meta name="x-used-chunks" content="blogs/test,components/mdx/Counter">.
// After the prerender plugin has emitted the HTML, swap that meta for <link>s to only
// those chunks' CSS (including CSS of shared chunks they import), so pages don't load
// CSS they don't need. Links use the same URL as Vite's client preloader, which skips
// stylesheets already present, so nothing is requested twice.
const META_RE = /<meta name="x-used-chunks" content="([^"]*)"\s*\/?>/;

export function mdxCss(): Plugin {
	let base = '/';
	return {
		name: 'mdx-css',
		enforce: 'post',
		apply: 'build',
		configResolved(config) {
			base = config.base;
		},
		generateBundle: {
			order: 'post',
			handler(_opts, bundle) {
				const chunks = new Map<string, any>();
				const byKey = new Map<string, any>();
				for (const item of Object.values(bundle) as any[]) {
					if (item.type !== 'chunk') continue;
					chunks.set(item.fileName, item);
					const m = item.facadeModuleId?.match(/\/src\/(components\/mdx\/[^/]+|blogs\/[^/]+)\.(?:tsx|mdx)$/);
					if (m) byKey.set(m[1], item);
				}

				// CSS of a chunk plus everything it statically imports
				const cssOf = (chunk: any, seen = new Set<string>()): string[] => {
					if (seen.has(chunk.fileName)) return [];
					seen.add(chunk.fileName);
					const own: string[] = [...(chunk.viteMetadata?.importedCss ?? [])];
					return own.concat(
						chunk.imports.flatMap((f: string) => (chunks.has(f) ? cssOf(chunks.get(f), seen) : [])),
					);
				};

				for (const item of Object.values(bundle) as any[]) {
					if (item.type !== 'asset' || !item.fileName.endsWith('.html')) continue;
					const html = String(item.source);
					const match = html.match(META_RE);
					if (!match) continue;

					const files = new Set(
						match[1]
							.split(',')
							.filter(Boolean)
							.flatMap((key) => (byKey.has(key) ? cssOf(byKey.get(key)) : [])),
					);
					const links = [...files]
						.filter((file) => !html.includes(`href="${base}${file}"`)) // already linked (entry CSS)
						.map((file) => `<link rel="stylesheet" crossorigin href="${base}${file}">`)
						.join('\n');

					item.source = html.replace(META_RE, links);
				}
			},
		},
	};
}
