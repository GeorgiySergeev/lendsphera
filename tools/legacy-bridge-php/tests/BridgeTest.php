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
    private string $fixturePath;

    protected function setUp(): void
    {
        $this->cacheDir = sys_get_temp_dir() . '/ls-bridge-tests-' . uniqid('', true);
        mkdir($this->cacheDir, 0777, true);
        $this->fixturePath = dirname(__DIR__) . '/tests/fixtures/legacy-template.php';
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

    public function testBuildPhpCompatVarsExposesAliasesAndStructuredMap(): void
    {
        $bridge = new Bridge(
            new Client('https://api.local', 'secret', static fn (): array => ['status' => 304]),
            new Cache('test', $this->cacheDir),
            'landing-3',
            [],
            300,
            $this->cacheDir . '/bridge.log'
        );

        $phpVars = $bridge->buildPhpCompatVars([
            'LS_PRODUCT_NAME' => 'ProstaFix',
            'ls_price' => '49.99',
            'LS_CURRENCY' => 'EUR',
            'nested' => ['ignored'],
        ]);

        $this->assertSame('ProstaFix', $phpVars['PRODUCT_NAME']);
        $this->assertSame('49.99', $phpVars['PRODUCT_PRICE']);
        $this->assertSame('EUR', $phpVars['CURRENCY']);
        $this->assertSame('', $phpVars['PRODUCT_OLD_PRICE']);
        $this->assertSame(
            [
                'LS_PRODUCT_NAME' => 'ProstaFix',
                'LS_PRICE' => '49.99',
                'LS_CURRENCY' => 'EUR',
            ],
            $phpVars['LS_RUNTIME_VARS']
        );
    }

    public function testNetworkFailureFallsBackToCacheAndStillBuildsPhpAliases(): void
    {
        $cache = new Cache('test', $this->cacheDir);
        $cache->set(
            'landing:landing-1',
            ['etag' => 'abc', 'vars' => ['LS_PRODUCT_NAME' => 'Fallback product', 'LS_PRICE' => '39.00']],
            300
        );

        $client = new Client('https://api.local', 'secret', static function (): array {
            throw new RuntimeException('network down');
        });

        $bridge = new Bridge($client, $cache, 'landing-1', [], 300, $this->cacheDir . '/bridge.log');
        $context = $bridge->resolveRuntimeContext();

        $this->assertSame('Fallback product', $context['phpVars']['PRODUCT_NAME']);
        $this->assertSame('39.00', $context['phpVars']['PRODUCT_PRICE']);
    }

    public function testPartialPayloadLeavesUnknownAliasesBlank(): void
    {
        $bridge = new Bridge(
            new Client('https://api.local', 'secret', static fn (): array => ['status' => 304]),
            new Cache('test', $this->cacheDir),
            'landing-4',
            [],
            300,
            $this->cacheDir . '/bridge.log'
        );

        $phpVars = $bridge->buildPhpCompatVars(['LS_PRODUCT_NAME' => 'Solo value']);

        $this->assertSame('Solo value', $phpVars['PRODUCT_NAME']);
        $this->assertSame('', $phpVars['PRODUCT_PRICE']);
        $this->assertSame('', $phpVars['CTA']);
    }

    public function testLegacyTemplateCanUsePhpVariablesBeforeRender(): void
    {
        $bridge = new Bridge(
            new Client('https://api.local', 'secret', static fn (): array => ['status' => 304]),
            new Cache('test', $this->cacheDir),
            'landing-5',
            ['__NAME__' => '{{LS_PRODUCT_NAME}}'],
            300,
            $this->cacheDir . '/bridge.log'
        );

        $runtimeContext = $bridge->resolveRuntimeContext();
        $runtimeContext['vars'] = [
            'LS_PRODUCT_NAME' => 'Bridge Product',
            'LS_PRICE' => '29.00',
            'LS_CURRENCY' => 'USD',
        ];
        $runtimeContext['phpVars'] = $bridge->buildPhpCompatVars($runtimeContext['vars']);

        $rendered = $this->renderLegacyFixture($runtimeContext['phpVars']);
        $rewritten = (new Rewriter($runtimeContext['vars']))->rewrite($rendered);

        $this->assertStringContainsString('<h1>Bridge Product</h1>', $rewritten);
        $this->assertStringContainsString('<p class="price">29.00</p>', $rewritten);
        $this->assertStringContainsString('<p class="currency">USD</p>', $rewritten);
        $this->assertStringContainsString('data-name="Bridge Product"', $rewritten);
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

    public function testCanonicalLsVarsRewriteExistingPlaceholders(): void
    {
        $rewriter = new Rewriter(['LS_PRODUCT_NAME' => 'Canonical Product'], []);

        $this->assertSame(
            'Canonical Product',
            $rewriter->rewrite('{{LS_PRODUCT_NAME}}')
        );
    }

    /**
     * @param array<string, mixed> $phpVars
     */
    private function renderLegacyFixture(array $phpVars): string
    {
        ob_start();
        extract($phpVars, EXTR_OVERWRITE);
        include $this->fixturePath;

        return (string) ob_get_clean();
    }
}
