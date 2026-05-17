<?php

declare(strict_types=1);

namespace Lendsphera\LegacyBridge;

use Throwable;

final class Bridge
{
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
}
