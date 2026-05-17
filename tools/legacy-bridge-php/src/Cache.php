<?php

declare(strict_types=1);

namespace Lendsphera\LegacyBridge;

final class Cache
{
    private bool $apcuEnabled;

    public function __construct(
        private readonly string $namespace = 'ls_bridge',
        private readonly string $fileDir = '/tmp/ls-cache'
    ) {
        $this->apcuEnabled = function_exists('apcu_enabled') && apcu_enabled() && function_exists('apcu_fetch');
    }

    public function get(string $key): ?array
    {
        $fullKey = $this->fullKey($key);
        $now = time();

        if ($this->apcuEnabled) {
            $hit = false;
            $payload = apcu_fetch($fullKey, $hit);
            if ($hit && is_array($payload) && ($payload['expires_at'] ?? 0) > $now) {
                return $payload['data'] ?? null;
            }
        }

        $path = $this->filePath($fullKey);
        if (!is_file($path)) {
            return null;
        }

        $raw = @file_get_contents($path);
        if ($raw === false) {
            return null;
        }

        $payload = json_decode($raw, true);
        if (!is_array($payload) || ($payload['expires_at'] ?? 0) <= $now || !array_key_exists('data', $payload)) {
            return null;
        }

        return is_array($payload['data']) ? $payload['data'] : null;
    }

    public function set(string $key, array $data, int $ttl): void
    {
        $fullKey = $this->fullKey($key);
        $payload = ['expires_at' => time() + max(1, $ttl), 'data' => $data];

        if ($this->apcuEnabled) {
            apcu_store($fullKey, $payload, $ttl);
        }

        if (!is_dir($this->fileDir)) {
            @mkdir($this->fileDir, 0777, true);
        }

        @file_put_contents($this->filePath($fullKey), json_encode($payload));
    }

    public function delete(string $key): bool
    {
        $fullKey = $this->fullKey($key);
        $deleted = false;

        if ($this->apcuEnabled) {
            $deleted = apcu_delete($fullKey) || $deleted;
        }

        $path = $this->filePath($fullKey);
        if (is_file($path)) {
            $deleted = @unlink($path) || $deleted;
        }

        return $deleted;
    }

    private function fullKey(string $key): string
    {
        return $this->namespace . ':' . $key;
    }

    private function filePath(string $fullKey): string
    {
        return rtrim($this->fileDir, '/\\') . DIRECTORY_SEPARATOR . sha1($fullKey) . '.json';
    }
}
