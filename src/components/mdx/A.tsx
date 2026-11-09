import type { ComponentChildren } from 'preact';

/** Absolute http(s) links open in a new tab and get a pop-out icon; everything else stays in-app. */
export function A({ href = '', children }: { href?: string; children?: ComponentChildren }) {
	// prerender runs in Node without location; same-origin absolute links are rare enough
	// that treating every absolute http(s) link as external is safe there too
	const external = /^https?:\/\//.test(href) && !href.startsWith(globalThis.location?.origin ?? 'http://localhost');
	if (!external) {
		return <a href={href}>{children}</a>;
	}
	return (
		<a href={href} target="_blank" rel="noopener noreferrer" class="ext-link">
			{children}
			<svg
				class="ext-icon"
				aria-hidden="true"
				width="12"
				height="12"
				viewBox="0 0 12 12"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M4.5 2h-2A1.5 1.5 0 0 0 1 3.5v6A1.5 1.5 0 0 0 2.5 11h6A1.5 1.5 0 0 0 10 9.5v-2" />
				<path d="M7.5 1H11v3.5M11 1 5.5 6.5" />
			</svg>
		</a>
	);
}
