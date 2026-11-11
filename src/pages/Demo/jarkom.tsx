import { useEffect, useRef, useState } from 'preact/hooks';
import { V86 } from 'v86';
import wasmUrl from 'v86/build/v86.wasm?url';
import { DemoControls, fetchV86Assets, useDemoBoot, v86Options, type V86Asset } from './v86-utils.js';
import './demo.css';

// the wasm fetch joins the same concurrent batch + progress bar
const ASSETS: V86Asset[] = [
	{ name: 'wasm', url: wasmUrl },
	{ name: 'bios', url: '/v86/bios/seabios.bin' },
	{ name: 'vga', url: '/v86/bios/vgabios.bin' },
	{ name: 'kernel', url: '/v86/jarkom/vmlinuz' },
	{ name: 'initrd', url: '/v86/jarkom/initramfs.cpio.gz' },
];

export function JarkomDemo() {
	const screenA = useRef<HTMLDivElement>(null);
	const screenB = useRef<HTMLDivElement>(null);
	const emA = useRef<V86 | null>(null);
	const emB = useRef<V86 | null>(null);
	const [focus, setFocus] = useState<'a' | 'b'>('a');
	const focusRef = useRef<'a' | 'b'>('a');
	focusRef.current = focus;
	const [packets, setPackets] = useState<{ dir: string; line: string; dump: string[] }[]>([]);
	const [openPacket, setOpenPacket] = useState<number | null>(null);
	const [guestCtrl, setGuestCtrl] = useState(true);
	const guestCtrlRef = useRef(true);
	guestCtrlRef.current = guestCtrl;

	// hex + ascii dump of a byte range, 16 bytes per row
	const hexDump = (d: Uint8Array, start: number, end: number) => {
		const rows: string[] = [];
		for (let o = start; o < end; o += 16) {
			const row = [...d.slice(o, Math.min(o + 16, end))];
			const hexPart = row.map((b) => b.toString(16).padStart(2, '0')).join(' ');
			const ascii = [...row].map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '.')).join('');
			rows.push(`${o.toString(16).padStart(4, '0')}  ${hexPart.padEnd(47)}  |${ascii}|`);
		}
		return rows;
	};

	// decode an ethernet frame into a log line: MACs, ethertype, IP/UDP/ARP
	const describeFrame = (d: Uint8Array) => {
		const hex = (n: number) => n.toString(16).padStart(2, '0');
		const mac = (o: number) => [0, 1, 2, 3, 4, 5].map((i) => hex(d[o + i])).join(':');
		const v = new DataView(d.buffer, d.byteOffset, d.byteLength);
		const et = v.getUint16(12);
		let detail = '';
		if (et === 0x0800 && d.length >= 34) {
			const src = [d[26], d[27], d[28], d[29]].join('.');
			const dst = [d[30], d[31], d[32], d[33]].join('.');
			const proto = d[23];
			if (proto === 17 && d.length >= 42) {
				const sp = v.getUint16(34);
				const dp = v.getUint16(36);
				detail = `udp ${src}:${sp} → ${dst}:${dp} payload=${d.length - 42}B`;
			} else if (proto === 1) {
				detail = `icmp ${src} → ${dst}`;
			} else {
				detail = `ip ${src} → ${dst} proto=${proto}`;
			}
		} else if (et === 0x0806) {
			detail = `arp who-has ${[d[38], d[39], d[40], d[41]].join('.')} tell ${[d[28], d[29], d[30], d[31]].join('.')}`;
		} else {
			detail = `ethertype=0x${hex(et >> 8)}${hex(et & 0xff)}`;
		}
		return `${mac(6)} → ${mac(0)} ${detail}`;
	};

	useEffect(
		() => () => {
			emA.current?.destroy?.();
			emB.current?.destroy?.();
		},
		[]
	);

	// Paste host clipboard into the focused VM. The emulator captures ALL
	// keydowns at the window level and preventDefaults them (which also kills
	// the browser's own Ctrl+C copy). Capture-phase handling:
	//   Ctrl/Cmd+V        → always ours: type host clipboard into the guest
	//   Ctrl/Cmd+C/X/A    → guest keyboard mode on: let v86 see it (SIGINT etc.)
	//                       off: hide from v86, let the browser copy
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (!(e.ctrlKey || e.metaKey)) return;
			const key = e.key.toLowerCase();
			const em = emA.current && focusRef.current === 'a' ? emA.current : emB.current;
			if (key === 'v' && em) {
				e.preventDefault();
				e.stopImmediatePropagation();
				navigator.clipboard
					.readText()
					.then((text) => em.keyboard_send_text(text))
					.catch(() => {});
				return;
			}
			if (!guestCtrlRef.current && (key === 'c' || key === 'x' || key === 'a')) {
				e.stopImmediatePropagation();
			}
		};
		document.addEventListener('keydown', onKey, true);
		return () => document.removeEventListener('keydown', onKey, true);
	}, []);

	const { state, error, progress, boot } = useDemoBoot({
		boot: async (onProgress) => {
			if (!screenA.current || !screenB.current) return;
			// fetch once (progress bar), then boot both VMs from the same
			// buffers and compiled wasm module
			const assets = await fetchV86Assets(ASSETS, onProgress);
			const mkOpts = (container: HTMLElement, cmdline: string) =>
				v86Options(container, assets, {
					cmdline,
					// default 64MB is too tight for kernel + initrd + unpacked rootfs
					memory_size: 128 * 1024 * 1024,
					net_device: { type: 'virtio' },
				});
			const a = new V86(mkOpts(screenA.current, 'console=tty0 vmip=10.5.0.2 role=server'));
			const b = new V86(mkOpts(screenB.current, 'console=tty0 vmip=10.5.0.3 role=client'));
			b.keyboard_set_enabled(false);
			// direct wire: whatever one NIC emits, the other receives
			const wire = (dir: string, from: V86, to: V86) => {
				from.add_listener('net0-send', (d) => {
					try {
						const dump = hexDump(d, 42, Math.min(d.length, 42 + 128));
						setPackets((p) => [...p.slice(-200), { dir, line: describeFrame(d), dump }]);
					} catch {
						// non-frame or truncated payload: skip the log line
					}
					to.bus.send('net0-receive', d);
				});
			};
			wire('A→B', a, b);
			wire('B→A', b, a);
			emA.current = a;
			emB.current = b;
		},
	});

	const focusOn = (which: 'a' | 'b') => {
		setFocus(which);
		emA.current?.keyboard_set_enabled(which === 'a');
		emB.current?.keyboard_set_enabled(which === 'b');
	};

	const paste = async () => {
		const em = focus === 'a' ? emA.current : emB.current;
		if (!em) return;
		try {
			const text = await navigator.clipboard.readText();
			em.keyboard_send_text(text);
		} catch {
			// clipboard permission denied: user needs to grant or paste via their OS
		}
	};

	return (
		<div class="demo-embed demo-twin">
			<DemoControls state={state} error={error} progress={progress} label="Loading two Linux VMs…" bootLabel="Boot both" onBoot={boot}>
				<button class="try-it" onClick={paste}>
					Paste to VM {focus === 'a' ? '1' : '2'}
				</button>
				<label class="lossy-toggle">
					<input
						type="checkbox"
						checked={guestCtrl}
						onChange={(e) => setGuestCtrl((e.target as HTMLInputElement).checked)}
					/>
					Capture Keyboard (disable to let browser copy work)
				</label>
			</DemoControls>
			<div class="twin-grid">
				<Pane label="VM 1 — server 10.5.0.2" focused={focus === 'a'} onFocus={() => focusOn('a')} screenRef={screenA} />
				<Pane label="VM 2 — client 10.5.0.3" focused={focus === 'b'} onFocus={() => focusOn('b')} screenRef={screenB} />
			</div>
			{packets.length > 0 && (
				<div class="packet-log">
					{packets.map((p, i) => (
						<div key={i}>
							<div class="packet-line" onClick={() => setOpenPacket(openPacket === i ? null : i)}>
								<span class="packet-dir">{p.dir}</span> {p.line}
							</div>
							{openPacket === i && (
								<pre class="packet-dump">{p.dump.join('\n')}</pre>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
}

function Pane(props: { label: string; focused: boolean; onFocus: () => void; screenRef: preact.Ref<HTMLDivElement> }) {
	const textRef = useRef<HTMLDivElement>(null);

	// guest tty is a fixed 80x25 character grid; scale the font so the 80
	// columns fill the container (mono glyphs ≈ 0.6em wide). Vite's text div
	// gets its size from v86 defaults, so we just rewrite the inline style.
	useEffect(() => {
		const wrap = props.screenRef && typeof props.screenRef === 'object' ? props.screenRef.current : null;
		const text = textRef.current;
		if (!wrap || !text) return;
		const fit = () => {
			const w = wrap.clientWidth - 12; // padding
			const size = Math.max(6, Math.min(14, w / (80 * 0.6)));
			text.style.fontSize = `${size}px`;
			text.style.lineHeight = '1.2';
		};
		const ro = new ResizeObserver(fit);
		ro.observe(wrap);
		fit();
		return () => ro.disconnect();
	}, []);

	return (
		<div class="twin-pane" data-focused={props.focused || undefined}>
			<span class="twin-label">{props.label}</span>
			<div ref={props.screenRef} class="v86-screen" onMouseDown={props.onFocus}>
				<div ref={textRef} style="white-space: pre; font: 14px/1.2 var(--font-mono);" />
				<canvas style="display: none;" />
			</div>
		</div>
	);
}

export default JarkomDemo;
