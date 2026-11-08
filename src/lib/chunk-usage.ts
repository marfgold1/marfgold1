// Keys of lazy chunks rendered since the last reset, e.g. `components/mdx/Counter`
// or `blogs/hello-world`. Prerender reads this so plugins/mdx-css.ts can link only
// the CSS the page actually needs. Harmless on the client.
export const usedChunks = new Set<string>();
export const markUsed = (key: string) => {
	usedChunks.add(key);
};
