<?php

declare(strict_types=1);

/**
 * Generate a deterministic UUID v5-style identifier from a display name. Used as the
 * `uuid` for newly-created Coolify Applications / Services so reruns reliably target
 * the same row.
 */
function stableUuid(string $name): string
{
    $hash = sha1("cms-demo-stable:{$name}");
    return sprintf(
        '%s-%s-%s-%s-%s',
        substr($hash, 0, 8),
        substr($hash, 8, 4),
        substr($hash, 12, 4),
        substr($hash, 16, 4),
        substr($hash, 20, 12),
    );
}

/**
 * Coolify's Application model exposes `additional_servers_count` and
 * `additional_networks_count` as appended (computed) attributes, but they have no
 * matching DB columns. Eloquent will try to INSERT them and crash with "column does
 * not exist". Stripping them off before save is the cheapest fix.
 */
function stripAppendedAttributes(object $model): object
{
    $appended = ['additional_servers_count', 'additional_networks_count'];
    $attrs = $model->getAttributes();
    $changed = false;
    foreach ($appended as $a) {
        if (array_key_exists($a, $attrs)) {
            unset($attrs[$a]);
            $changed = true;
        }
    }
    if ($changed) {
        $model->setRawAttributes($attrs, $model->exists);
    }
    return $model;
}

/**
 * Coolify schema: applications.manual_webhook_secret_{github,gitlab,bitbucket,gitea}
 * are NOT NULL. Generate them lazily so a brand-new Application save doesn't blow up
 * on the constraint, and so reruns don't churn them (which would invalidate any
 * configured webhook).
 */
function ensureWebhookSecrets(object $app): void
{
    foreach (['github', 'gitlab', 'bitbucket', 'gitea'] as $provider) {
        $col = "manual_webhook_secret_{$provider}";
        if (empty($app->{$col})) {
            $app->{$col} = base64_encode(random_bytes(32));
        }
    }
}
