# Cloudflare deployment (Workers static assets)

`wrangler.jsonc` in the repo root defines everything: project name `marfgold1`, assets from
`./dist`, and `/404.html` served for unknown routes (the site is fully prerendered, so no
functions or SPA fallback are needed).

## One-time setup (dashboard, ~2 minutes)

1. Push `feat/theme-redesign`, merge to `main` (or point the deploy at `feat/theme-redesign` for now).
2. Cloudflare dashboard → **Workers & Pages → Create → Workers → Connect to Git** → pick `marfgold1/marfgold1`.
3. Build settings:
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy`
   - **Environment variables:** `NODE_VERSION` = `22` (any Node ≥ 20 works; Vite 8 needs modern Node)
4. Save. First build runs; site lands at `marfgold1.<your-subdomain>.workers.dev`.

## CLI alternative

```bash
npm i -D wrangler
npx wrangler login
npx wrangler deploy        # builds are separate: run `npm run build` first
```

## Repo hygiene for the deploy

- `NODE_VERSION` env var (or a `.node-version`/`.nvmrc` file) pins Cloudflare's Node — otherwise it uses a default that may lag.
- New posts → new prerendered routes automatically: `vite.config.ts` scans `src/blogs/*.mdx` and adds each slug to `additionalPrerenderRoutes`. No deploy config changes needed.

## After first deploy

- Set `ORIGIN` in `src/index.tsx` to the real origin (`https://marfgold1.<subdomain>.workers.dev` or your custom domain) so canonical/OG URLs are absolute. TODO already marks it.
- Custom domain: Workers project → Settings → Domains & Routes → add + follow DNS instructions.
- Preview deploys come free: every non-production branch gets a preview URL on push.
