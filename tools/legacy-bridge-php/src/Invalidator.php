<?php

declare(strict_types=1);

namespace Lendsphera\LegacyBridge;

final class Invalidator
{
    public function __construct(
        private readonly Cache $cache,
        private readonly string $secret,
        private readonly string $logPath = '/var/log/lendsphera-bridge.log'
    ) {}

    public function handle(): void
    {
        $landingId = (string) ($_GET['landingId'] ?? '');
        $sig = (string) ($_GET['sig'] ?? '');

        if ($landingId === '' || $sig === '') {
            $this->respond(400, ['ok' => false, 'error' => 'landingId and sig are required']);
            return;
        }

        $expected = hash_hmac('sha256', $landingId, $this->secret);
        if (!hash_equals($expected, $sig)) {
            $this->respond(401, ['ok' => false, 'error' => 'invalid signature']);
            return;
        }

        $deleted = $this->cache->delete('landing:' . $landingId);
        @error_log('[lendsphera-bridge] invalidate landing=' . $landingId . ' deleted=' . ($deleted ? '1' : '0') . PHP_EOL, 3, $this->logPath);

        $this->respond(200, ['ok' => true, 'landingId' => $landingId, 'deleted' => $deleted]);
    }

    private function respond(int $code, array $payload): void
    {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode($payload);
    }
}
