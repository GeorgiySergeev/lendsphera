<?php

declare(strict_types=1);

use Lendsphera\LegacyBridge\Bridge;
use Lendsphera\LegacyBridge\Cache;
use Lendsphera\LegacyBridge\Client;

if (!defined('LS_BRIDGE_BOOTSTRAPPED')) {
    define('LS_BRIDGE_BOOTSTRAPPED', true);

    require_once __DIR__ . '/Cache.php';
    require_once __DIR__ . '/Client.php';
    require_once __DIR__ . '/Rewriter.php';
    require_once __DIR__ . '/Bridge.php';
    require_once __DIR__ . '/Invalidator.php';

    $cfgFile = __DIR__ . '/../config.php';
    $cfg = is_file($cfgFile) ? require $cfgFile : [];

    $apiUrl = (string) (($cfg['LS_API_URL'] ?? getenv('LS_API_URL')) ?: '');
    $bridgeKey = (string) (($cfg['LS_BRIDGE_KEY'] ?? getenv('LS_BRIDGE_KEY')) ?: '');
    $landingId = (string) (($cfg['LS_LANDING_ID'] ?? getenv('LS_LANDING_ID')) ?: '');
    $fallbackTtl = (int) (($cfg['LS_FALLBACK_TTL'] ?? getenv('LS_FALLBACK_TTL')) ?: 3600);
    $placeholderMap = is_array($cfg['LS_PLACEHOLDER_MAP'] ?? null) ? $cfg['LS_PLACEHOLDER_MAP'] : [];
    $hmacSecret = (string) (($cfg['LS_BRIDGE_HMAC_SECRET'] ?? getenv('LS_BRIDGE_HMAC_SECRET')) ?: '');

    $requestPath = parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH);
    if ($requestPath === '/_ls/invalidate' && $hmacSecret !== '') {
        $invalidator = new \Lendsphera\LegacyBridge\Invalidator(
            new Cache('ls_bridge', '/tmp/ls-cache'),
            $hmacSecret
        );
        $invalidator->handle();
        return;
    }

    if ($apiUrl !== '' && $bridgeKey !== '' && $landingId !== '') {
        $bridge = new Bridge(
            new Client($apiUrl, $bridgeKey),
            new Cache('ls_bridge', '/tmp/ls-cache'),
            $landingId,
            $placeholderMap,
            $fallbackTtl
        );

        $rewriter = $bridge->buildRewriter();
        ob_start([$rewriter, 'outputBufferHandler'], 0, PHP_OUTPUT_HANDLER_CLEANABLE | PHP_OUTPUT_HANDLER_FLUSHABLE | PHP_OUTPUT_HANDLER_REMOVABLE);
    }
}
