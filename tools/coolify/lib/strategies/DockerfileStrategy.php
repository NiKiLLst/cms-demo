<?php

declare(strict_types=1);

use App\Models\Application;
use App\Models\GithubApp;
use App\Models\StandaloneDocker;
use Illuminate\Support\Str;

/**
 * Strategy: deploy a CMS as a Coolify "Dockerfile" Application — Coolify builds the
 * image from the repo's Dockerfile and runs a single container exposing the declared
 * port. No compose file is consulted.
 */
final class DockerfileStrategy implements DeployStrategyInterface
{
    public function upsert(string $cmsKey, array $descriptor, array $defaults): object
    {
        $displayName = $descriptor['display_name'];
        $baseDir = $descriptor['base_directory_override']
            ?? rtrim($defaults['base_directory_prefix'], '/') . "/{$cmsKey}";

        /** @var Application $app */
        $app = Application::query()->firstOrNew(['name' => $displayName]);

        if (!$app->exists) {
            $app->uuid = stableUuid($displayName);
            $app->status = 'exited';
        }

        $app->fill([
            'description'             => $descriptor['display_name'],
            'environment_id'          => 1,
            'destination_type'        => StandaloneDocker::class,
            'destination_id'          => $defaults['destination_id'],
            'source_type'             => GithubApp::class,
            'source_id'               => $defaults['github_app_id'],
            'git_repository'          => $defaults['git_repository'],
            'git_branch'              => $defaults['branch'],
            'git_commit_sha'          => 'HEAD',
            'build_pack'              => 'dockerfile',
            'base_directory'          => $baseDir,
            'dockerfile_location'     => $descriptor['dockerfile_location'] ?? '/Dockerfile',
            'ports_exposes'           => (string) $descriptor['ports_exposes'],
            'fqdn'                    => $descriptor['fqdn'],
            // Compose-strategy fields cleaned, defensive against type switch.
            'docker_compose_location' => null,
            'docker_compose'          => null,
            'docker_compose_raw'      => null,
            'docker_compose_domains'  => null,
            'config_hash'             => null,
        ]);

        ensureWebhookSecrets($app);
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
}
