/**
 * Layout of the reading ruler's scale.
 *
 * The minor scale is a uniform grid of `n` equal steps (n + 1 ticks, both ends included), like
 * a real ruler. Each section tick is snapped to its nearest grid tick. `n` is chosen, from
 * grid spacings of roughly 5 to 14px, to make the snapping error as small as possible.
 */
export interface RulerFit {
	/** number of equal steps; the grid has n + 1 ticks at k / n */
	n: number;
	/** each input position snapped to the grid, as a 0..1 fraction (same order as the input) */
	snapped: number[];
	/** |snapped - exact| in px for each input, for tuning and tests */
	errPx: number[];
}

const MIN_GAP = 5;
const MAX_GAP = 14;
const TARGET_GAP = 8;

/** cost added when two sections would land on the same grid tick (they'd be indistinguishable) */
const COLLISION = 100;

/**
 * @param ps       exact positions along the article, 0..1, ascending
 * @param trackPx  height of the ruler in px
 */
export function fitRuler(ps: number[], trackPx: number): RulerFit {
	const lo = Math.max(4, Math.floor(trackPx / MAX_GAP));
	const hi = Math.max(lo, Math.ceil(trackPx / MIN_GAP));
	let best: RulerFit | undefined;
	let bestCost = Infinity;

	for (let n = lo; n <= hi; n++) {
		const ks = ps.map((p) => Math.round(p * n));
		const errPx = ps.map((p, i) => Math.abs(p - ks[i] / n) * trackPx);

		// squared error, so one badly-placed tick costs more than several slightly-off ones
		let cost = 0;
		for (const e of errPx) cost += e * e;
		for (let i = 1; i < ks.length; i++) if (ks[i] === ks[i - 1]) cost += COLLISION;
		// among near-ties, prefer a grid close to the usual spacing
		cost += 0.05 * (trackPx / n - TARGET_GAP) ** 2;

		if (cost < bestCost) {
			bestCost = cost;
			best = { n, snapped: ks.map((k) => k / n), errPx };
		}
	}
	return best!;
}
