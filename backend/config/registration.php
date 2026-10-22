<?php

return [
    // Public tenant creation is disabled by default. Provision schools through
    // the authenticated platform-admin workflow instead.
    'public_enabled' => (bool) env('PUBLIC_REGISTRATION_ENABLED', false),
];
