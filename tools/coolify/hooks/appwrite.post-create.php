<?php

declare(strict_types=1);

/**
 * Appwrite post-create hook.
 *
 * Runs once per `deploy.ps1 appwrite` after EnvSync has filled the env block. Its job
 * is to add the env vars that aren't part of the official template (because nobody
 * deploys Appwrite behind a Cloudflare Tunnel by default) but that we always want for
 * our setup. EnvSync keeps these idempotent.
 *
 * Contract: this file gets included from deployer.php with two locals in scope:
 *   - $resource:  App\Models\Service
 *   - $envSync:   EnvSync (already configured for this resource)
 */

/** @var App\Models\Service $resource */
/** @var EnvSync $envSync */

$envSync->apply([
    // Appwrite emits absolute URLs based on these. Behind Cloudflare Tunnel we serve
    // plain HTTP from origin (TLS terminates at the edge), so disable Appwrite's
    // own HTTPS enforcement to avoid redirect loops.
    '_APP_OPTIONS_FORCE_HTTPS'        => 'disabled',
    '_APP_OPTIONS_ROUTER_PROTECTION'  => 'disabled',
]);
