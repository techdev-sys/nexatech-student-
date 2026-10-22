<?php

return [
    'access_code_lifetime_minutes' => (int) env('DEMO_CODE_LIFETIME_MINUTES', 1440),
    'session_lifetime_minutes' => (int) env('DEMO_SESSION_LIFETIME_MINUTES', 120),
    'school_email' => env('DEMO_SCHOOL_EMAIL', 'demo@nexatech.invalid'),
    'request_notification_email' => env('DEMO_REQUEST_NOTIFICATION_EMAIL'),
    'roles' => ['admin', 'teacher', 'parent'],
];
