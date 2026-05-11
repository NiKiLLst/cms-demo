<?php

declare(strict_types=1);

use App\Models\Application;
use App\Models\GithubApp;
use App\Models\StandaloneDocker;
use Illuminate\Support\Str;

/**
 * Strategy: deploy a CMS as a Coolify "Docker Compose" Application that watches a
 * subdirectory of NiKiLLst/cms-demo for its compose file.
 *
 * Lookup is by `name` (e.g. "cms-demo:Directus") so this strategy upserts in place on
 * the 5 already-deployed CMSs (Directus, Ghost, PocketBase, etc.) without orphaning
 * their existing UUIDs / deploy history. New CMSs get a fresh stable UUID.
 */
final class DockerComposeStrategy implements DeployStrategyInterface
{
    public function upsert(string $cmsKey, array $descriptor, array $defaults): object
    {
        $displayName = $descriptor['display_name'];        // e.g. "cms-demo:Directus"
        $baseDir = $descriptor['base_directory_override']
            ?? rtrim($defaults['base_directory_prefix'], '/') . "/{$cmsKey}";

        /** @var Application $app */
        $app = Application::query()->firstOrNew(['name' => $displayName]);

        if (!$app->exists) {
            $app->uuid = stableUuid($displayName);
            $app->status = 'exited';
        }

        $app->fill([
            'description'              => $descriptor['display_name'],
            'environment_id'           => 1,
            'destination_type'         => StandaloneDocker::class,
            'destination_id'           => $defaults['destination_id'],
            'source_type'              => GithubApp::class,
            'source_id'                => $defaults['github_app_id'],
            'git_repository'           => $defaults['git_repository'],
            'git_branch'               => $defaults['branch'],
            'git_commit_sha'           => 'HEAD',
            'build_pack'               => 'dockercompose',
            'base_directory'           => $baseDir,
            'docker_compose_location'  => $descriptor['docker_compose_location'],
            // Coolify stores docker_compose_domains as a JSON string (no Eloquent
            // cast on the column). The manifest may declare either flat or nested
            // shape; normalize to nested then encode ourselves with full quoting.
            'docker_compose_domains'   => json_encode(
                self::wrapDomains($descriptor['docker_compose_domains']),
                JSON_UNESCAPED_SLASHES,
            ),
            'fqdn'                     => $descriptor['fqdn'],
            // ports_exposes is NOT NULL on applications; Coolify ignores it for
            // dockercompose at runtime (it parses the compose's expose: blocks
            // instead) but the column still needs a value at insert time.
            'ports_exposes'            => (string) ($descriptor['ports_exposes'] ?? '3000'),
            // Force Coolify to reparse the compose on next deploy so any changes in
            // the .yml on the repo (newly added env, new ports, etc.) are picked up.
            'docker_compose'           => null,
            'docker_compose_raw'       => null,
            'config_hash'              => null,
            // Defensive: dockerfile-strategy fields cleaned, in case the resource is
            // being switched from dockerfile -> dockercompose.
            'dockerfile'               => null,
            'dockerfile_location'      => '/Dockerfile',
        ]);

        ensureWebhookSecrets($app);

        // Strip appended attributes that aren't real columns before save (Eloquent
        // would otherwise INSERT them and fail with "column does not exist").
        $app = stripAppendedAttributes($app);
        $app->save();

        return $app;
    }

    public function deploy(object $resource, bool $forceRebuild): string
    {
        $deploymentUuid = (string) Str::uuid();
        $result = queue_application_deployment(
            application: $resource,
            deployment_uuid: $deploymentUuid,
            force_rebuild: $forceRebuild,
            no_questions_asked: true,
        );
        if (($result['status'] ?? null) !== 'queued') {
            throw new \RuntimeException(
                "queue_application_deployment did not queue for {$resource->name}: " . json_encode($result)
            );
        }
        return $deploymentUuid;
    }

    public function deploymentTable(): string
    {
        return 'application_deployment_queues';
    }

    public function resourceableType(): string
    {
        return Application::class;
    }

    /**
     * Lift a flat {service: domain-string} map into Coolify's expected
     * {service: {domain: domain-string}} shape, while leaving values that are
     * already correctly shaped untouched.
     *
     * @param array<string,mixed> $domains
     * @return array<string,array{domain:string}>
     */
    private static function wrapDomains(array $domains): array
    {
        $out = [];
        foreach ($domains as $service => $value) {
            if (is_array($value) && isset($value['domain'])) {
                $out[$service] = $value;
            } else {
                $out[$service] = ['domain' => (string) $value];
            }
        }
        return $out;
    }
}
