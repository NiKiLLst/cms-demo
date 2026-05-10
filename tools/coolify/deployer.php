<?php

declare(strict_types=1);

/**
 * Coolify deployer entrypoint — runs INSIDE the `coolify` container via
 *   docker exec coolify php /tmp/cms-deploy/deployer.php <cms_key> [--force]
 *
 * Reads /tmp/cms-deploy/cms.manifest.yml, resolves placeholders against the
 * environment_variables already present for the target resource, upserts the
 * Application/Service via the matching strategy, applies env vars idempotently,
 * runs any post_create_hook, and queues a deploy. Prints a JSON status line on
 * success or a structured error on failure.
 */

use Symfony\Component\Yaml\Yaml;

require_once __DIR__ . '/lib/helpers.php';
require_once __DIR__ . '/lib/PlaceholderResolver.php';
require_once __DIR__ . '/lib/EnvSync.php';
require_once __DIR__ . '/lib/DeployStrategyInterface.php';
require_once __DIR__ . '/lib/strategies/DockerComposeStrategy.php';
require_once __DIR__ . '/lib/strategies/DockerfileStrategy.php';
require_once __DIR__ . '/lib/strategies/ServiceTemplateStrategy.php';

function fail(string $message, int $code = 1): never
{
    fwrite(STDERR, "deployer: ERROR: {$message}\n");
    echo json_encode(['ok' => false, 'error' => $message]) . "\n";
    exit($code);
}

// ----- Args (passed via env vars because we run under `php artisan tinker
// --execute`, which doesn't forward extra CLI args). -----
$cmsKey = getenv('CMS_KEY') ?: ($argv[1] ?? null);
$forceRebuild = (getenv('FORCE') === '1') || in_array('--force', $argv ?? [], true)
    || in_array('--force-rebuild', $argv ?? [], true);
if (!$cmsKey) {
    fail("missing CMS_KEY env var (or first CLI arg)");
}

// ----- Sanity check Laravel bootstrap (we depend on it for Eloquent + Yaml). -----
if (!class_exists(\App\Models\Application::class)) {
    fail("Laravel app not bootstrapped — run me via `php artisan tinker --execute=\"require ...\"` inside the coolify container");
}

// ----- Load manifest -----
$manifestPath = __DIR__ . '/cms.manifest.yml';
if (!is_file($manifestPath)) {
    fail("manifest not found at {$manifestPath}");
}
$manifest = Yaml::parseFile($manifestPath);
$defaults = $manifest['defaults'] ?? [];
$cmss = $manifest['cmss'] ?? [];
if (!isset($cmss[$cmsKey])) {
    fail("CMS '{$cmsKey}' is not declared in cms.manifest.yml");
}
$descriptor = $cmss[$cmsKey];
$descriptor['display_name'] = "cms-demo:" . ucfirst($cmsKey === 'nextjs-demo' ? 'NextDemo' : (
    $cmsKey === 'payloadcms' ? 'PayloadCMS' : (
    $cmsKey === 'pocketbase' ? 'PocketBase' : (
    $cmsKey === 'appwrite' ? 'Appwrite' : ucfirst($cmsKey)
))));

// ----- Pick strategy -----
$strategy = match ($descriptor['type']) {
    'dockercompose'    => new DockerComposeStrategy(),
    'dockerfile'       => new DockerfileStrategy(),
    'service-template' => new ServiceTemplateStrategy(),
    default => fail("unknown CMS type '{$descriptor['type']}' for {$cmsKey}"),
};

// ----- Upsert resource (find by display_name; create if absent) -----
try {
    $resource = $strategy->upsert($cmsKey, $descriptor, $defaults);
} catch (\Throwable $e) {
    fail("upsert failed: " . $e->getMessage());
}

// ----- Pre-fetch existing secret_pin values for this resource -----
$envSync = new EnvSync($strategy->resourceableType(), $resource->id);
$existingPins = $envSync->loadExistingPins();

// ----- Resolve placeholders against existing pins -----
$resolver = new PlaceholderResolver($existingPins);
try {
    $resolvedEnv = $resolver->resolveAll($descriptor['env'] ?? []);
} catch (\Throwable $e) {
    fail("placeholder resolution failed: " . $e->getMessage());
}

// ----- Apply env vars idempotently + persist any newly-generated pins -----
try {
    $envSync->apply($resolvedEnv);
    $envSync->persistPins($resolver->getNewPins());
} catch (\Throwable $e) {
    fail("env sync failed: " . $e->getMessage());
}

// ----- Post-create hook (e.g. Appwrite tunnel-mode tweaks) -----
if (!empty($descriptor['post_create_hook'])) {
    $hookPath = __DIR__ . '/' . ltrim($descriptor['post_create_hook'], '/');
    if (!is_file($hookPath)) {
        fail("post_create_hook not found: {$hookPath}");
    }
    require $hookPath;
}

// ----- Trigger deploy -----
try {
    $deploymentUuid = $strategy->deploy($resource, $forceRebuild);
} catch (\Throwable $e) {
    fail("deploy queue failed: " . $e->getMessage());
}

echo json_encode([
    'ok'              => true,
    'cms'             => $cmsKey,
    'resource_type'   => get_class($resource),
    'resource_id'     => $resource->id,
    'resource_uuid'   => $resource->uuid,
    'resource_name'   => $resource->name ?? null,
    'fqdn'            => $descriptor['fqdn'] ?? null,
    'deployment_uuid' => $deploymentUuid,
    'deploy_table'    => $strategy->deploymentTable(),
    'new_pins'        => array_keys($resolver->getNewPins()),
]) . "\n";
