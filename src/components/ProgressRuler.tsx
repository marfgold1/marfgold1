import { useReading, scrollToHeading } from '@/lib/reading.js';

// Keep this in sync with the ruler's top/bottom in styles/reading.css (px).
const TRACK_INSET = 96 + 32;
/** minimum vertical gap between two always-visible labels (px) */
const LABEL_GAP = 20;

/**
 * Reading ruler on the right edge of large screens: the whole article, to scale. Every section
 * gets a tick and its title; ticks (and the minor scale) fade once you have read past them, so
 * the boundary between dim and bright is your position. There is no marker or number. h3 ticks show their title on
 * hover, as do labels that would collide with a neighbour. Hidden below 1280px by CSS.
 */
export function ProgressRuler() {
	const { active, scrollable, headings, at } = useReading();
	if (!active || !scrollable) return null;

	const gap = LABEL_GAP / Math.max(1, innerHeight - TRACK_INSET);
	let lastShown = -Infinity;
	const marks = headings.map((h) => {
		const show = h.level === 2 && h.p - lastShown >= gap;
		if (show) lastShown = h.p;
		return { h, show };
	});

	return (
		<nav class="ruler" aria-label="Reading progress">
			<div class="ruler-track" style={{ '--p': `${at * 100}%` }}>
				{marks.map(({ h, show }) => (
					<a
						key={h.id}
						href={`#${h.id}`}
						class={`ruler-mark${h.level === 3 ? ' sub' : ''}${h.p <= at ? ' reached' : ''}${show ? ' labelled' : ''}`}
						style={{ top: `${h.p * 100}%` }}
						onClick={(e) => {
							e.preventDefault();
							scrollToHeading(h.id);
						}}
					>
						<span class="ruler-label">{h.text}</span>
					</a>
				))}
			</div>
		</nav>
	);
}
