<?php

declare(strict_types=1);

use App\Models\EnvironmentVariable;
use Illuminate\Support\Str;

/**
 * Idempotent environment_variables upsert for a Coolify resource (Application or Service).
 *
 * - For each (key => value) in the desired set: if a row exists for the same
 *   (resourceable_type, resourceable_id, key) and its decrypted value already matches,
 *   nothing happens. Otherwise the value is updated (Eloquent `encrypted` cast handles
 *   re-encryption transparently).
 * - Brand-new keys are inserted with is_runtime=true, is_buildtime=true,
 *   is_shared=false, is_preview=false.
 * - Internal "secret pin" rows are stored with key prefix `__PIN__` and is_runtime=false,
 *   is_buildtime=false so they never reach the deployed container; they exist only as
 *   our persistence layer for {{secret_pin:LABEL}} placeholders across reruns.
 */
final class EnvSync
{
    public const PIN_KEY_PREFIX = '__PIN__';

    public function __construct(
        private string $resourceableType,
        private int $resourceableId,
    ) {
    }

    /**
     * @param array<string,string> $env Resolved env (no placeholders left).
     */
    public function apply(array $env): void
    {
        foreach ($env as $key => $value) {
            $this->upsertOne($key, (string) $value, isPin: false);
        }
    }

    /**
     * Persist any newly-generated secret_pin labels so future reruns reuse them.
     * @param array<string,string> $newPins LABEL => plain value
     */
    public function persistPins(array $newPins): void
    {
        foreach ($newPins as $label => $value) {
            $this->upsertOne(self::PIN_KEY_PREFIX . $label, $value, isPin: true);
        }
    }

    /**
     * Read back all existing secret_pin values for this resource.
     * @return array<string,string> LABEL => plain value
     */
    public function loadExistingPins(): array
    {
        $rows = EnvironmentVariable::query()
            ->where('resourceable_type', $this->resourceableType)
            ->where('resourceable_id', $this->resourceableId)
            ->where('key', 'like', self::PIN_KEY_PREFIX . '%')
            ->get(['key', 'value']);

        $out = [];
        foreach ($rows as $row) {
            $label = substr($row->key, strlen(self::PIN_KEY_PREFIX));
            $out[$label] = $row->value;          // Eloquent cast decrypts.
        }
        return $out;
    }

    /**
     * Read back every env var (excluding __PIN__ rows) for this resource. Used by
     * the resolver as an adoption fallback so a CMS that was deployed before the
     * framework existed can have its current secrets adopted into pins on first
     * framework run, instead of being rotated.
     *
     * @return array<string,string> KEY => plain value
     */
    public function loadExistingEnv(): array
    {
        $rows = EnvironmentVariable::query()
            ->where('resourceable_type', $this->resourceableType)
            ->where('resourceable_id', $this->resourceableId)
            ->where('key', 'not like', self::PIN_KEY_PREFIX . '%')
            ->get(['key', 'value']);

        $out = [];
        foreach ($rows as $row) {
            // Skip empty values — service-template parsing inserts NULL rows for
            // every compose interpolation placeholder, and we don't want to adopt
            // "" as a secret.
            if ($row->value === null || $row->value === '') {
                continue;
            }
            $out[$row->key] = $row->value;
        }
        return $out;
    }

    private function upsertOne(string $key, string $value, bool $isPin): void
    {
        // Delete-then-insert under a transaction. Eloquent's "find existing then
        // update or create" pattern was creating duplicate rows in some cases
        // (Coolify model observer or boot hook somewhere — couldn't pin it down),
        // and there's no UNIQUE constraint on (resourceable_type, resourceable_id,
        // key) to lean on. Hard delete first and we sleep at night.
        \Illuminate\Support\Facades\DB::transaction(function () use ($key, $value, $isPin) {
            EnvironmentVariable::query()
                ->where('resourceable_type', $this->resourceableType)
                ->where('resourceable_id', $this->resourceableId)
                ->where('key', $key)
                ->delete();

            EnvironmentVariable::query()->create([
                'resourceable_type' => $this->resourceableType,
                'resourceable_id'   => $this->resourceableId,
                'key'               => $key,
                'value'             => $value,
                'uuid'              => (string) Str::uuid(),
                'is_runtime'        => !$isPin,
                'is_buildtime'      => !$isPin,
                'is_shared'         => false,
                'is_preview'        => false,
                'is_shown_once'     => false,
                'is_multiline'      => false,
                'is_literal'        => false,
                'is_required'       => false,
            ]);
        });
    }
}
