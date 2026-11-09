import { useEffect, useRef } from 'preact/hooks';
import { lazy, ErrorBoundary } from 'preact-iso';
import { getPost, formatDate, type PostMeta } from '@/lib/blog.js';
import { markUsed } from '@/lib/chunk-usage.js';
import { startReading, scrollToHeading } from '@/lib/reading.js';
import { mdxComponents } from '@/components/mdx/index.js';
import { ProgressRuler } from '@/components/ProgressRuler.jsx';
import { Toc } from '@/components/Toc.jsx';
import { NotFound } from '@/pages/_404.jsx';

const loaders = import.meta.glob<{ default: any }>('/src/blogs/*.mdx');
const cache = new Map<string, any>();

function load(slug: string) {
	let C = cache.get(slug);
	if (!C) {
		C = lazy(loaders[`/src/blogs/${slug}.mdx`]);
		cache.set(slug, C);
	}
	return C;
}

export function BlogPost({ slug }: { slug: string }) {
	const post = getPost(slug);
	if (!post || !loaders[`/src/blogs/${slug}.mdx`]) return <NotFound />;
	return <PostView post={post} />;
}

// Headings are links to themselves. Handle them here (smooth scroll + hash update) so the
// router doesn't treat the click as a page navigation.
function onHeadingClick(e: MouseEvent) {
	const a = (e.target as Element).closest('h2 > a, h3 > a, h4 > a, h5 > a, h6 > a');
	const id = a?.getAttribute('href')?.slice(1);
	if (!a || !id || e.metaKey || e.ctrlKey || e.shiftKey) return;
	e.preventDefault();
	e.stopPropagation();
	scrollToHeading(id);
}

function PostView({ post }: { post: PostMeta }) {
	const { slug } = post;
	markUsed(`blogs/${slug}`);
	const Content = load(slug);
	const article = useRef<HTMLElement>(null);

	// Reading progress (mobile bar and desktop ruler) follows this article.
	useEffect(() => (article.current ? startReading(article.current, post.title) : undefined), [slug]);

	return (
		<>
			<Toc />
			<article class="post" ref={article}>
				<header class="post-head">
					<div class="post-meta">
						<time datetime={post.date}>{formatDate(post.date)}</time>
						{post.tags.length > 0 && (
							<ul class="tags">
								{post.tags.map((t) => (
									<li key={t}>{t}</li>
								))}
							</ul>
						)}
					</div>
					<h1>{post.title}</h1>
					<p class="post-desc">{post.description}</p>
				</header>
				<div class="post-body" onClick={onHeadingClick}>
					<ErrorBoundary>
						<Content components={mdxComponents} />
					</ErrorBoundary>
				</div>
			</article>
			<ProgressRuler />
		</>
	);
}
