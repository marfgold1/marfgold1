import { useState } from 'preact/hooks';
import { getProjects } from '@/lib/projects.js';
import type { ProjectMeta } from '@/lib/projects.js';
import { DemoFrame } from '@/components/DemoFrame.jsx';
import './style.css';

const FILTERS = ['all', 'live', 'wip', 'archived'] as const;

// demo chunk lookup by convention: `demoComponent: <slug>` in project
// frontmatter resolves to src/pages/Demo/<slug>.tsx — lazy (non-eager), so
// the chunk (v86 etc.) is only fetched when the demo actually mounts
const demoLoaders = import.meta.glob<{ default: any }>('/src/pages/Demo/*.tsx');

export function Projects() {
	const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');

	const shown = getProjects().filter((p) => filter === 'all' || p.status === filter);

	return (
		<section>
			<h1 class="page-title">Projects</h1>
			<div class="project-filters" role="tablist" aria-label="Filter projects by status">
				{FILTERS.map((f) => (
					<button key={f} class={filter === f ? 'active' : undefined} onClick={() => setFilter(f)}>
						{f}
					</button>
				))}
			</div>
			<ul class="project-grid">
				{shown.map((p) => (
					<li key={p.slug}>
						<a class="project-card" href={`/projects/${p.slug}`} style={`view-transition-name: project-${p.slug}`}>
							<div class="project-head">
								<h2>{p.name}</h2>
								<span class={`status status-${p.status}`}>{p.status}</span>
							</div>
							<p>{p.description}</p>
							{p.tags.length > 0 && (
								<ul class="tags">
									{p.tags.map((t) => (
										<li key={t}>{t}</li>
									))}
								</ul>
							)}
						</a>
					</li>
				))}
			</ul>
			{shown.length === 0 && <p class="project-empty">Nothing here yet.</p>}
		</section>
	);
}

export function ProjectDetail(props: { slug: string }) {
	const p = getProjects().find((x) => x.slug === props.slug);

	if (!p) {
		return (
			<section>
				<h1 class="page-title">Not found</h1>
				<p class="project-empty">No project called “{props.slug}”.</p>
			</section>
		);
	}

	const Demo = p.demoComponent ? demoLoaders[`/src/pages/Demo/${p.demoComponent}.tsx`] : undefined;

	return (
		<section class="project-detail" style={`view-transition-name: project-${p.slug}`}>
			<h1 class="detail-title">
				<a href="/projects">Projects</a>
				<span class="detail-title-sep" aria-hidden="true">
					/
				</span>
				{p.name} <span class={`status status-${p.status}`}>{p.status}</span>
			</h1>
			<div class="detail-meta">
				<p>{p.description}</p>
				{p.tags.length > 0 && (
					<ul class="tags">
						{p.tags.map((t) => (
							<li key={t}>{t}</li>
						))}
					</ul>
				)}
				<div class="project-links">
					{p.repo && (
						<a href={p.repo} target="_blank" rel="noopener noreferrer">
							Source
						</a>
					)}
				</div>
			</div>
			<hr class="detail-rule" />
			{(Demo || p.demo) && (
				<DemoFrame
					src={p.demo}
					title={`${p.name} demo`}
					loader={Demo ? Demo : undefined}
				/>
			)}
			{p.commentary && (
				<div class="commentary">
					<h2>Developer commentary</h2>
					{p.commentary.split(/\n\s*\n/).map((para, i) => (
						<p key={i}>{para.trim()}</p>
					))}
				</div>
			)}
		</section>
	);
}
