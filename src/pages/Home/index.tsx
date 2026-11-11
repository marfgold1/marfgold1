import { getFeaturedProjects } from '@/lib/projects.js';
import { getPosts, formatDate } from '@/lib/blog.js';
import './style.css';

export function Home() {
	return (
		<div class="home">
			<section class="hero">
				<h1>marfgold</h1>
				<p class="tagline">Software engineer. Building things for the web.</p>
				<div class="socials">
					<a href="https://github.com/marfgold1" target="_blank" rel="noopener noreferrer">
						GitHub
					</a>
					<a href="mailto:hello@example.com">Email</a>
				</div>
			</section>

			<section class="now">
				<h2>Now</h2>
				<ul>
					<li>Redesigning this site.</li>
					<li>Writing about what I learn.</li>
				</ul>
			</section>

			{getFeaturedProjects().length > 0 && (
				<section class="featured">
					<h2>
						Featured projects <a href="/projects">all projects →</a>
					</h2>
					<ul class="featured-grid">
						{getFeaturedProjects()
							.slice(0, 3)
							.map((p) => (
								<li key={p.slug}>
									<a href={`/projects/${p.slug}`}>
										<h3>{p.name}</h3>
										<p>{p.description}</p>
									</a>
								</li>
							))}
					</ul>
				</section>
			)}

			{getPosts().length > 0 && (
				<section class="recent">
					<h2>
						Recent posts <a href="/blog">all posts →</a>
					</h2>
					<ul class="recent-list">
						{getPosts()
							.slice(0, 3)
							.map((p) => (
								<li key={p.slug}>
									<a href={`/blog/${p.slug}`}>{p.title}</a>
									<time datetime={p.date}>{formatDate(p.date)}</time>
								</li>
							))}
					</ul>
				</section>
			)}
		</div>
	);
}
