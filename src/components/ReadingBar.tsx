import { useReading, scrollToHeading } from '@/lib/reading.js';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Phone-only bar under the site header: progress line, current section and a tap-to-open
 * section list. State of the sheet lives in Header, which also has to know about it.
 */
export function ReadingBar({ open, onToggle, onClose }: { open: boolean; onToggle: () => void; onClose: () => void }) {
	const { active, title, headings, current, progress } = useReading();
	if (!active) return null;

	const label = current < 0 ? title : headings[current].text;

	return (
		<div class="reading-bar">
			<button type="button" class="reading-toggle" aria-expanded={open} aria-controls="reading-sheet" onClick={onToggle}>
				<span class="reading-count">
					{pad(current + 1)}/{pad(headings.length)}
				</span>
				<span class="reading-label">{label}</span>
				<span class="reading-chev" aria-hidden="true">
					⌄
				</span>
			</button>
			<div class="reading-progress" style={{ width: `${progress * 100}%` }} aria-hidden="true" />
			{open && (
				<ul id="reading-sheet" class="reading-sheet">
					{headings.map((h, i) => (
						<li key={h.id}>
							<a
								href={`#${h.id}`}
								class={`${h.level === 3 ? 'sub' : ''} ${i < current ? 'done' : ''} ${i === current ? 'cur' : ''}`.trim()}
								aria-current={i === current ? 'location' : undefined}
								onClick={(e) => {
									e.preventDefault();
									onClose();
									scrollToHeading(h.id);
								}}
							>
								<i aria-hidden="true" />
								{h.text}
							</a>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
