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
sudo docker exec coolify rm -rf /tmp/cms-deploy
sudo docker exec coolify mkdir -p /tmp/cms-deploy
sudo docker cp "$HERE/." coolify:/tmp/cms-deploy/

# ---------- Run deployer ----------
echo "[deploy.sh] running deployer for $CMS_KEY ..." >&2
RESULT_JSON="$(sudo docker exec coolify php /tmp/cms-deploy/deployer.php "$CMS_KEY" $FORCE)"
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

# ---------- Poll deployment status ----------
# Service deployments don't write to application_deployment_queues; in that case we
# skip polling and just rely on the post-deploy curl.
if [ "$DEPLOY_TABLE" = "application_deployment_queues" ] && [ -n "$DEPLOY_UUID" ]; then
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
