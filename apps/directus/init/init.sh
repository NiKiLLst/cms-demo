#!/usr/bin/env bash
# Idempotent bootstrap for the cms-demo Directus instance.
# Creates blog_post, portfolio_item, booking collections and grants public role
# read on blog/portfolio and create on booking. Safe to rerun.

set -euo pipefail

DIRECTUS_URL="${DIRECTUS_URL:-http://directus:8055}"
ADMIN_EMAIL="${ADMIN_EMAIL:?ADMIN_EMAIL must be set}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:?ADMIN_PASSWORD must be set}"

log() { echo "[init] $*"; }

# 1. Wait for Directus to be reachable. Directus returns 200 from /server/health
#    once Postgres is connected and the schema is migrated.
log "Waiting for $DIRECTUS_URL/server/health ..."
for i in $(seq 1 60); do
  if curl -fsS "$DIRECTUS_URL/server/health" >/dev/null 2>&1; then
    log "Directus is healthy."
    break
  fi
  sleep 2
  if [ "$i" = "60" ]; then
    log "Timed out waiting for Directus."
    exit 1
  fi
done

# 2. Authenticate as admin.
log "Logging in as $ADMIN_EMAIL ..."
TOKEN="$(curl -fsS -X POST "$DIRECTUS_URL/auth/login" \
  -H 'content-type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  | jq -r .data.access_token)"
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  log "Auth failed."
  exit 1
fi
AUTH="Authorization: Bearer $TOKEN"

# Helper: returns 0 if a collection with the given name exists.
collection_exists() {
  local name="$1"
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' -H "$AUTH" "$DIRECTUS_URL/collections/$name")"
  [ "$code" = "200" ]
}

# Helper: create a collection from a JSON body (silently no-op if it already exists).
create_collection() {
  local name="$1"; local body="$2"
  if collection_exists "$name"; then
    log "Collection $name already exists — skipping."
    return 0
  fi
  log "Creating collection $name ..."
  curl -fsS -X POST "$DIRECTUS_URL/collections" \
    -H "$AUTH" -H 'content-type: application/json' \
    -d "$body" >/dev/null
}

# 3. blog_post
create_collection blog_post '{
  "collection": "blog_post",
  "meta": { "icon": "article", "singleton": false },
  "schema": { "name": "blog_post" },
  "fields": [
    { "field": "id",           "type": "uuid",     "meta": { "hidden": true, "readonly": true, "interface": "input", "special": ["uuid"] }, "schema": { "is_primary_key": true, "has_auto_increment": false } },
    { "field": "title",        "type": "string",   "meta": { "interface": "input", "required": true }, "schema": { "is_nullable": false } },
    { "field": "slug",         "type": "string",   "meta": { "interface": "input", "required": true }, "schema": { "is_nullable": false, "is_unique": true } },
    { "field": "excerpt",      "type": "text",     "meta": { "interface": "input-multiline" } },
    { "field": "body",         "type": "text",     "meta": { "interface": "input-rich-text-html", "required": true }, "schema": { "is_nullable": false } },
    { "field": "cover_image",  "type": "uuid",     "meta": { "interface": "file-image", "special": ["file"] } },
    { "field": "published_at", "type": "timestamp","meta": { "interface": "datetime" } },
    { "field": "author",       "type": "string",   "meta": { "interface": "input" } }
  ]
}'

# 4. portfolio_item
create_collection portfolio_item '{
  "collection": "portfolio_item",
  "meta": { "icon": "collections_bookmark", "singleton": false },
  "schema": { "name": "portfolio_item" },
  "fields": [
    { "field": "id",           "type": "uuid",   "meta": { "hidden": true, "readonly": true, "interface": "input", "special": ["uuid"] }, "schema": { "is_primary_key": true, "has_auto_increment": false } },
    { "field": "title",        "type": "string", "meta": { "interface": "input", "required": true }, "schema": { "is_nullable": false } },
    { "field": "slug",         "type": "string", "meta": { "interface": "input", "required": true }, "schema": { "is_nullable": false, "is_unique": true } },
    { "field": "description",  "type": "text",   "meta": { "interface": "input-rich-text-html", "required": true }, "schema": { "is_nullable": false } },
    { "field": "images",       "type": "json",   "meta": { "interface": "tags", "options": { "presets": [] } } },
    { "field": "external_url", "type": "string", "meta": { "interface": "input" } },
    { "field": "tags",         "type": "json",   "meta": { "interface": "tags" } }
  ]
}'

