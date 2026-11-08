import { useReading, scrollToHeading } from '@/lib/reading.js';

/** "On this page" list for wide screens; the current section follows the scroll position. */
export function Toc() {
	const { headings, current } = useReading();
	if (!headings.length) return null;

	return (
		<aside class="toc" aria-label="On this page">
			<p class="toc-title">On this page</p>
			{headings.map((h, i) => (
				<a
					key={h.id}
					href={`#${h.id}`}
					class={`${h.level === 3 ? 'sub' : ''} ${i === current ? 'on' : ''}`.trim()}
					aria-current={i === current ? 'location' : undefined}
					onClick={(e) => {
						e.preventDefault();
						scrollToHeading(h.id);
					}}
				>
					{h.text}
				</a>
			))}
		</aside>
	);
}
