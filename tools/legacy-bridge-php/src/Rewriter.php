<?php

declare(strict_types=1);

namespace Lendsphera\LegacyBridge;

final class Rewriter
{
    public function __construct(
        private readonly array $vars,
        private readonly array $legacyMap = []
    ) {}

    public function rewrite(string $html): string
    {
        if ($html === '') {
            return $html;
        }

        $varReplacements = [];
        foreach ($this->vars as $key => $value) {
            if (!is_scalar($value)) {
                continue;
            }
            $normalized = strtoupper((string) $key);
            if (str_starts_with($normalized, 'LS_')) {
                $varReplacements['{{' . $normalized . '}}'] = (string) $value;
                $varReplacements['{{' . (string) $key . '}}'] = (string) $value;
                continue;
            }

            $varReplacements['{{LS_' . $normalized . '}}'] = (string) $value;
            $varReplacements['{{LS_' . (string) $key . '}}'] = (string) $value;
        }

        if ($varReplacements !== []) {
            $html = strtr($html, $varReplacements);
        }

        $legacyReplacements = [];
        foreach ($this->legacyMap as $from => $to) {
            if (!is_string($from) || !is_scalar($to)) {
                continue;
            }
            $legacyReplacements[$from] = (string) $to;
        }

        if ($legacyReplacements === []) {
            return $html;
        }

        return strtr($html, $legacyReplacements);
    }

    public function outputBufferHandler(string $buffer): string
    {
        return $this->rewrite($buffer);
    }
}
