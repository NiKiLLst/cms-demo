# cms-demo

Side-by-side demo of seven CMS / backend platforms running on a single Proxmox VM, deployed via [Coolify](https://coolify.io) and exposed publicly through a Cloudflare Tunnel + Cloudflare Access.

## Stack

| App           | Image / framework                  | DB           | Admin URL                          | Frontend URL                  |
|---------------|------------------------------------|--------------|------------------------------------|-------------------------------|
| Strapi        | generated app + `node:20-alpine`   | SQLite       | `strapi-admin.<domain>`            | `strapi.<domain>`             |
| Directus      | `directus/directus:11`             | Postgres     | `directus-admin.<domain>`          | `directus.<domain>`           |
| Ghost         | `ghost:5` + custom theme           | MySQL 8      | `ghost.<domain>/ghost`             | `ghost.<domain>` (blog only)  |
| PocketBase    | `alpine:3.20` + pinned binary      | embedded     | `pocketbase-admin.<domain>/_/`     | `pocketbase.<domain>`         |
| Appwrite      | Coolify service template           | MariaDB      | `appwrite.<domain>/console`        | `appwrite-fe.<domain>`        |
| PayloadCMS    | generated Next.js + Payload        | Postgres     | `payload.<domain>/admin`           | `payload.<domain>`            |
| Next.js demo  | generated Next.js app (CMS-less)   | filesystem   | n/a — git push to edit             | `next.<domain>`               |

Each CMS exposes the same three pages so they can be compared head-to-head:

- `/blog` — articles authored from the CMS admin
- `/portfolio` — portfolio items authored from the CMS admin
- `/prenotazioni` — public booking form that POSTs into the CMS; "inbox" is the CMS admin's collection view

For Ghost, `/portfolio` and `/prenotazioni` are explicitly marked **N/A** (Ghost is blog-only). For Next.js demo, content lives as Markdown in the repo (`content/blog/`, `content/portfolio/`) and bookings get appended to `/app/data/bookings.json` — that's the contrast point of the CMS-less variant.

## Validation matrix

Fill in after touching each CMS's admin UI. Rate 1–5 (5 = ergonomic for a non-dev editor).

| CMS         | Blog UX | Portfolio UX | Booking inbox UX | Time to first content (min) | Notes |
|-------------|:-:|:-:|:-:|:-:|---|
| Strapi      |   |   |   |   |   |
| Directus    |   |   |   |   |   |
| Ghost       |   | N/A | N/A |   |   |
| PocketBase  |   |   |   |   |   |
| Appwrite    |   |   |   |   |   |
| PayloadCMS  |   |   |   |   |   |
| Next.js     | ❌ | ❌ | ❌ |   | CMS-less — contrast variant |

## Deploy a CMS

```powershell
.\tools\coolify\deploy.ps1 -Cms <name>
```

Resources are defined declaratively in `tools/coolify/cms.manifest.yml`. The CMS_URL env for each frontend points to the matching admin URL — frontend → admin over HTTPS via the Cloudflare Tunnel (intra-VM Docker network does not span resources).

DNS / Cloudflare Tunnel: each subdomain (both `<cms>.<domain>` and `<cms>-admin.<domain>`) needs a CNAME → tunnel UUID + a tunnel public hostname rule. See `infra/cloudflared/config.example.yml`.

## Local smoke test

```powershell
cd apps/<cms>
Copy-Item .env.example .env  # then fill secrets
docker compose up -d
docker compose logs -f
```

## Frontend-only smoke test

The 4 thin Next.js frontends (`apps/{strapi,directus,pocketbase,appwrite}-frontend`) need just `CMS_URL` pointing at a reachable CMS admin URL:

```powershell
cd apps/directus-frontend
$env:CMS_URL = "http://localhost:8055"   # or remote admin URL
npm install
npm run dev
```

See `CLAUDE.md` for the full architecture and conventions.
