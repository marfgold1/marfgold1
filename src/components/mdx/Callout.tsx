import type { ComponentChildren } from 'preact';

type CalloutType = 'note' | 'tip' | 'warning';

const LABEL: Record<CalloutType, string> = { note: 'Note', tip: 'Tip', warning: 'Warning' };

export function Callout({ type = 'note', children }: { type?: CalloutType; children?: ComponentChildren }) {
	return (
		<aside class={`callout callout-${type}`} role="note">
			<strong class="callout-title">{LABEL[type]}</strong>
			<div class="callout-body">{children}</div>
		</aside>
	);
}
