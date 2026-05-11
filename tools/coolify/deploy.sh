#!/usr/bin/env bash
# tools/coolify/deploy.sh — runs ON the Coolify VM (debian@10.10.101.20).
#
# Invoked from deploy.ps1 after the entire tools/coolify directory has been streamed
# into /tmp/cms-deploy. Mirrors the framework into the coolify container and runs the
# PHP deployer. Optionally polls deployment status via psql.
#
# Usage:
#   bash deploy.sh <cms_key> [--force] [--no-poll]

set -euo pipefail

CMS_KEY=""
FORCE=""
DO_POLL=1
for arg in "$@"; do
    case "$arg" in
        --force|--force-rebuild) FORCE="--force" ;;
        --no-poll)               DO_POLL=0 ;;
        -*)                      echo "unknown flag: $arg" >&2; exit 2 ;;
        *)                       CMS_KEY="$arg" ;;
    esac
done
[ -n "$CMS_KEY" ] || { echo "usage: bash deploy.sh <cms_key> [--force] [--no-poll]" >&2; exit 2; }

HERE="$(cd "$(dirname "$0")" && pwd)"

# ---------- Mirror tools/ into coolify container ----------
# The coolify container runs as UID 9999, so docker exec without -u 0 can't remove
# files dropped by docker cp (root-owned). Run cleanup as root.
sudo docker exec -u 0 coolify rm -rf /tmp/cms-deploy
sudo docker exec -u 0 coolify mkdir -p /tmp/cms-deploy
sudo docker cp "$HERE/." coolify:/tmp/cms-deploy/
# Make the dropped files readable by the coolify user (which runs the deployer).
sudo docker exec -u 0 coolify chmod -R a+rX /tmp/cms-deploy

# PHP OPcache caches the framework files on first load — when we update them and
# rerun, the old bytecode is reused unless we invalidate. Reset before each run.
sudo docker exec coolify php -r "if (function_exists('opcache_reset')) opcache_reset();"

# ---------- Manifest-driven pre-pull for known heavy templates ----------
# The VM's only resolver (10.10.101.2) sometimes drops a DNS reply mid-`docker pull`,
# which Coolify surfaces as "Image Pulling Interrupted" and aborts the deploy. Pre-pull
# under a retry loop so by the time the framework dispatches StartService, every image
# is already in the local Docker layer cache.
pre_pull_images() {
    local images=$1
    for img in $images; do
        local pulled=0
        for try in 1 2 3 4 5; do
            if sudo docker pull "$img" >/dev/null 2>&1; then
                echo "[deploy.sh] pull ok for $img" >&2
                pulled=1
                break
            fi
            echo "[deploy.sh] pull retry $try for $img (DNS hiccup?)" >&2
            sleep 5
        done
        if [ "$pulled" = 0 ]; then
            echo "[deploy.sh] WARN: pre-pull of $img exhausted retries; deploy may still recover" >&2
        fi
    done
}
case "$CMS_KEY" in
    appwrite)
        echo "[deploy.sh] pre-pulling Appwrite stack images ..." >&2
        pre_pull_images "mariadb:10.11 redis:7.2.4-alpine appwrite/appwrite:1.5 appwrite/appwrite:1.5.1 appwrite/assistant:0.4.0 openruntimes/executor:0.4.9"
        ;;
esac

# ---------- Run deployer (under tinker so Laravel is bootstrapped) ----------
echo "[deploy.sh] running deployer for $CMS_KEY ..." >&2
FORCE_VAL="0"
[ -n "$FORCE" ] && FORCE_VAL="1"
RESULT_JSON="$(sudo docker exec -e CMS_KEY="$CMS_KEY" -e FORCE="$FORCE_VAL" coolify \
    php artisan tinker --execute="require '/tmp/cms-deploy/deployer.php';")"
# Extract last non-empty line as the JSON payload (tinker may prefix with warnings).
RESULT_JSON="$(echo "$RESULT_JSON" | grep -E '^\{.*\}$' | tail -1)"
echo "$RESULT_JSON"

OK=$(echo "$RESULT_JSON" | python3 -c "import sys,json;print(json.load(sys.stdin).get('ok'))" 2>/dev/null || echo "false")
if [ "$OK" != "True" ] && [ "$OK" != "true" ]; then
    echo "[deploy.sh] deployer reported failure" >&2
    exit 1
