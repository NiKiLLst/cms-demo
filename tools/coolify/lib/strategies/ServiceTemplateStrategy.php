<?php

declare(strict_types=1);

use App\Models\Service;
use App\Models\StandaloneDocker;
use Illuminate\Support\Str;

/**
 * Strategy: deploy a Coolify "Service" via one of the upstream service templates
 * (https://cdn.coollabs.io/coolify/service-templates.json). Used for compose-heavy
 * stacks like Appwrite that ship 16+ containers — we don't keep the compose in our
 * repo, we let Coolify pull the canonical template and we only inject the env vars.
 *
 * IMPORTANT: parse() is only called on first creation. On reruns we update fqdn and
 * env vars in place — re-parsing the template would invalidate the ServiceApplication
 * / ServiceDatabase rows Coolify generates from the compose, breaking subsequent
 * deploys.
 */
final class ServiceTemplateStrategy implements DeployStrategyInterface
{
    private const TEMPLATES_URL = 'https://cdn.coollabs.io/coolify/service-templates.json';

    public function upsert(string $cmsKey, array $descriptor, array $defaults): object
    {
        $displayName = $descriptor['display_name'];

        /** @var Service|null $existing */
        $existing = Service::query()->where('name', $displayName)->first();

        if ($existing) {
            // Note: services table has no fqdn column — sub-applications carry it.
            $existing = stripAppendedAttributes($existing);
            $existing->save();
            $this->setFqdnOnPrimarySubApp($existing, $descriptor);

            // CRITICAL: invalidate the cached parsed compose so the next deploy
            // re-parses it against the (now updated) environment_variables.
            // Without this, env vars added/changed after the initial parse never
            // reach the deployed containers (Coolify uses services.docker_compose
            // verbatim and that's frozen to the first parse). parse(isNew:false)
            // preserves the existing service_applications/service_databases IDs.
            $existing->docker_compose = null;
            $existing->config_hash = null;
            $existing->save();
            $existing->parse(isNew: false);

            return $existing;
        }

        // First-time creation: pull template, hydrate, parse.
        $templates = json_decode(file_get_contents(self::TEMPLATES_URL), true);
        $key = $descriptor['template'];
        if (!isset($templates[$key])) {
            throw new \RuntimeException("Service template '{$key}' not found at " . self::TEMPLATES_URL);
        }
        $compose = base64_decode($templates[$key]['compose'], true);
        if ($compose === false) {
            throw new \RuntimeException("Service template '{$key}' compose is not valid base64");
        }

        $svc = new Service();
        $svc->uuid = stableUuid($displayName);
        $svc->name = $displayName;
        $svc->description = $descriptor['display_name'];
        $svc->docker_compose_raw = $compose;
        $svc->environment_id = 1;
        $svc->destination_type = StandaloneDocker::class;
        $svc->destination_id = $defaults['destination_id'];
        $svc->server_id = $defaults['server_id'];
        $svc->service_type = $key;
        $svc = stripAppendedAttributes($svc);
        $svc->save();

        // parse() generates the ServiceApplication / ServiceDatabase rows and the
        // initial environment_variables (most of them empty — we fill them in
        // EnvSync afterwards).
        $svc->parse(isNew: true);

        // Set fqdn on the primary sub-application (e.g. for Appwrite, the
        // `appwrite` ServiceApplication row).
        $this->setFqdnOnPrimarySubApp($svc, $descriptor);

        return $svc;
    }

    /**
     * Coolify stores the public hostname on a ServiceApplication row inside the
     * Service (one row per compose service). The "primary" one is named after the
     * template key (e.g. `appwrite` for the Appwrite stack). Fall back to the
     * first ServiceApplication if the named one is absent.
     */
    private function setFqdnOnPrimarySubApp(Service $svc, array $descriptor): void
    {
        if (empty($descriptor['fqdn']) || !method_exists($svc, 'applications')) {
            return;
        }
        /** @var \Illuminate\Database\Eloquent\Collection $apps */
        $apps = $svc->applications()->get();
        if ($apps->isEmpty()) {
            return;
        }
        $primary = $apps->firstWhere('name', $descriptor['template']) ?? $apps->first();
        if ($primary->fqdn !== $descriptor['fqdn']) {
            $primary->fqdn = $descriptor['fqdn'];
            $primary->save();
        }
    }

    public function deploy(object $resource, bool $forceRebuild): string
    {
        // Re-parse one more time AFTER EnvSync has filled all env vars; this
        // bakes the freshly-applied env values into services.docker_compose so
        // the dispatched container set sees them.
        if ($resource instanceof Service) {
            $resource->docker_compose = null;
            $resource->config_hash = null;
            $resource->save();
            $resource->parse(isNew: false);
        }

        $deploymentUuid = (string) Str::uuid();

        // Coolify renamed the service deployment helper between versions; dispatch
        // dynamically so the deployer keeps working across upgrades.
        $startServiceClass = '\\App\\Actions\\Service\\StartService';
        if (class_exists($startServiceClass)) {
            $startServiceClass::dispatch($resource, $deploymentUuid);
            return $deploymentUuid;
        }
        if (function_exists('queue_service_deployment')) {
            queue_service_deployment($resource);
            return $deploymentUuid;
        }
        throw new \RuntimeException(
            'No service deployment entrypoint found (tried StartService::dispatch and queue_service_deployment)'
        );
    }

    public function deploymentTable(): string
    {
        // Service deploys don't write to application_deployment_queues — the
        // deployer reports the queued state and the user polls via Coolify UI / API
        // by service uuid. We surface the deployment_uuid in the JSON output so the
        // shell wrapper can do health-checks on the FQDN instead.
        return 'service_application_deployment_queues';
    }

    public function resourceableType(): string
    {
        return Service::class;
    }
}
