import { useLocation } from 'preact-iso';
import { ThemeToggle } from '@/components/ThemeToggle.jsx';

export function Header() {
	const { url } = useLocation();

	return (
		<header class="site-header">
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
		</header>
	);
}
