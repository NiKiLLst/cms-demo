# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A side-by-side demo of seven CMS / backend platforms — Strapi, Directus, Ghost, PocketBase, Appwrite, PayloadCMS, and a Next.js frontend — all running on a single Proxmox VM and exposed publicly via a Cloudflare Tunnel fronted by Cloudflare Access. Coolify is the deployment orchestrator on the VM; this repo is the source of truth for what gets deployed.

The repo is **not** a runnable monorepo: each `apps/<cms>/` is an independent stack that Coolify picks up as a separate "Docker Compose" Resource. There is no top-level build, no shared package manager, and no cross-app dependencies.

## Architecture

- **Host**: VM on local Proxmox. No public IP and no inbound ports open on the LAN/router.
- **Orchestrator**: Coolify (https://coolify.io) installed on the VM. Each CMS is a separate Resource pointed at a `docker-compose.yml` in this repo.
- **Network entry**: `cloudflared` runs on the VM and opens an outbound Cloudflare Tunnel. All public traffic enters via that tunnel.
- **TLS**: terminated at Cloudflare's edge. The tunnel speaks plain HTTP to Coolify's internal Traefik. **Do not** wire ACME / Let's Encrypt inside any compose file — it would conflict with the tunnel and never get a challenge.
- **Auth gate**: Cloudflare Access policies sit in front of admin URLs (`/admin`, `/dashboard`, etc.) so unauthenticated visitors can't reach login pages. Public CMS-served content stays public.
- **Subdomains**: every CMS gets `<cms>.<domain>` via Cloudflare DNS → tunnel → Coolify Traefik → container. Coolify generates the Traefik labels at deploy time; do not hand-write them in compose files.

## Layout

```
apps/
  strapi/        # PLACEHOLDER — generate with: npx create-strapi-app@latest . --quickstart --no-run
  directus/      # working: directus/directus + postgres
  ghost/         # working: ghost + mysql
  pocketbase/    # working: alpine + pinned PocketBase binary
  appwrite/      # PLACEHOLDER — install via Coolify's one-click Appwrite service template
  payloadcms/    # PLACEHOLDER — generate with: npx create-payload-app@latest .
  nextjs-demo/   # PLACEHOLDER — generate with: npx create-next-app@latest .
infra/
  cloudflared/   # tunnel config sample (config.example.yml)
```

## Generating the placeholder apps

Strapi, PayloadCMS, and Next.js are intentionally empty until scaffolded — committing the generators' output here would freeze framework versions and bloat diffs. Run from the repo root:

```powershell
# Strapi (Node 20+)
cd apps/strapi
npx create-strapi-app@latest . --quickstart --no-run

# PayloadCMS (creates a Next.js app with Payload mounted)
cd apps/payloadcms
npx create-payload-app@latest .

# Next.js demo
cd apps/nextjs-demo
npx create-next-app@latest .
```

After generating, add a multi-stage `Dockerfile` (`node:20-alpine` runtime). Coolify can build straight from a Dockerfile resource type — a `docker-compose.yml` is only needed when the app has sidecars (e.g. its own Postgres).

Appwrite is **not** scaffolded as a compose file in this repo. Use Coolify → **+ New Resource → Service → Appwrite**. Their upstream compose ships its own Traefik that conflicts with Coolify's; the service template is the maintained path.

## Deploying changes

Coolify watches the connected git remote. Push to `main` and Coolify rebuilds the affected resources. There is no CI in this repo — Coolify's build logs are the canary.

To trigger a deploy without pushing: Coolify panel → resource → **Redeploy**.

## Environment variables

`.env.example` files in each `apps/<cms>/` document what that resource needs. Real values live in the **Coolify panel** under each resource's "Environment Variables" tab — never commit a populated `.env`. Coolify injects them at deploy time.

Per-CMS secrets that must be set:
- **Strapi**: `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `JWT_SECRET`, `TRANSFER_TOKEN_SALT`, plus DB creds.
- **Directus**: `KEY`, `SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, plus DB creds and `PUBLIC_URL`.
- **Ghost**: SMTP block (`mail__*`), MySQL creds, and `url` (the public URL — Ghost reads this at boot and bakes it into emails/links).
- **PocketBase**: none — admin is created on first visit to `/_/`.
- **Appwrite**: `_APP_OPENSSL_KEY_V1`, SMTP creds, `_APP_DOMAIN` (set in the Coolify service form).
- **PayloadCMS**: `PAYLOAD_SECRET`, `DATABASE_URI`.

## Adding a new CMS

The repo ships a declarative deploy framework under `tools/coolify/` — adding a CMS no longer requires clicking through the Coolify UI. Steps:

1. `mkdir apps/<name>` and put a `docker-compose.yml` (with `expose:` not `ports:`, named volumes, pinned tags) OR a `Dockerfile` if a single-container build is enough. For a Coolify "service template" (e.g. Appwrite), no app dir is needed.
2. Add a block to `tools/coolify/cms.manifest.yml`:
   - `type: dockercompose` | `dockerfile` | `service-template`
   - `fqdn: http://<name>.<domain>` (HTTP — TLS terminates at Cloudflare edge)
   - For compose: `docker_compose_location: /docker-compose.yml` and `docker_compose_domains: { <service>: { domain: http://... } }` (nested shape required by Coolify)
   - For dockerfile: `ports_exposes: "<port>"`
   - For service-template: `template: <key>` and optional `post_create_hook: hooks/<x>.php`
   - `env:` block with values, using `{{secret_pin:LABEL|hex:24}}` for any random secret that must survive reruns
3. In Cloudflare Zero Trust: add a DNS CNAME `<name>` → `<tunnel-uuid>.cfargotunnel.com` and a tunnel public hostname rule routing to `http://10.10.101.20:80`.
4. `git add . && git commit && git push`.
5. Deploy: `.\tools\coolify\deploy.ps1 -Cms <name>` (Windows host). The framework:
   - git-syncs the VM to the latest commit (retry x5 on DNS hiccups)
   - pre-pulls Docker images under retry (for known-heavy templates)
   - upserts the Coolify Application/Service idempotently by `name`
   - applies env vars (delete-then-insert to avoid duplicates)
   - for service-templates: re-parses `docker_compose` against the latest env vars on every run (so env added after first parse actually reach containers)
   - dispatches the right deploy helper (`queue_application_deployment` for apps, `StartService` for services)
   - polls primary container status (services don't write to `application_deployment_queues`)

Rerun safety: secrets generated by `{{secret_pin:...}}` are persisted as `__PIN__<label>` rows on the resource and reused on every subsequent run — so admin sessions, DB encryption keys, and DB role passwords stay intact across redeploys.

## Conventions

- **No `ports:` in compose files.** Use `expose:`. Coolify's Traefik handles ingress.
- **Volumes are named, not bind-mounted.** Coolify backs up named volumes; bind mounts scatter data outside its purview.
- **Pin image tags** (`directus/directus:11`, `ghost:5`, `postgres:16-alpine`). `:latest` breaks reproducibility — Coolify won't notice the upstream change until rebuild.
- **One database container per CMS.** Don't try to share a Postgres across Strapi/Directus/Payload — schema migrations across CMSs are a nightmare and a single CMS's broken migration would freeze the others.
- **HTTP only inside compose.** TLS is at Cloudflare's edge.

## Common operations

```powershell
# Validate a compose file's syntax locally (requires Docker)
docker compose -f apps/<cms>/docker-compose.yml config

# Boot a single CMS locally for smoke test
Copy-Item apps/<cms>/.env.example apps/<cms>/.env
# edit apps/<cms>/.env with real values, then:
docker compose -f apps/<cms>/docker-compose.yml up -d
docker compose -f apps/<cms>/docker-compose.yml logs -f

# Tear down + nuke volumes
docker compose -f apps/<cms>/docker-compose.yml down -v
```

There is no test suite — the "test" is "Coolify deploys it green and the public URL responds 200".
