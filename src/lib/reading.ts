import { useEffect, useState } from 'preact/hooks';

/**
 * Reading progress for a blog post. One scroll listener feeds a tiny shared store, read by
 * the mobile reading bar (components/ReadingBar), the desktop table of contents
 * (components/ReadingBar) and the right-edge ruler (components/ProgressRuler).
 */

export interface Heading {
	id: string;
	text: string;
	level: 1 | 2 | 3;
	/** document-absolute top, in px */
	y: number;
	/** where the heading sits along the article (0..1), so every tick on the ruler is distinct */
	p: number;
}

export interface Reading {
	active: boolean;
	title: string;
	headings: Heading[];
	/** index of the heading currently being read, -1 before the first one */
	current: number;
	/** 0..1, measured over the article itself (0 when it starts, 1 when its end is in view) */
	progress: number;
	/** reading position along the article (0..1, clamped), on the same axis as Heading.p */
	at: number;
	/** false when the article fits on one screen, so there is nothing to track */
	scrollable: boolean;
}

const IDLE: Reading = { active: false, title: '', headings: [], current: -1, progress: 0, at: 0, scrollable: false };

/** a heading counts as "current" once its top is within this many px of the viewport top */
const REACHED_AT = 110;
/** the ruler's reading line: this fraction of the way down the viewport */
const READING_LINE = 0.3;

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

let seekImpl: (p: number) => void = () => {};

/** Scroll so that position `p` (0..1 along the article) sits on the reading line. */
export const seekTo = (p: number) => seekImpl(p);

/** Start tracking `root` (the <article>). Returns a cleanup function. */
export function startReading(root: HTMLElement, title: string): () => void {
	let headings: Heading[] = [];
	let frame = 0;
	// Everything is measured over the article only, never the header, footer or spacing around
	// it. `progress` runs 0 (article top at viewport top) to 1 (article end in view), clamped.
	let start = 0;
	let height = 1;
	let span = 0;

	const update = () => {
		frame = 0;
		let current = -1;
		for (let i = 0; i < headings.length; i++) {
			if (headings[i].y - scrollY <= REACHED_AT) current = i;
			else break;
		}
		const atEnd = span > 0 && scrollY >= start + span - 1;
		publish({
			active: true,
			title,
			headings,
			current,
			progress: span > 0 ? clamp01((scrollY - start) / span) : 0,
			at: atEnd ? 1 : clamp01((scrollY + innerHeight * READING_LINE - start) / height),
			scrollable: span > 0,
		});
	};
	const schedule = () => {
		if (!frame) frame = requestAnimationFrame(update);
	};

	// Headings are measured again whenever content or layout changes (the MDX body loads
	// lazily, and images / fonts shift things down).
	const measure = () => {
		start = root.getBoundingClientRect().top + scrollY;
		height = Math.max(1, root.offsetHeight);
		span = height - innerHeight;
		headings = [...root.querySelectorAll<HTMLElement>('.post-body h1[id], .post-body h2[id], .post-body h3[id]')].map((el) => {
			const y = el.getBoundingClientRect().top + scrollY;
			return {
				id: el.id,
				text: el.textContent ?? '',
				level: el.tagName === 'H1' ? 1 : el.tagName === 'H3' ? 3 : 2,
				y,
				p: clamp01((y - start) / height),
			};
		});
		schedule();
	};

	seekImpl = (p) => {
		const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const top = Math.max(0, start + p * height - innerHeight * READING_LINE);
		scrollTo({ top, behavior: calm ? 'auto' : 'smooth' });
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
		seekImpl = () => {};
		publish(IDLE);
	};
}

/** Smooth-scroll to a heading without going through the router. */
export function scrollToHeading(id: string) {
	const el = document.getElementById(id);
	if (!el) return;
	const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
	// land just below the fixed header instead of under it
	const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 0;
	const top = el.getBoundingClientRect().top + scrollY - header - 12;
	scrollTo({ top: Math.max(0, top), behavior: calm ? 'auto' : 'smooth' });
	history.replaceState(null, '', `#${id}`);
}
