import { useState, useRef } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { V86, type V86Options } from 'v86';
import wasmUrl from 'v86/build/v86.wasm?url';

// Streamed fetch with progress; used for the (large) v86 boot assets.
const fetchBuffer = async (url: string, onBytes?: (loaded: number) => void): Promise<ArrayBuffer> => {
	const res = await fetch(url);
	const reader = res.body!.getReader();
	const chunks: Uint8Array[] = [];
	let loaded = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value);
		loaded += value.length;
		onBytes?.(loaded);
	}
	const out = new Uint8Array(loaded);
	let off = 0;
	for (const c of chunks) {
		out.set(c, off);
		off += c.length;
	}
	return out.buffer;
};

export type V86Asset = { name: string; url: string };

export type V86Progress = {
	/** bytes downloaded so far, across all assets */
	loaded: number;
	/** total bytes when known exactly (v86-manifest), else 0 = indeterminate */
	total: number;
	/** smoothed download speed in bytes/s */
	speed: number;
};

export type V86Assets = { buffers: Record<string, ArrayBuffer>; wasm: Promise<WebAssembly.Module> };

// Sizes of the boot assets as emitted by the v86-manifest vite plugin — the
// raw byte size on disk, which is exactly what fetch's reader streams (the
// browser decompresses gzip back to the original bytes). This is the only
// exact denominator when the host compresses; Content-Length is wire bytes.
const fetchSizes = async (): Promise<Record<string, number> | null> => {
	try {
		return await (await fetch('/v86-manifest.json')).json();
	} catch {
		return null;
	}
};

const sizeFor = (url: string, sizes: Record<string, number> | null): number => {
	if (!sizes) return 0;
	const base = url.split('/').pop()!;
	// built wasm gets a hashed name (v86-XXXX.wasm)
	return sizes[base] ?? (base.endsWith('.wasm') ? (sizes['v86.wasm'] ?? 0) : 0);
};

// Download all boot assets concurrently (wasm included) with one aggregate
// progress callback, and compile the emulator wasm once. Pass the result to
// createV86 for each VM — they all instantiate from the same compiled module
// and share the downloaded bytes.
export async function fetchV86Assets(
	specs: V86Asset[],
	onProgress?: (p: V86Progress) => void
): Promise<V86Assets> {
	const sizes = await fetchSizes();
	const files = specs.map((f) => ({ ...f, loaded: 0, total: sizeFor(f.url, sizes), reliable: sizeFor(f.url, sizes) > 0 }));
	const start = performance.now();
	let smoothed = 0; // EMA of bytes/s
	let lastBytes = 0;
	let lastTime = start;
	const bump = () => {
		if (!onProgress) return;
		const now = performance.now();
		const dt = (now - lastTime) / 1000;
		if (dt > 0.1) {
			const bytes = files.reduce((s, f) => s + f.loaded, 0);
			const instant = (bytes - lastBytes) / dt;
			smoothed = smoothed ? smoothed * 0.7 + instant * 0.3 : instant;
			lastBytes = bytes;
			lastTime = now;
		}
		// totals are only comparable to loaded when EVERY response is
		// uncompressed with a real Content-Length; otherwise wire vs
		// decompressed bytes mix and the sum is meaningless
		const allReliable = files.every((f) => f.reliable);
		onProgress({
			loaded: files.reduce((s, f) => s + f.loaded, 0),
			total: allReliable ? files.reduce((s, f) => s + f.total, 0) : 0,
			speed: smoothed,
		});
	};
	const buffers = Object.fromEntries(
		await Promise.all(
			files.map((f) =>
				fetchBuffer(f.url, (loaded) => {
					f.loaded = loaded;
					bump();
				}).then((buf) => [f.name, buf])
			)
		)
	);
	return { buffers, wasm: WebAssembly.compile(buffers.wasm) };
}

// v86's URL loader pads images and owns its buffers; raw buffers skip the
// padding, and its bzImage setup builds a Uint32Array over the buffer — which
// throws when the byte length isn't a multiple of 4. Pad to 4-byte alignment.
const aligned = (b: ArrayBuffer) => {
	const out = new ArrayBuffer(Math.ceil(b.byteLength / 4) * 4);
	new Uint8Array(out).set(new Uint8Array(b));
	return out;
};

const wasm_fn = (module: Promise<WebAssembly.Module>) => (imports: WebAssembly.Imports) =>
	module.then((m) => WebAssembly.instantiate(m, imports).then((inst) => inst.exports));

