<?php

declare(strict_types=1);

namespace Lendsphera\LegacyBridge;

use RuntimeException;

final class Client
{
    /** @var callable|null */
    private $transport;

    public function __construct(
        private readonly string $apiUrl,
        private readonly string $bridgeKey,
        ?callable $transport = null
    ) {
        $this->transport = $transport;
    }

    public function fetchRuntimeVars(string $landingId, ?string $etag = null): array
    {
        $headers = [
            'Accept: application/json',
            'X-LS-Bridge-Key: ' . $this->bridgeKey,
        ];
        if ($etag !== null && $etag !== '') {
            $headers[] = 'If-None-Match: ' . $etag;
        }

        $response = $this->request($headers, $landingId);
        $status = (int) ($response['status'] ?? 0);

        if ($status === 304) {
            return ['status' => 304, 'etag' => $etag, 'vars' => null];
        }

        if ($status < 200 || $status >= 300) {
            throw new RuntimeException('Bridge API returned HTTP ' . $status);
        }

        $body = (string) ($response['body'] ?? '');
        $json = json_decode($body, true);
        if (!is_array($json)) {
            throw new RuntimeException('Malformed JSON from bridge API');
        }

        $vars = $json['vars'] ?? $json;
        if (!is_array($vars)) {
            throw new RuntimeException('Bridge payload missing vars object');
        }

        return [
            'status' => 200,
            'etag' => $response['headers']['etag'] ?? $etag,
            'vars' => $vars,
        ];
    }

    private function request(array $headers, string $landingId): array
    {
        if ($this->transport !== null) {
            return ($this->transport)([
                'url' => rtrim($this->apiUrl, '/') . '/v1/landings/' . rawurlencode($landingId) . '/runtime-vars',
                'headers' => $headers,
                'landingId' => $landingId,
            ]);
        }

        $url = rtrim($this->apiUrl, '/') . '/v1/landings/' . rawurlencode($landingId) . '/runtime-vars';
        $ch = curl_init($url);
        if ($ch === false) {
            throw new RuntimeException('Unable to initialize curl');
        }

        $respHeaders = [];
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 3,
            CURLOPT_CONNECTTIMEOUT => 2,
            CURLOPT_HEADERFUNCTION => static function ($ch, string $headerLine) use (&$respHeaders): int {
                $line = trim($headerLine);
                if ($line === '' || !str_contains($line, ':')) {
                    return strlen($headerLine);
                }
                [$key, $value] = explode(':', $line, 2);
                $respHeaders[strtolower(trim($key))] = trim($value);
                return strlen($headerLine);
            },
        ]);

        $body = curl_exec($ch);
        if ($body === false) {
            $error = curl_error($ch);
            curl_close($ch);
            throw new RuntimeException('Bridge API request failed: ' . $error);
        }

        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);

        return ['status' => $status, 'headers' => $respHeaders, 'body' => (string) $body];
    }
}
