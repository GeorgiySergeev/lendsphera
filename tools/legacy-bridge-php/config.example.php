<?php

return [
    'LS_API_URL' => 'https://api.example.com',
    'LS_BRIDGE_KEY' => 'replace-with-shared-secret',
    'LS_LANDING_ID' => 'legacy-landing-id',
    'LS_PLACEHOLDER_MAP' => [
        '%%CITY%%' => '{{LS_CITY}}',
        '%%PHONE%%' => '{{LS_PHONE}}',
    ],
    'LS_FALLBACK_TTL' => 3600,
];
