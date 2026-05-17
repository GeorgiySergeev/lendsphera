<?php

declare(strict_types=1);

namespace Lendsphera\LegacyBridge\Tests;

use Lendsphera\LegacyBridge\Bridge;
use Lendsphera\LegacyBridge\Cache;
use Lendsphera\LegacyBridge\Client;
use Lendsphera\LegacyBridge\Rewriter;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class BridgeTest extends TestCase
{
    private string $cacheDir;

    protected function setUp(): void
    {
        $this->cacheDir = sys_get_temp_dir() . '/ls-bridge-tests-' . uniqid('', true);
        mkdir($this->cacheDir, 0777, true);
    }

    protected function tearDown(): void
    {
        foreach (glob($this->cacheDir . '/*') ?: [] as $file) {
            @unlink($file);
        }
        @rmdir($this->cacheDir);
    }

    public function testCacheHitReturnsStoredPayload(): void
    {
        $cache = new Cache('test', $this->cacheDir);
        $cache->set('k1', ['vars' => ['CITY' => 'Kyiv']], 60);

        $this->assertSame(['vars' => ['CITY' => 'Kyiv']], $cache->get('k1'));
    }

    public function testCacheMissReturnsNull(): void
    {
        $cache = new Cache('test', $this->cacheDir);
        $this->assertNull($cache->get('missing'));
    }

    public function testNetworkFailureFallsBackToLastCache(): void
    {
        $cache = new Cache('test', $this->cacheDir);
        $cache->set('landing:landing-1', ['etag' => 'abc', 'vars' => ['CITY' => 'Dnipro']], 300);

        $client = new Client('https://api.local', 'secret', static function (): array {
            throw new RuntimeException('network down');
        });

        $bridge = new Bridge($client, $cache, 'landing-1', [], 300, $this->cacheDir . '/bridge.log');
        $vars = $bridge->resolveVars();

        $this->assertSame(['CITY' => 'Dnipro'], $vars);
    }

    public function testMalformedJsonFallsBackToLastCache(): void
    {
        $cache = new Cache('test', $this->cacheDir);
        $cache->set('landing:landing-2', ['etag' => 'abc', 'vars' => ['PHONE' => '+380']], 300);

        $client = new Client('https://api.local', 'secret', static function (): array {
            return ['status' => 200, 'headers' => ['etag' => 'def'], 'body' => '{bad-json'];
        });

        $bridge = new Bridge($client, $cache, 'landing-2', [], 300, $this->cacheDir . '/bridge.log');

        $this->assertSame(['PHONE' => '+380'], $bridge->resolveVars());
    }

    public function testPlaceholderAbsenceNoOp(): void
    {
        $rewriter = new Rewriter(['CITY' => 'Kyiv'], []);
        $input = '<html><body>No placeholders here</body></html>';

        $this->assertSame($input, $rewriter->rewrite($input));
    }

    public function testPartialPlaceholderSetOnlyRewritesKnownValues(): void
    {
        $rewriter = new Rewriter(['CITY' => 'Lviv'], ['__CITY__' => '{{LS_CITY}}']);
        $input = 'City {{LS_CITY}} / Phone {{LS_PHONE}} / Legacy __CITY__';

        $this->assertSame('City Lviv / Phone {{LS_PHONE}} / Legacy {{LS_CITY}}', $rewriter->rewrite($input));
    }
}
