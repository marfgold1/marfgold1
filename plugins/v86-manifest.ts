import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';

// Emits /v86-manifest.json — DECODED byte sizes of every public/v86 asset
// plus v86.wasm. fetch() streams decompressed bytes: when the host declares
// Content-Encoding (or serves a .gz file, which the browser transparently
// decodes), the reader yields the decoded content, not the file on disk.
// So the size reported here is what the progress bar's `loaded` counts:
//  - plain files: file size
//  - .gz files: the gzip ISIZE trailer (last 4 bytes, little-endian)
// Content-Length (compressed wire bytes) is never comparable to it.

const publicDir = 'public';

const decodedSize = (path: string): number => {
	const size = statSync(path).size;
	if (path.endsWith('.gz') && size >= 4) {
		const buf = readFileSync(path);
		return buf.readUInt32LE(size - 4);
	}
	return size;
};

const walk = (dir: string, base = ''): Record<string, number> => {
	const out: Record<string, number> = {};
	for (const name of readdirSync(dir)) {
		const full = join(dir, name);
		const rel = base ? `${base}/${name}` : name;
		if (statSync(full).isDirectory()) Object.assign(out, walk(full, rel));
		else out[`/${rel}`] = decodedSize(full);
	}
	return out;
};

const byName = (): Record<string, number> => {
	const wasmPath = 'node_modules/v86/build/v86.wasm';
	return {
		// dev serves the wasm straight from node_modules; build emits it hashed
		// under /assets — runtime matches .wasm URLs back to this entry
		'v86.wasm': existsSync(wasmPath) ? statSync(wasmPath).size : 0,
		...Object.fromEntries(Object.entries(walk(publicDir + '/v86')).map(([url, size]) => [url.split('/').pop()!, size])),
	};
};

export function v86Manifest(): Plugin {
	return {
		name: 'v86-manifest',
		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				if (req.url !== '/v86-manifest.json') return next();
				res.setHeader('Content-Type', 'application/json');
				res.end(JSON.stringify(byName()));
			});
		},
		generateBundle() {
			this.emitFile({ type: 'asset', fileName: 'v86-manifest.json', source: JSON.stringify(byName()) });
		},
	};
}
