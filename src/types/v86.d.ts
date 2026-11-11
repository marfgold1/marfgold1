// Module augmentation for v86 0.5.473 — completes what the upstream
// v86.d.ts leaves out. Everything here is verified against the runtime
// source (src/browser/starter.js, src/bus.js) as of 2026-11.
import "v86";

declare module "v86" {
	// runtime-only bus events missing from the upstream Event map.
	// names collected from every bus.register/send call site in src/.
	export interface Event {
		/** frame injected into the guest NIC (bus.send only; never emitted) */
		"net0-receive": Uint8Array;
		/** internal: wasm CPU asks to halt timers */
		"cpu-event-halt": void;
		/** keyboard adapter → guest (scancode payload) */
		"keyboard-code": number[];
		/** raw relative mouse movement from the adapter */
		"mouse-delta": [number, number];
		"mouse-click": [boolean, boolean];
		"mouse-wheel": [number, number];
		"mouse-pointer-lock": boolean;
		/** absolute positioning (vmware-style tablet), normalised 0..0x7fff */
		"mouse-absolute": [number, number, number];
		/** audio graph wiring */
		"mixer-connect": [string, number];
		"mixer-disconnect": [string, number];
		"mixer-volume": [string, number, number];
		"mixer-gain-left": number;
		"mixer-gain-right": number;
		"mixer-treble-left": number;
		"mixer-treble-right": number;
		"mixer-bass-left": number;
		"mixer-bass-right": number;
		"speaker-has-initialized": void;
		"speaker-confirm-initialized": void;
		"pcspeaker-enable": void;
		"pcspeaker-disable": void;
		"pcspeaker-update": [number, number];
		"dac-enable": void;
		"dac-disable": void;
		"dac-send-data": number;
		"dac-request-data": void;
		"dac-tell-sampling-rate": number;
		/** generic legacy serial line (modem etc.) */
		serial: number;
		/** network adapter stats: [bytes] */
		net: [number];
		/** wisp/fetch relay TCP handshake */
		"tcp-connection": number;
	}

	// bus exists at runtime (BusConnector from src/bus.js) but is missing
	// from the upstream class declaration
	export interface V86Bus {
		add_listener<T extends keyof Event>(event: T, listener: (argument: Event[T]) => void): void;
		register<T extends keyof Event>(event: T, listener: (argument: Event[T]) => void, this_value?: unknown): void;
		remove_listener<T extends keyof Event>(event: T, listener: (argument: Event[T]) => void): void;
		unregister<T extends keyof Event>(event: T, listener: (argument: Event[T]) => void): void;
		send<T extends keyof Event>(event: T, data: Event[T]): void;
		send_async<T extends keyof Event>(event: T, data: Event[T]): void;
	}

	export interface V86 {
		/** paired BusConnector: send here goes to the device side, and back */
		bus: V86Bus;
		/** internal connector the wasm CPU listens on (read-only in practice) */
		emulator_bus: V86Bus;
		cpu_is_running: boolean;

		/** upstream declares keyboard_set_enabled only; both names exist */
		keyboard_set_status(enabled: boolean): void;
		mouse_set_status(enabled: boolean): void;
	}
}
