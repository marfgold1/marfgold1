import { useReading, scrollToHeading } from '@/lib/reading.js';
import { fitRuler } from '@/lib/ruler.js';

// Keep this in sync with the ruler's top/bottom in styles/reading.css (px).
const TRACK_INSET = 96 + 32;
/** minimum vertical gap between two always-visible labels (px) */
const LABEL_GAP = 20;

/**
 * Reading ruler on the right edge of large screens: the whole article, to scale. Every section
 * gets a tick and its title (click either to jump there); ticks and the minor scale fade once
 * you have read past them, so the boundary between dim and bright is your position. There is
 * no marker or number. h3 ticks show their title on hover, as do labels that would collide with
 * a neighbour. Hidden below 1280px by CSS.
 */
export function ProgressRuler() {
	const { active, scrollable, headings, at } = useReading();
	if (!active || !scrollable) return null;

	const trackPx = Math.max(1, innerHeight - TRACK_INSET);
	const gap = LABEL_GAP / trackPx;

	// Minor scale: a uniform grid. Each section tick snaps to its nearest grid tick, and the
	// grid size is picked to keep that snapping error small (see lib/ruler.ts).
	const { n, snapped } = fitRuler(
		headings.map((h) => h.p),
		trackPx,
	);
	const minors = Array.from({ length: n + 1 }, (_, k) => k / n);

	let lastShown = -Infinity;
	const marks = headings.map((h, i) => {
		const p = snapped[i];
		const show = h.level === 2 && p - lastShown >= gap;
		if (show) lastShown = p;
		return { h, p, show };
	});

	return (
		<nav class="ruler" aria-label="Reading progress">
			<div class="ruler-track">
				{minors.map((p, i) => (
					<i key={i} class={`ruler-minor${p <= at ? ' reached' : ''}`} style={{ top: `${p * 100}%` }} />
				))}
				{marks.map(({ h, p, show }) => (
					<a
						key={h.id}
						href={`#${h.id}`}
						class={`ruler-mark${h.level === 3 ? ' sub' : ''}${p <= at ? ' reached' : ''}${show ? ' labelled' : ''}`}
						style={{ top: `${p * 100}%` }}
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
