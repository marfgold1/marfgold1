import { getPosts, formatDate } from '@/lib/blog.js';

export function BlogIndex() {
	return (
		<section>
			<h1>Blog</h1>
			<ul class="post-list">
				{getPosts().map((p) => (
					<li key={p.slug}>
						<h2>
							<a href={`/blog/${p.slug}`}>{p.title}</a>
						</h2>
						<time datetime={p.date}>{formatDate(p.date)}</time>
						<p>{p.description}</p>
						{p.tags.length > 0 && (
							<ul class="tags">
								{p.tags.map((t) => (
									<li key={t}>{t}</li>
								))}
							</ul>
						)}
					</li>
				))}
			</ul>
		</section>
	);
}
