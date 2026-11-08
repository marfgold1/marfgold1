import { useEffect, useState } from 'preact/hooks';
import { getTheme, nextTheme, setTheme, type Theme } from '@/lib/theme.js';

const LABEL: Record<Theme, string> = { system: '◐ auto', light: '☀ light', dark: '☾ dark' };

export function ThemeToggle() {
	// SSR can't know the stored choice, so start at 'system' and sync after mount.
	const [theme, set] = useState<Theme>('system');
	useEffect(() => set(getTheme()), []);

	const cycle = () => {
		const n = nextTheme(theme);
		setTheme(n);
		set(n);
	};

	return (
		<button type="button" class="theme-toggle" onClick={cycle} aria-label={`Theme: ${theme}. Click to change.`}>
			{LABEL[theme]}
		</button>
	);
}
