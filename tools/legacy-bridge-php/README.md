# Lendsphera Legacy PHP Bridge

Small package to inject runtime vars into legacy PHP landings.

## Install

1. Copy this folder to host, e.g. `/opt/lendsphera-bridge`.
2. Copy `config.example.php` to `config.php` and set values.
3. Either include before any output in the legacy entry file, or wire it through
   PHP-FPM `auto_prepend_file` for transparent injection:

```php
require_once '/opt/lendsphera-bridge/src/lendsphera-bridge.php';
```

## Runtime behavior

- Fetches runtime vars from
  `LS_API_URL/v1/landings/{LS_LANDING_ID}/runtime-vars`.
- Sends `X-LS-Bridge-Key` and reuses `If-None-Match` / `ETag` for lightweight
  refreshes.
- Uses ETag (`If-None-Match`) to avoid full payload downloads.
- Caches payload in APCu (if available) and falls back to files in
  `/tmp/ls-cache/`.
- Exposes runtime data before the legacy template executes:
  - canonical PHP vars like `$LS_PRODUCT_NAME`, `$LS_PRICE`, `$LS_CURRENCY`
  - compatibility aliases like `$PRODUCT_NAME`, `$PRODUCT_PRICE`,
    `$PRODUCT_OLD_PRICE`, `$PRODUCT_IMAGE_PATH`
  - structured `$LS_RUNTIME_VARS` array for ad hoc access
- Rewrites placeholders in output buffer:
  - `{{LS_*}}` from API vars
  - legacy strings from `LS_PLACEHOLDER_MAP`
- On API failures/malformed JSON, uses last cached values and logs to
  `/var/log/lendsphera-bridge.log`.

## Example

```php
<?php
echo '<h1>' . $PRODUCT_NAME . '</h1>';
echo '<p>Price: ' . $PRODUCT_PRICE . ' ' . $CURRENCY . '</p>';
echo '<div data-product="{{LS_PRODUCT_NAME}}"></div>';
```

## Test

```bash
docker run --rm -v $PWD/tools/legacy-bridge-php:/app -w /app php:8.2-cli \
  bash -lc "apt-get update && apt-get install -y git unzip curl && curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer && composer install && vendor/bin/phpunit"
```
