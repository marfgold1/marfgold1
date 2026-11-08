import { useLocation } from 'preact-iso';

export function Header() {
	const { url } = useLocation();

	return (
		<header>
			<nav>
				<a href="/" class={url == '/' ? 'active' : undefined}>
					Home
				</a>
				<a href="/blog" class={url.startsWith('/blog') ? 'active' : undefined}>
					Blog
				</a>
				<a href="/404" class={url == '/404' ? 'active' : undefined}>
					404
				</a>
			</nav>
		</header>
	);
}
