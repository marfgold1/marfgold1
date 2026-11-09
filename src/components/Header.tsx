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
	const [open, setOpen] = useState(false);
	const openRef = useRef(false);
	openRef.current = open;
	const hiddenRef = useRef(false);
	hiddenRef.current = hidden;

	// The header is fixed everywhere and slides away while scrolling down, back on scroll up.
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
