<?php

return [
    'name' => env('AUTH_COOKIE_NAME', 'nexatech_session'),
    'domain' => env('AUTH_COOKIE_DOMAIN'),
    'secure' => (bool) env('AUTH_COOKIE_SECURE', false),
    'same_site' => env('AUTH_COOKIE_SAME_SITE', 'lax'),
    'lifetime_minutes' => (int) env('AUTH_COOKIE_LIFETIME_MINUTES', 43200),
];
