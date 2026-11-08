import { useEffect, useState } from 'preact/hooks';

/**
 * Reading progress for a blog post. One scroll listener feeds a tiny shared store, read by
 * the mobile reading bar (components/ReadingBar), the desktop table of contents
 * (components/Toc) and the right-edge ruler (components/ProgressRuler).
 */

export interface Heading {
	id: string;
	text: string;
	level: 2 | 3;
	/** document-absolute top, in px */
	y: number;
	/** scroll progress (0..1) at which this heading counts as reached */
	p: number;
}

export interface Reading {
	active: boolean;
	title: string;
	headings: Heading[];
	/** index of the heading currently being read, -1 before the first one */
	current: number;
	/** 0..1 */
	progress: number;
}

const IDLE: Reading = { active: false, title: '', headings: [], current: -1, progress: 0 };

/** a heading counts as "reached" once its top is within this many px of the viewport top */
const REACHED_AT = 110;

let state = IDLE;
const subscribers = new Set<(s: Reading) => void>();

function publish(next: Reading) {
	state = next;
	subscribers.forEach((fn) => fn(next));
}

export function useReading(): Reading {
	// SSR and the first client render both see IDLE, so hydration always matches.
	const [s, set] = useState<Reading>(IDLE);
	useEffect(() => {
		subscribers.add(set);
		set(state);
		return () => {
			subscribers.delete(set);
		};
	}, []);
	return s;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Start tracking `root` (the <article>). Returns a cleanup function. */
export function startReading(root: HTMLElement, title: string): () => void {
	let headings: Heading[] = [];
	let frame = 0;

	const scrollMax = () => document.documentElement.scrollHeight - innerHeight;

	const update = () => {
		frame = 0;
		const max = scrollMax();
		let current = -1;
		for (let i = 0; i < headings.length; i++) {
			if (headings[i].y - scrollY <= REACHED_AT) current = i;
			else break;
		}
		publish({ active: true, title, headings, current, progress: max > 0 ? clamp01(scrollY / max) : 0 });
	};
	const schedule = () => {
		if (!frame) frame = requestAnimationFrame(update);
	};

	// Headings are measured again whenever content or layout changes (the MDX body loads
	// lazily, and images / fonts shift things down).
	const measure = () => {
		const max = scrollMax();
		headings = [...root.querySelectorAll<HTMLElement>('.post-body h2[id], .post-body h3[id]')].map((el) => {
			const y = el.getBoundingClientRect().top + scrollY;
			return {
				id: el.id,
				text: el.textContent ?? '',
				level: el.tagName === 'H3' ? 3 : 2,
				y,
				p: max > 0 ? clamp01((y - REACHED_AT) / max) : 0,
			};
		});
		schedule();
	};

	const mutations = new MutationObserver(measure);
	mutations.observe(root, { childList: true, subtree: true });
	const sizes = new ResizeObserver(measure);
	sizes.observe(root);
	sizes.observe(document.body);
	addEventListener('scroll', schedule, { passive: true });
	addEventListener('resize', measure);
	measure();

	return () => {
		mutations.disconnect();
		sizes.disconnect();
		removeEventListener('scroll', schedule);
		removeEventListener('resize', measure);
		if (frame) cancelAnimationFrame(frame);
		publish(IDLE);
	};
}

/** Smooth-scroll to a heading without going through the router. */
export function scrollToHeading(id: string) {
	const el = document.getElementById(id);
	if (!el) return;
	const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
	el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
	history.replaceState(null, '', `#${id}`);
}
