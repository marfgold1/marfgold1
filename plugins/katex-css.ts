import type { Plugin } from 'vite';
import { visit } from 'unist-util-visit';

const KATEX_CSS = 'katex/dist/katex.min.css';

// Adds `import 'katex/dist/katex.min.css'` to any MDX file that contains math, so the
// CSS lives with the posts that need it (one shared chunk if several do) instead of
// in the global bundle. Must run after remark-math.
export function remarkKatexCss() {
	return (tree: any) => {
		let hasMath = false;
		visit(tree, (node: any) => {
			if (node.type === 'math' || node.type === 'inlineMath') hasMath = true;
		});
		if (!hasMath) return;
		tree.children.unshift({
			type: 'mdxjsEsm',
			value: `import '${KATEX_CSS}'`,
			data: {
				estree: {
					type: 'Program',
					sourceType: 'module',
					body: [
						{
							type: 'ImportDeclaration',
							specifiers: [],
							attributes: [],
							source: { type: 'Literal', value: KATEX_CSS, raw: `'${KATEX_CSS}'` },
						},
					],
				},
			},
		});
	};
}

// KaTeX lists woff2, woff and ttf for every font. Keep woff2 only: every current
// browser supports it, and Vite then doesn't emit the other ~40 font files.
export function katexWoff2Only(): Plugin {
	return {
		name: 'katex-woff2-only',
		enforce: 'pre',
		transform(code, id) {
			if (!id.split('?')[0].endsWith('katex/dist/katex.min.css')) return;
			return code.replace(/,url\([^)]*\.(?:woff|ttf)\) format\("(?:woff|truetype)"\)/g, '');
		},
	};
}
