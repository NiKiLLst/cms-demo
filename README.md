# cms-demo

Side-by-side demo of seven CMS / backend platforms running on a single Proxmox VM, deployed via [Coolify](https://coolify.io) and exposed publicly through a Cloudflare Tunnel + Cloudflare Access.

## Stack

| App           | Image / framework                  | DB           | Path                |
|---------------|------------------------------------|--------------|---------------------|
| Strapi        | generated app + `node:20-alpine`   | Postgres     | `apps/strapi`       |
| Directus      | `directus/directus:11`             | Postgres     | `apps/directus`     |
| Ghost         | `ghost:5`                          | MySQL 8      | `apps/ghost`        |
| PocketBase    | `alpine:3.20` + pinned binary      | embedded     | `apps/pocketbase`   |
| Appwrite      | Coolify service template           | MariaDB      | `apps/appwrite`     |
| PayloadCMS    | generated Next.js + Payload        | Postgres     | `apps/payloadcms`   |
| Next.js demo  | generated Next.js app              | —            | `apps/nextjs-demo`  |

## Deploy a CMS

1. Push this repo to a remote that Coolify can pull (GitHub / Gitea).
2. In Coolify → **+ New Resource → Docker Compose** → point at `apps/<cms>/docker-compose.yml`.
3. Copy the variables from `apps/<cms>/.env.example` into Coolify's env panel and fill in real values.
4. Set the domain `<cms>.<your-domain>` in Coolify.
5. In Cloudflare Zero Trust: add CNAME `<cms>` → tunnel UUID; add an Access policy in front of admin paths.

See `CLAUDE.md` for the full architecture and conventions.

## Local smoke test

```powershell
cd apps/<cms>
Copy-Item .env.example .env  # then fill secrets
docker compose up -d
docker compose logs -f
```

## Apps that need scaffolding before first deploy

`apps/strapi`, `apps/payloadcms`, and `apps/nextjs-demo` are placeholders — generate the codebases with `npx create-*` (commands in `CLAUDE.md`), commit, then deploy via Coolify. Appwrite is installed via Coolify's one-click service template, not from this repo.
