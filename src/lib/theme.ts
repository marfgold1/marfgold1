export type Theme = 'system' | 'light' | 'dark';

const KEY = 'theme';

// The same read happens in an inline <script> in index.html before first paint
// (so there's no flash); keep the two in sync.
export function getTheme(): Theme {
	try {
		const v = localStorage.getItem(KEY);
		return v === 'light' || v === 'dark' ? v : 'system';
	} catch {
		return 'system'; // storage can throw (private mode, blocked cookies)
	}
}

export function applyTheme(t: Theme) {
	const root = document.documentElement;
	if (t === 'system') root.removeAttribute('data-theme');
	else root.setAttribute('data-theme', t);
}

export function setTheme(t: Theme) {
	try {
		if (t === 'system') localStorage.removeItem(KEY);
		else localStorage.setItem(KEY, t);
	} catch {
		/* ignore */
	}
	applyTheme(t);
}

export const nextTheme = (t: Theme): Theme => (t === 'system' ? 'light' : t === 'light' ? 'dark' : 'system');
