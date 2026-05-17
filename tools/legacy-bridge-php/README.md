# Lendsphera Legacy PHP Bridge

Small package to inject runtime vars into legacy PHP landings.

## Install

1. Copy this folder to host, e.g. `/opt/lendsphera-bridge`.
2. Copy `config.example.php` to `config.php` and set values.
3. Include before any output in legacy entry file:

```php
require_once '/opt/lendsphera-bridge/src/lendsphera-bridge.php';
```

## Runtime behavior

- Fetches runtime vars from `LS_API_URL/runtime/landing/{LS_LANDING_ID}`.
- Sends HMAC headers:
  - `X-LS-Bridge-Sig = hash_hmac('sha256', landingId . ':' . epochMinute, LS_BRIDGE_KEY)`
  - `X-LS-Bridge-Minute`
- Uses ETag (`If-None-Match`) to avoid full payload downloads.
- Caches payload in APCu (if available) and falls back to files in
  `/tmp/ls-cache/`.
- Rewrites placeholders in output buffer:
  - `{{LS_*}}` from API vars
  - legacy strings from `LS_PLACEHOLDER_MAP`
- On API failures/malformed JSON, uses last cached values and logs to
  `/var/log/lendsphera-bridge.log`.

## Test

```bash
docker run --rm -v $PWD/tools/legacy-bridge-php:/app -w /app php:8.2-cli \
  bash -lc "apt-get update && apt-get install -y git unzip curl && curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer && composer install && vendor/bin/phpunit"
```
