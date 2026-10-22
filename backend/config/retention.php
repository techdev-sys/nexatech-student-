<?php

return [
    'demo_requests_days' => (int) env('RETENTION_DEMO_REQUESTS_DAYS', 30),
    'communication_deliveries_days' => (int) env('RETENTION_COMMUNICATION_DELIVERIES_DAYS', 180),
    'activity_logs_days' => (int) env('RETENTION_ACTIVITY_LOGS_DAYS', 365),
];