// Build V86Options from shared downloaded buffers. Known asset names map to
// their v86 option (bios, vga, kernel -> bzimage, initrd, fda); every VM gets
// its own aligned copy of each buffer, in RAM only — the network fetch is
// still shared. `extra` carries per-VM options (cmdline, net_device, …).
export function v86Options(
	container: HTMLElement,
	assets: V86Assets,
	extra: Partial<V86Options>
): V86Options {
	const withBuf = (name: string) => ({ buffer: aligned(assets.buffers[name]) });
	return {
		wasm_fn: wasm_fn(assets.wasm),
		screen: { container },
		autostart: true,
		disable_speaker: true,
		...(assets.buffers.bios && { bios: withBuf('bios') }),
		...(assets.buffers.vga && { vga_bios: withBuf('vga') }),
		...(assets.buffers.kernel && { bzimage: withBuf('kernel') }),
		...(assets.buffers.initrd && { initrd: withBuf('initrd') }),
		...(assets.buffers.fda && { fda: withBuf('fda') }),
		...extra,
	};
}

// Convenience loader for single-VM demos: fetch everything (progress), then
// boot and return the instance.
export async function bootV86(
	container: HTMLElement,
	specs: V86Asset[],
	extra: Partial<V86Options>,
	onProgress?: (p: V86Progress) => void
): Promise<V86> {
	const assets = await fetchV86Assets(specs, onProgress);
	return new V86(v86Options(container, assets, extra));
}

export { wasmUrl };

// ---- progress UI shared by all demos ----

const fmtBytes = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);

const fmtSpeed = (bps: number) => `${fmtBytes(bps)}/s`;

export function V86Progress(props: { label: string; progress: V86Progress | null }) {
	const p = props.progress;
	const pct = p && p.total > 0 ? Math.round((p.loaded / p.total) * 100) : null;
	return (
		<span class="demo-status">
			{props.label}
			{p && (
				<>
					<span class="demo-progress" role="progressbar" aria-valuenow={pct ?? undefined} aria-valuemin={0} aria-valuemax={100}>
						<span class="demo-progress-fill" style={pct !== null ? `width: ${pct}%` : undefined} />
					</span>
					<span class="demo-progress-text">
						{fmtBytes(p.loaded)}
						{p.total > 0 ? ` / ${fmtBytes(p.total)}` : ''} — {fmtSpeed(p.speed)}
					</span>
				</>
			)}
		</span>
	);
}

// ---- demo controls: the full idle/loading/error/running lifecycle ----

/**
 * Boot lifecycle shared by all demos: double-click guard, loading/error
 * states, and aggregate fetch progress. `boot` receives an onProgress
 * callback to wire into bootV86/fetchV86Assets.
 */
export function useDemoBoot(opts: { boot: (onProgress: (p: V86Progress) => void) => Promise<void> }) {
	const [state, setState] = useState<'idle' | 'loading' | 'running' | 'error'>('idle');
	const [error, setError] = useState('');
	const [progress, setProgress] = useState<V86Progress | null>(null);
	// ref guard, not state: setState is async, so a double-click would
	// re-enter through the stale closure and boot twice
	const booting = useRef(false);

	const boot = async () => {
		if (booting.current) return;
		booting.current = true;
		if (state !== 'idle' && state !== 'error') {
			booting.current = false;
			return;
		}
		setState('loading');
		try {
			await opts.boot(setProgress);
			setState('running');
			setProgress(null);
		} catch (e) {
			setError(String((e as Error).message));
			setState('error');
		} finally {
			booting.current = false;
		}
	};

	return { state, error, progress, boot };
}

/**
 * Idle/loading/error buttons + progress for every state; when running, the
 * demo's own controls render as children.
 */
export function DemoControls(props: {
	state: 'idle' | 'loading' | 'running' | 'error';
	error: string;
	progress: V86Progress | null;
	label: string;
	bootLabel: string;
	onBoot: () => void;
	children?: ComponentChildren;
}) {
	return (
		<div class="demo-controls">
			{props.state === 'idle' && (
				<button class="try-it" onClick={props.onBoot}>
					{props.bootLabel}
				</button>
			)}
			{props.state === 'loading' && <V86Progress label={props.label} progress={props.progress} />}
			{props.state === 'error' && (
				<>
					<span class="demo-status error">{props.error}</span>
					<button class="try-it" onClick={props.onBoot}>
						Retry
					</button>
				</>
			)}
			{props.state === 'running' && props.children}
		</div>
	);
}
