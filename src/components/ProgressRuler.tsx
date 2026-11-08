import { useReading, scrollToHeading } from '@/lib/reading.js';

/**
 * Reading ruler pinned to the right edge of large screens: minor ticks for scale, a longer
 * tick per heading (hover or focus shows its name, click jumps there), and a marker with
 * the current progress value (0.00 to 1.00). Hidden below 1280px by CSS.
 */
export function ProgressRuler() {
	const { active, headings, progress } = useReading();
	if (!active) return null;

	return (
		<nav class="ruler" aria-label="Reading progress">
			<div class="ruler-track">
				{headings.map((h) => (
					<a
						key={h.id}
						href={`#${h.id}`}
						class={`ruler-mark${h.level === 3 ? ' sub' : ''}${h.p <= progress ? ' reached' : ''}`}
						style={{ top: `${h.p * 100}%` }}
						aria-label={h.text}
						onClick={(e) => {
							e.preventDefault();
							scrollToHeading(h.id);
						}}
					>
						<span class="ruler-tip">{h.text}</span>
					</a>
				))}
				<div class="ruler-now" style={{ top: `${progress * 100}%` }} aria-hidden="true">
					<span>{progress.toFixed(2)}</span>
				</div>
			</div>
		</nav>
	);
}
