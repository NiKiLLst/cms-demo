<?php

declare(strict_types=1);

/**
 * Resolve {{...}} and ${VAR} placeholders in a manifest env block.
 *
 * Pass 1: scan every value for {{placeholder}} tokens and substitute.
 *   {{uuid}}                       — fresh UUIDv4
 *   {{random_b64:N}}               — N random bytes, base64
 *   {{random_hex:N}}               — N random bytes, hex
 *   {{secret_pin:LABEL}}           — random base64 24 bytes; persistent (see below)
 *   {{secret_pin:LABEL|hex:N}}     — same, custom generator
 *   {{secret_pin:LABEL|b64:N}}
 *   {{secret_pin:LABEL|uuid}}
 *
 * Persistence of secret_pin:
 *   The resolver receives a map $existingPins (LABEL => plain value) pre-fetched from
 *   the Coolify environment_variables table for the current resource. If a label is
 *   in that map, its value is reused — meaning rerunning a deploy does NOT rotate the
 *   secret (so admin sessions / DB encryption keys stay intact). Newly-generated pins
 *   are exposed via getNewPins() so the deployer can persist them in their own
 *   environment_variables row before exiting.
 *
 * Pass 2: scan every (now placeholder-free) value for ${KEY} references and
 * substitute with the resolved value of that env key in the same CMS block. This lets
 * compose envs like
 *   DATABASE_URI: "postgres://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_DATABASE}"
 * compose cleanly without manual interpolation.
 */
final class PlaceholderResolver
{
    /** @var array<string,string> LABEL => plain value (pre-existing) */
    private array $existingPins;

    /** @var array<string,string> LABEL => plain value (newly generated this run) */
    private array $newPins = [];

    /** @param array<string,string> $existingPins */
    public function __construct(array $existingPins)
    {
        $this->existingPins = $existingPins;
    }

    /**
     * @param array<string,string> $env raw env block from manifest
     * @return array<string,string> resolved env (placeholders + ${VAR} expanded)
     */
    public function resolveAll(array $env): array
    {
        // Pass 1 — placeholders.
        $stage1 = [];
        foreach ($env as $key => $value) {
            $stage1[$key] = $this->expandPlaceholders((string) $value);
        }

        // Pass 2 — ${VAR} cross-references.
        $resolved = [];
        foreach ($stage1 as $key => $value) {
            $resolved[$key] = $this->expandRefs($value, $stage1);
        }

        return $resolved;
    }

    /** @return array<string,string> labels (pin name) => plain value */
    public function getNewPins(): array
    {
        return $this->newPins;
    }

    private function expandPlaceholders(string $value): string
    {
        return preg_replace_callback(
            '/\{\{([^}]+)\}\}/',
            fn(array $m): string => $this->evaluate(trim($m[1])),
            $value,
        );
    }

    private function expandRefs(string $value, array $context): string
    {
        return preg_replace_callback(
            '/\$\{([A-Z0-9_]+)\}/i',
            function (array $m) use ($context): string {
                $key = $m[1];
                if (!array_key_exists($key, $context)) {
                    throw new \RuntimeException("Reference \${{$key}} has no matching env var in this CMS block");
                }
                return $context[$key];
            },
            $value,
        );
    }

    private function evaluate(string $expr): string
    {
        $parts = explode('|', $expr);
        $head = trim($parts[0]);
        $rest = array_map('trim', array_slice($parts, 1));

        if ($head === 'uuid') {
            return $this->genUuid();
        }
        if (preg_match('/^random_b64:(\d+)$/', $head, $m)) {
            return base64_encode(random_bytes((int) $m[1]));
        }
        if (preg_match('/^random_hex:(\d+)$/', $head, $m)) {
            return bin2hex(random_bytes((int) $m[1]));
        }
        if (preg_match('/^secret_pin:(.+)$/', $head, $m)) {
            $label = $m[1];
            // Reuse existing pin if available.
            if (array_key_exists($label, $this->existingPins)) {
                return $this->existingPins[$label];
            }
            // Otherwise generate per spec.
            $spec = $rest[0] ?? 'b64:24';
            $value = $this->generateBySpec($spec);
            $this->newPins[$label] = $value;
            return $value;
        }
        throw new \RuntimeException("Unknown placeholder: {{$expr}}");
    }

    private function generateBySpec(string $spec): string
    {
        if ($spec === 'uuid') {
            return $this->genUuid();
        }
        if (preg_match('/^hex:(\d+)$/', $spec, $m)) {
            return bin2hex(random_bytes((int) $m[1]));
        }
        if (preg_match('/^b64:(\d+)$/', $spec, $m)) {
            return base64_encode(random_bytes((int) $m[1]));
        }
        throw new \RuntimeException("Unknown secret_pin generator spec: {$spec}");
    }

    private function genUuid(): string
    {
        // Don't depend on Laravel Str::uuid() so this class stays portable.
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
        return vsprintf('%s-%s-%s-%s-%s', str_split(bin2hex($data), 4));
    }
}
