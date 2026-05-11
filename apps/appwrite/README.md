# Appwrite — cms-demo

Appwrite is deployed via Coolify's service template (see `tools/coolify/cms.manifest.yml`).
Unlike the other CMSs in this repo, the schema (collections, attributes, indexes,
permissions) is **not** auto-applied on first boot — Appwrite has no migration
runner inside the container. The declarative schema lives in `appwrite.json` and
must be pushed once after the instance is up.

## First-time setup

1. Deploy the Coolify resource:
   ```powershell
   .\tools\coolify\deploy.ps1 -Cms appwrite
   ```
2. Open `https://appwrite.nerdass.org/console` and complete the setup wizard
   (admin account + first project). When asked for the **Project ID**, enter
   exactly `cms-demo` so it matches `appwrite.json` and the frontend env.
3. Locally on your dev box, install the Appwrite CLI once:
   ```bash
   npm install -g appwrite-cli
   appwrite login          # endpoint: https://appwrite.nerdass.org/v1
   ```
4. From this directory, push the schema:
   ```bash
   cd apps/appwrite
   appwrite push collection
   ```
   This creates the `main` database plus `blog_post`, `portfolio_item`, and
   `booking` collections with their attributes, indexes, and permissions.
5. Verify the schema in the Appwrite Console under Databases → main.

## On subsequent edits to appwrite.json

After editing `appwrite.json`, rerun `appwrite push collection` from this dir.
It's idempotent for additive changes; destructive changes (renaming attributes,
removing collections) may require manual intervention in the Console.

## Why not automate this?

Appwrite's server requires an authenticated session per project for schema
operations, and the project itself is created via the Console wizard on first
visit. Bootstrapping both project creation **and** schema push from the Coolify
deployer is doable (via Appwrite's setup API + Server SDK) but fragile compared
to the documented two-step flow. We accept the manual step as the trade-off for
not maintaining a custom provisioning script.

## Public permissions summary

- `blog_post`, `portfolio_item`: `read("any")` — anyone can list/view.
- `booking`: `create("any")` — anyone can submit a booking. No read/update/delete
  to anonymous users; the admin reads them from the Console.
