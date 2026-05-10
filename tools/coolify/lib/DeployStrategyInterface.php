<?php

declare(strict_types=1);

interface DeployStrategyInterface
{
    /**
     * Idempotent upsert: find or create the Coolify resource for this CMS, fill its
     * configuration columns from the descriptor, and return the saved Eloquent model.
     *
     * @param string $cmsKey      Manifest key, e.g. "directus".
     * @param array  $descriptor  Resolved descriptor block from the manifest, augmented
     *                            with display_name (e.g. "cms-demo:Directus").
     * @param array  $defaults    The manifest's `defaults` block.
     * @return object             Application or Service model.
     */
    public function upsert(string $cmsKey, array $descriptor, array $defaults): object;

    /**
     * Trigger a deploy of the given resource and return the deployment_uuid.
     */
    public function deploy(object $resource, bool $forceRebuild): string;

    /**
     * The Postgres table to poll for deployment status.
     */
    public function deploymentTable(): string;

    /**
     * The Eloquent model class string used in environment_variables.resourceable_type.
     */
    public function resourceableType(): string;
}
