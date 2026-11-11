import { useEffect, useRef, useState } from 'preact/hooks';
import { V86, V86Options } from 'v86';
import wasmUrl from 'v86/build/v86.wasm?url';
import './demo.css';

// Bootable floppy image, served from the site's public/ directory.
const IMAGE_URL = '/v86/system.img';

export function NewosDemo() {
	const screen = useRef<HTMLDivElement>(null);
	const emulator = useRef<V86 | null>(null);
	const [state, setState] = useState<'idle' | 'loading' | 'running' | 'error'>('idle');
	const [error, setError] = useState('');

	useEffect(() => () => emulator.current?.destroy?.(), []);

	const boot = async () => {
		if (state !== 'idle' && state !== 'error') return;
		setState('loading');
		try {
			if (!screen.current) return;
			emulator.current = new V86({
				wasm_path: wasmUrl,
				screen_container: screen.current,
				bios: { url: '/v86/bios/seabios.bin' },
				vga_bios: { url: '/v86/bios/vgabios.bin' },
				fda: { url: IMAGE_URL },
				autostart: true,
				disable_speaker: true,
			});
			setState('running');
		} catch (e) {
			setError(String((e as Error).message));
			setState('error');
		}
	};

	return (
		<div class="demo-embed">
			<div class="demo-controls">
				{state === 'idle' && (
					<button class="try-it" onClick={boot}>
						Boot
					</button>
				)}
				{state === 'loading' && <span class="demo-status">Loading emulator…</span>}
				{state === 'error' && (
					<>
						<span class="demo-status error">{error}</span>
						<button class="try-it" onClick={boot}>
							Retry
						</button>
					</>
				)}
				{state === 'running' && <span class="demo-status">Running — click screen for keyboard</span>}
			</div>
			<div ref={screen} class="v86-screen">
				<div style="white-space: pre; font: 14px/1.2 var(--font-mono);" />
				<canvas style="display: none;" />
			</div>
		</div>
	);
}

export default NewosDemo;
