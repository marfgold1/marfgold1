import { projects } from 'virtual:project-index';
import type { ProjectMeta } from '../../plugins/project-index';

export type { ProjectMeta };

export const getProjects = (): ProjectMeta[] => projects;
export const getProject = (slug: string): ProjectMeta | undefined => projects.find((p) => p.slug === slug);
export const getFeaturedProjects = (): ProjectMeta[] => projects.filter((p) => p.featured);
