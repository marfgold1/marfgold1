import type { ComponentChildren } from 'preact';

/**
 * Images inside posts. In dark mode, grayscale docx figures would sit as white boxes on the
 * dark background, so they get a light plate behind them (see .doc-figure in post.css).
 */
export function Figure(props: Record<string, unknown>) {
	const { class: cls, ...rest } = props as { class?: string };
	return <img {...rest} class={`doc-figure ${cls ?? ''}`.trim()} />;
}
