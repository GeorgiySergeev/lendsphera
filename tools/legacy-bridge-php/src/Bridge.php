<?php

declare(strict_types=1);

namespace Lendsphera\LegacyBridge;

use Throwable;

final class Bridge
{
    private const PHP_ALIAS_MAP = [
        'PRODUCT_NAME' => 'LS_PRODUCT_NAME',
        'PRODUCT_PRICE' => 'LS_PRICE',
        'PRODUCT_OLD_PRICE' => 'LS_OLD_PRICE',
        'PRODUCT_IMAGE_PATH' => 'LS_PRODUCT_IMAGE',
        'CURRENCY' => 'LS_CURRENCY',
        'DISCOUNT' => 'LS_DISCOUNT',
        'CTA' => 'LS_CTA',
        'DISCLAIMER' => 'LS_DISCLAIMER',
        'PIXEL_ID' => 'LS_PIXEL_ID',
        'POSTBACK_URL' => 'LS_POSTBACK_URL',
    ];

    public function __construct(
        private readonly Client $client,
        private readonly Cache $cache,
        private readonly string $landingId,
        private readonly array $legacyMap,
        private readonly int $fallbackTtl,
        private readonly string $logPath = '/var/log/lendsphera-bridge.log'
    ) {}

    public function resolveVars(): array
    {
        $cacheKey = 'landing:' . $this->landingId;
        $cached = $this->cache->get($cacheKey) ?? [];
        $etag = is_string($cached['etag'] ?? null) ? $cached['etag'] : null;
        $vars = is_array($cached['vars'] ?? null) ? $cached['vars'] : [];

        try {
            $fresh = $this->client->fetchRuntimeVars($this->landingId, $etag);
            if (($fresh['status'] ?? 0) === 200) {
                $vars = is_array($fresh['vars'] ?? null) ? $fresh['vars'] : $vars;
                $this->cache->set($cacheKey, ['etag' => $fresh['etag'] ?? $etag, 'vars' => $vars], $this->fallbackTtl);
            }
        } catch (Throwable $e) {
            @error_log('[lendsphera-bridge] ' . $e->getMessage() . PHP_EOL, 3, $this->logPath);
        }

        return $vars;
    }

    public function buildRewriter(): Rewriter
    {
        return new Rewriter($this->resolveVars(), $this->legacyMap);
    }

    public function resolveRuntimeContext(): array
    {
        $vars = $this->resolveVars();

        return [
            'vars' => $vars,
            'phpVars' => $this->buildPhpCompatVars($vars),
        ];
    }

    public function buildPhpCompatVars(array $vars): array
    {
        $normalizedVars = [];
        foreach ($vars as $key => $value) {
            if (!is_scalar($value)) {
                continue;
            }

            $normalizedKey = strtoupper((string) $key);
            if (!$this->isValidPhpVariableName($normalizedKey)) {
                continue;
            }

            $normalizedVars[$normalizedKey] = (string) $value;
        }

        $phpVars = ['LS_RUNTIME_VARS' => $normalizedVars];

        foreach ($normalizedVars as $key => $value) {
            $phpVars[$key] = $value;
        }

        foreach (self::PHP_ALIAS_MAP as $alias => $runtimeKey) {
            $phpVars[$alias] = $normalizedVars[$runtimeKey] ?? '';
        }

        return $phpVars;
    }

    private function isValidPhpVariableName(string $name): bool
    {
        return preg_match('/^[A-Z_][A-Z0-9_]*$/', $name) === 1;
    }
}
