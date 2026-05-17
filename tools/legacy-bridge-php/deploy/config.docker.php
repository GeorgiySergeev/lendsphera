<?php

/**
 * Docker-aware bridge config.
 *
 * In PHP-FPM, nginx's fastcgi_param values land in $_SERVER, NOT in
 * getenv().  This file bridges that gap so the existing bridge code
 * (which falls back to config.php → getenv()) picks the correct values.
 *
 * Mounted at /opt/lendsphera/bridge/config.php inside the container.
 */

return [
    'LS_API_URL'    => $_SERVER['LS_API_URL']    ?? getenv('LS_API_URL')    ?: '',
    'LS_BRIDGE_KEY' => $_SERVER['LS_BRIDGE_KEY'] ?? getenv('LS_BRIDGE_KEY') ?: '',
    'LS_LANDING_ID' => $_SERVER['LS_LANDING_ID'] ?? getenv('LS_LANDING_ID') ?: '',

    'LS_PLACEHOLDER_MAP' => [],

    'LS_FALLBACK_TTL' => (int) ($_SERVER['LS_FALLBACK_TTL'] ?? getenv('LS_FALLBACK_TTL') ?: 3600),
];