fi

if [ "$DO_POLL" = 0 ]; then
    exit 0
fi

DEPLOY_UUID=$(echo "$RESULT_JSON" | python3 -c "import sys,json;print(json.load(sys.stdin).get('deployment_uuid',''))")
DEPLOY_TABLE=$(echo "$RESULT_JSON" | python3 -c "import sys,json;print(json.load(sys.stdin).get('deploy_table',''))")
FQDN=$(echo "$RESULT_JSON" | python3 -c "import sys,json;print(json.load(sys.stdin).get('fqdn',''))")
RESOURCE_UUID=$(echo "$RESULT_JSON" | python3 -c "import sys,json;print(json.load(sys.stdin).get('resource_uuid',''))")
TEMPLATE=$(echo "$RESULT_JSON" | python3 -c "import sys,json;print(json.load(sys.stdin).get('template') or '')")

# ---------- Poll deployment status ----------
# Service deployments DON'T populate application_deployment_queues. Coolify uses Redis
# (Horizon) for service deploy jobs and writes to failed_jobs only on error. So for
# service deploys we poll by primary container status instead. The primary container
# name is "<template>-<resource_uuid>" (e.g. "appwrite-e357ae86-...").
if [ -n "$TEMPLATE" ] && [ -n "$RESOURCE_UUID" ]; then
    echo "[deploy.sh] polling container ${TEMPLATE}-${RESOURCE_UUID} ..." >&2
    UP_FOR=0
    for i in $(seq 1 60); do
        STATUS=$(sudo docker ps --filter "name=^${TEMPLATE}-${RESOURCE_UUID}\$" --format '{{.Status}}' 2>/dev/null | head -1)
        printf "[deploy.sh] poll %02d primary: %s\n" "$i" "${STATUS:-not-running}" >&2
        case "$STATUS" in
            "Up "*)
                UP_FOR=$((UP_FOR + 1))
                # Require 2 consecutive Up readings to confirm not a restart-loop
                [ "$UP_FOR" -ge 2 ] && break
                ;;
            *) UP_FOR=0 ;;
        esac
        sleep 15
    done
elif [ "$DEPLOY_TABLE" = "application_deployment_queues" ] && [ -n "$DEPLOY_UUID" ]; then
    echo "[deploy.sh] polling $DEPLOY_TABLE for $DEPLOY_UUID ..." >&2
    for i in $(seq 1 60); do
        STATUS=$(sudo docker exec coolify-db psql -U coolify -d coolify -tA \
            -c "SELECT status FROM application_deployment_queues WHERE deployment_uuid='${DEPLOY_UUID}';" 2>/dev/null || echo "")
        printf "[deploy.sh] poll %02d: %s\n" "$i" "${STATUS:-?}" >&2
        case "$STATUS" in
            finished)              break ;;
            failed|cancelled-by-user|cancelled)
                echo "[deploy.sh] deployment ${STATUS}" >&2
                sudo docker exec coolify-db psql -U coolify -d coolify -tA \
                    -c "SELECT logs FROM application_deployment_queues WHERE deployment_uuid='${DEPLOY_UUID}';" \
                    | python3 -c "import sys,json
try:
    rows = json.loads(sys.stdin.read().strip() or '[]')
    for r in rows[-30:]:
        if r.get('type')=='stderr' or 'error' in r.get('output','').lower():
            print('  ', r.get('output','').strip()[:280])
except Exception as e:
    print('log parse error:', e, file=sys.stderr)" >&2
                exit 1
                ;;
        esac
        sleep 15
    done
fi

# ---------- HTTP smoke test (best-effort) ----------
if [ -n "$FQDN" ]; then
    echo "[deploy.sh] HTTP smoke test of $FQDN ..." >&2
    HTTPS_FQDN="https://${FQDN#http://}"
    HTTPS_FQDN="${HTTPS_FQDN#https://https://}"
    HTTPS_FQDN="https://${HTTPS_FQDN#https://}"
    CODE=$(curl -sIL --max-redirs 5 -o /dev/null --connect-timeout 10 --max-time 30 -w "%{http_code}" "$HTTPS_FQDN" 2>/dev/null || echo "000")
    echo "[deploy.sh] $HTTPS_FQDN -> $CODE" >&2
fi

echo "[deploy.sh] done." >&2
