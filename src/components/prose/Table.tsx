import type { ComponentChildren } from 'preact';

// GFM tables render as a bare <table>; wrap it so wide ones scroll inside a rounded card
// instead of stretching the page. Wired up for MDX in components/mdx/index.ts.
export function Table(props: { children?: ComponentChildren; [k: string]: unknown }) {
	return (
		<div class="table-wrap">
			<table {...props} />
		</div>
	);
}
