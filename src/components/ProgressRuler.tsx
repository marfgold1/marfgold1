import { useReading, scrollToHeading, seekTo } from '@/lib/reading.js';
import { fitRuler } from '@/lib/ruler.js';

// Keep this in sync with the ruler's top/bottom in styles/reading.css (px).
const TRACK_INSET = 96 + 32;
/** minimum vertical gap between two always-visible labels (px) */
const LABEL_GAP = 20;

/**
 * Reading ruler on the right edge of large screens: the whole article, to scale.
 *
 * - a uniform minor scale; click a tick to scroll there, hover expands it
 * - a longer tick plus a title for every section (click either to jump); h3 titles, and any
 *   that would collide with a neighbour, show on hover
 * - the tick at the reading position is expanded and dark; ticks you have read past fade
 *
 * Every tick is placed at a whole pixel row, so a section tick sits exactly on its minor tick.
 * Hidden below 1280px by CSS.
 */
export function ProgressRuler() {
	const { active, scrollable, headings, at } = useReading();
	if (!active || !scrollable) return null;

	const trackPx = Math.max(1, innerHeight - TRACK_INSET);

	// Minor scale: a uniform grid. Each section tick snaps to its nearest grid tick, and the
	// grid size is picked to keep that snapping error small (see lib/ruler.ts).
	const { n, ks } = fitRuler(
		headings.map((h) => h.p),
		trackPx,
	);
	const row = (k: number) => Math.round((k / n) * trackPx);
	const current = Math.round(at * n);

	let lastShown = -Infinity;
	const marks = headings.map((h, i) => {
		const y = row(ks[i]);
		const show = y - lastShown >= LABEL_GAP;
		if (show) lastShown = y;
		return { h, y, show, k: ks[i] };
	});

	return (
		<nav class="ruler" aria-label="Reading progress">
			<div class="ruler-track" style={{ '--gap': `${trackPx / n}px` }}>
				{Array.from({ length: n + 1 }, (_, k) => (
					<i
						key={k}
						aria-hidden="true"
						class={`ruler-minor${k <= current ? ' reached' : ''}${k === current ? ' current' : ''}`}
						style={{ top: `${row(k)}px` }}
						onClick={() => seekTo(k / n)}
					/>
				))}
				{marks.map(({ h, y, show, k }) => (
					<a
						key={h.id}
						href={`#${h.id}`}
						class={`ruler-mark${h.level === 3 ? ' sub' : ''}${k <= current ? ' reached' : ''}${show ? ' labelled' : ''}`}
						style={{ top: `${y}px` }}
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
