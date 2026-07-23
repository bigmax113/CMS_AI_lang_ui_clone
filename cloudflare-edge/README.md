# LORGAR Blog Cloudflare Edge

This Worker provides an isolated Cloudflare frontend in front of the accepted Render deployment.

## Data ownership

- Public frontend origin: `https://lorgar-blog-work.onrender.com`
- Payload API and admin: `https://lorgar-cms-work.onrender.com`
- Article database: the existing Render PostgreSQL database used by Payload

The Worker does not connect to PostgreSQL and cannot modify its schema. API writes are forwarded to
the accepted Payload service. The Render services remain independently reachable and deployable.

## Routing

- Public pages and Next.js assets are forwarded to the accepted frontend origin.
- `/api/*` is forwarded to the accepted Payload origin.
- `/admin/*` redirects to the accepted Payload admin URL.
- `/_edge/health` reports the active edge/origin topology.

Only static assets and non-preview document requests are cached. API requests, previews, React Server
Component navigation requests, and writes bypass the edge cache.

## Deploy

```powershell
npx wrangler deploy --config cloudflare-edge/wrangler.jsonc
```