# 5. booking
create_collection booking '{
  "collection": "booking",
  "meta": { "icon": "event_available", "singleton": false },
  "schema": { "name": "booking" },
  "fields": [
    { "field": "id",         "type": "uuid",     "meta": { "hidden": true, "readonly": true, "interface": "input", "special": ["uuid"] }, "schema": { "is_primary_key": true, "has_auto_increment": false } },
    { "field": "name",       "type": "string",   "meta": { "interface": "input", "required": true }, "schema": { "is_nullable": false } },
    { "field": "email",      "type": "string",   "meta": { "interface": "input", "required": true }, "schema": { "is_nullable": false } },
    { "field": "datetime",   "type": "timestamp","meta": { "interface": "datetime", "required": true }, "schema": { "is_nullable": false } },
    { "field": "notes",      "type": "text",     "meta": { "interface": "input-multiline" } },
    { "field": "status",     "type": "string",   "meta": { "interface": "select-dropdown", "options": { "choices": [{ "text": "New", "value": "new" }, { "text": "Confirmed", "value": "confirmed" }, { "text": "Cancelled", "value": "cancelled" }] } }, "schema": { "default_value": "new" } },
    { "field": "created_at", "type": "timestamp","meta": { "interface": "datetime", "readonly": true, "special": ["date-created"] } }
  ]
}'

# 6. Public access. Directus 11 attaches permissions to policies, and the
#    Public policy is the one used for unauthenticated requests. Its name is
#    translated client-side, so the server stores either the literal "Public"
#    or a `$t:public_label` key depending on version. We identify it by the
#    invariants instead: not admin, not app-access, no role link.
PUBLIC_POLICY_ID="$(curl -fgsS -H "$AUTH" "$DIRECTUS_URL/policies?filter[admin_access][_eq]=false&filter[app_access][_eq]=false&limit=1" | jq -r '.data[0].id // empty')"
if [ -z "$PUBLIC_POLICY_ID" ]; then
  log "Could not locate the Public policy — listing all policies for diagnosis:"
  curl -fgsS -H "$AUTH" "$DIRECTUS_URL/policies" | jq -r '.data[] | "\(.id) name=\(.name) admin=\(.admin_access) app=\(.app_access)"'
  exit 1
fi
log "Public policy ID: $PUBLIC_POLICY_ID"

# Helper: grant a (collection, action) permission to the public policy if not already.
grant_public() {
  local collection="$1"; local action="$2"
  local exists
  exists="$(curl -fgsS -H "$AUTH" \
    "$DIRECTUS_URL/permissions?filter[policy][_eq]=$PUBLIC_POLICY_ID&filter[collection][_eq]=$collection&filter[action][_eq]=$action&limit=1" \
    | jq -r '.data | length')"
  if [ "$exists" -gt 0 ]; then
    log "Permission ($collection / $action) already granted to public — skipping."
    return 0
  fi
  log "Granting public $action on $collection ..."
  curl -fsS -X POST "$DIRECTUS_URL/permissions" \
    -H "$AUTH" -H 'content-type: application/json' \
    -d "{\"policy\":\"$PUBLIC_POLICY_ID\",\"collection\":\"$collection\",\"action\":\"$action\",\"fields\":[\"*\"]}" >/dev/null
}

grant_public blog_post       read
grant_public portfolio_item  read
grant_public booking         create
# directus_files: needed so the frontend can fetch /assets/<id> for cover images
grant_public directus_files  read

log "Done."
