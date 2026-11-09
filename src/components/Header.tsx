import { useEffect, useRef, useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { ThemeToggle } from '@/components/ThemeToggle.jsx';
import { ReadingBar } from '@/components/ReadingBar.jsx';
import { useReading } from '@/lib/reading.js';

export function Header() {
	const { url } = useLocation();
	const { active } = useReading();
	const el = useRef<HTMLElement>(null);
	const top = useRef<HTMLDivElement>(null);
	const [hidden, setHidden] = useState(false);
	const hiddenRef = useRef(false);
	hiddenRef.current = hidden;
	const [open, setOpen] = useState(false);
	const openRef = useRef(false);
	openRef.current = open;

	// Phones: the header is fixed and slides away while scrolling down, back on scroll up.
	// (CSS only applies it at phone width.) The reading bar, when present, stays pinned.
	useEffect(() => {
		let last = scrollY;
		const onScroll = () => {
			const y = scrollY;
			const dy = y - last;
			let next = hiddenRef.current;
			if (y < 8) next = false;
			else if (dy > 6 && !openRef.current) next = true;
			else if (dy < -6) next = false;
			if (next !== hiddenRef.current) setHidden(next);
			// TOC and the ruler use this to extend into the freed-up space
			if (next) document.documentElement.setAttribute('data-header-hidden', '');
			else document.documentElement.removeAttribute('data-header-hidden');
			last = y;
		};
		addEventListener('scroll', onScroll, { passive: true });
		return () => removeEventListener('scroll', onScroll);
	}, []);

	// The fixed header needs space reserved above the page, and the slide distance.
	useEffect(() => {
		const root = document.documentElement.style;
		const ro = new ResizeObserver(() => {
			root.setProperty('--header-h', `${el.current?.offsetHeight ?? 0}px`);
			root.setProperty('--top-h', `${top.current?.offsetHeight ?? 0}px`);
		});
		el.current && ro.observe(el.current);
		top.current && ro.observe(top.current);
		return () => ro.disconnect();
	}, []);

	// keep the html attribute (TOC/ruler extension) in sync with whatever sets the state
	useEffect(() => {
		if (hidden) document.documentElement.setAttribute('data-header-hidden', '');
		else document.documentElement.removeAttribute('data-header-hidden');
	}, [hidden]);

	useEffect(() => setOpen(false), [url]);
	useEffect(() => {
		if (!open) return;
		setHidden(false);
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
		addEventListener('keydown', onKey);
		return () => removeEventListener('keydown', onKey);
	}, [open]);

	return (
		<header ref={el} class="site-header" data-hidden={hidden || undefined} data-reading={active || undefined}>
			<div ref={top} class="site-top">
				<div class="stripe" aria-hidden="true" />
				<div class="site-bar">
					<a class="brand" href="/">
						marfgold
					</a>
					<nav aria-label="Main">
						<a href="/" class={url == '/' ? 'active' : undefined}>
							Home
						</a>
						<a href="/blog" class={url.startsWith('/blog') ? 'active' : undefined}>
							Blog
						</a>
						<ThemeToggle />
					</nav>
				</div>
			</div>
			<ReadingBar open={open} onToggle={() => setOpen(!open)} onClose={() => setOpen(false)} />
		</header>
	);
}
