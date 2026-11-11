import { useEffect, useRef } from 'preact/hooks';
import { V86 } from 'v86';
import { bootV86, DemoControls, useDemoBoot, wasmUrl, type V86Asset } from './v86-utils.js';
import './demo.css';

// Bootable floppy image, served from the site's public/ directory.
const ASSETS: V86Asset[] = [
	{ name: 'wasm', url: wasmUrl },
	{ name: 'bios', url: '/v86/bios/seabios.bin' },
	{ name: 'vga', url: '/v86/bios/vgabios.bin' },
	{ name: 'fda', url: '/v86/system.img' },
];

export function NewosDemo() {
	const screen = useRef<HTMLDivElement>(null);
	const emulator = useRef<V86 | null>(null);

	useEffect(() => () => emulator.current?.destroy?.(), []);

	const { state, error, progress, boot } = useDemoBoot({
		boot: async (onProgress) => {
			if (!screen.current) return;
			emulator.current = await bootV86(screen.current, ASSETS, {}, onProgress);
		},
	});

	return (
		<div class="demo-embed">
			<DemoControls state={state} error={error} progress={progress} label="Loading emulator…" bootLabel="Boot" onBoot={boot} />
			<div ref={screen} class="v86-screen">
				<div style="white-space: pre; font: 14px/1.2 var(--font-mono);" />
				<canvas style="display: none;" />
			</div>
		</div>
	);
}

export default NewosDemo;
