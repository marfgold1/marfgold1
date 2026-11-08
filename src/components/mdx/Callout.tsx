import type { ComponentChildren } from 'preact';

export function Callout({ type = 'note', children }: { type?: 'note' | 'warning'; children?: ComponentChildren }) {
	return (
		<aside class={`callout callout-${type}`} role="note">
			{children}
		</aside>
	);
}
