import { LocationProvider, Router, Route, hydrate, prerender as ssr, useLocation } from 'preact-iso';

import { Header } from '@/components/Header.jsx';
import { Home } from '@/pages/Home/index.jsx';
import { BlogIndex } from '@/pages/Blog/index.jsx';
import { BlogPost } from '@/pages/Blog/Post.jsx';
import { Projects, ProjectDetail } from '@/pages/Projects/index.jsx';
import { NotFound } from '@/pages/_404.jsx';
import { getPost } from '@/lib/blog.js';
import { getProject } from '@/lib/projects.js';
import { usedChunks } from '@/lib/chunk-usage.js';
import '@fontsource-variable/bricolage-grotesque/index.css';
import '@fontsource-variable/figtree/index.css';
import '@fontsource-variable/figtree/wght-italic.css';
import '@fontsource-variable/jetbrains-mono/index.css';
import '@/styles/tokens.css';
import './style.css';

export function App(_props: { url?: string }) {
	return (
		<LocationProvider>
			<Header />
			<MainArea />
		</LocationProvider>
	);
}

function MainArea() {
	const { url } = useLocation();
	return (
		<main>
			<Router>
				<Route path="/" component={Home} />
				<Route path="/blog" component={BlogIndex} />
				<Route path="/projects" component={Projects} />
				<Route path="/projects/:slug" component={ProjectDetail} />
				<Route path="/blog/:slug" component={BlogPost} />
				<Route default component={NotFound} />
			</Router>
		</main>
	);
}

if (typeof window !== 'undefined') {
	hydrate(<App />, document.getElementById('app')!);
}

const SITE = 'marfgold1';
// TODO: set real origin for canonical / og:url
const ORIGIN = '';

type HeadEl = { type: string; props: Record<string, any> };

const meta = (props: Record<string, string>): HeadEl => ({ type: 'meta', props });

function headFor(url: string) {
	const path = url.replace(/\/$/, '') || '/';
	const canonical: HeadEl = { type: 'link', props: { rel: 'canonical', href: ORIGIN + path } };

	if (path === '/blog') {
		const description = 'Posts and notes.';
		return {
			lang: 'en',
			title: `Blog | ${SITE}`,
			elements: new Set<HeadEl>([meta({ name: 'description', content: description }), canonical]),
		};
	}

	const m = path.match(/^\/blog\/([^/]+)$/);
	const post = m && getPost(m[1]);
	if (post) {
		const els: HeadEl[] = [
			meta({ name: 'description', content: post.description }),
			canonical,
			meta({ property: 'og:type', content: 'article' }),
			meta({ property: 'og:title', content: post.title }),
			meta({ property: 'og:description', content: post.description }),
			meta({ property: 'article:published_time', content: post.date }),
			...post.tags.map((t) => meta({ property: 'article:tag', content: t })),
		];
		if (post.cover) els.push(meta({ property: 'og:image', content: post.cover }));
		els.push({
			type: 'script',
			props: {
				type: 'application/ld+json',
				children: JSON.stringify({
					'@context': 'https://schema.org',
					'@type': 'BlogPosting',
					headline: post.title,
					description: post.description,
					datePublished: post.date,
					...(post.updated && { dateModified: post.updated }),
					keywords: post.tags.join(', '),
				}),
			},
		});
		return { lang: 'en', title: `${post.title} | ${SITE}`, elements: new Set(els) };
	}

	if (path.startsWith('/projects/')) {
		const slug = path.slice('/projects/'.length);
		const project = getProject(slug);
		if (project) {
			return {
				lang: 'en',
				title: `${project.name} | ${SITE}`,
				elements: new Set<HeadEl>([meta({ name: 'description', content: project.description }), canonical]),
			};
		}
	}

	if (path === '/projects') {
		const description = 'Things I have built.';
		return {
			lang: 'en',
			title: `Projects | ${SITE}`,
			elements: new Set<HeadEl>([meta({ name: 'description', content: description }), canonical]),
		};
	}

	return { lang: 'en', title: SITE, elements: new Set<HeadEl>() };
}

export async function prerender(data: { url: string }) {
	usedChunks.clear();
	const { html, links } = await ssr(<App {...data} />);
	const head = headFor(data.url);
	if (usedChunks.size) {
		// consumed (and removed) by plugins/mdx-css.ts to link only the CSS this page needs
		head.elements.add(meta({ name: 'x-used-chunks', content: [...usedChunks].join(',') }));
	}
	return { html, links, head };
}
