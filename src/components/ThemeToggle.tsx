import { useEffect, useState } from 'preact/hooks';
import { applyTheme, getTheme, setTheme, type Theme } from '@/lib/theme.js';

const LABEL: Record<Theme, string> = { system: '◐ auto', light: '☀ light', dark: '☾ dark' };

export function ThemeToggle() {
	// SSR can't know the stored choice, so start at 'system' and sync after mount.
	const [theme, set] = useState<Theme>('system');
	useEffect(() => set(getTheme()), []);

	// Default is auto (follows the OS). Clicking always switches light <-> dark and
	// persists the choice; getting back to auto means resetting the preference.
	const flip = () => {
		const resolved =
		theme === 'system'
			? matchMedia('(prefers-color-scheme: dark)').matches
				? 'dark'
				: 'light'
			: theme;
		const next: Theme = resolved === 'light' ? 'dark' : 'light';
		setTheme(next);
		set(next);
	};

	// follow the OS while the preference is still 'auto'
	useEffect(() => {
		if (theme !== 'system') return;
		const mq = matchMedia('(prefers-color-scheme: dark)');
		const onChange = () => applyTheme('system');
		mq.addEventListener('change', onChange);
		return () => mq.removeEventListener('change', onChange);
	}, [theme]);

	return (
		<button type="button" class="theme-toggle" onClick={flip} aria-label={`Theme: ${theme}. Click to switch.`}>
			{LABEL[theme]}
		</button>
	);
}
