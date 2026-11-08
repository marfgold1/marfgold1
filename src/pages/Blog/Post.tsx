import { lazy, ErrorBoundary } from 'preact-iso';
import { getPost, formatDate } from '@/lib/blog.js';
import { markUsed } from '@/lib/chunk-usage.js';
import { mdxComponents } from '@/components/mdx/index.js';
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
	markUsed(`blogs/${slug}`);
	const Content = load(slug);

	return (
		<article class="post">
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
			<div class="post-body">
				<ErrorBoundary>
					<Content components={mdxComponents} />
				</ErrorBoundary>
			</div>
		</article>
	);
}
