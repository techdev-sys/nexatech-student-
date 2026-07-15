<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class ActivityLogger
{
    // Fields that must never appear in logs (passwords, tokens, secrets)
    private static array $redacted = ['password', 'remember_token', 'token', 'gateway_raw_response'];

    public static function log(
        string  $action,
        Model   $model,
        ?array  $oldValues = null,
        ?array  $newValues = null,
    ): void {
        $user     = Auth::user();
        $schoolId = $user?->school_id ?? ($model->school_id ?? null);

        ActivityLog::create([
            'school_id'  => $schoolId,
            'user_id'    => $user?->id,
            'action'     => $action,
            'model_type' => get_class($model),
            'model_id'   => $model->getKey(),
            'old_values' => $oldValues ? static::strip($oldValues) : null,
            'new_values' => $newValues ? static::strip($newValues) : null,
            'ip_address' => Request::ip(),
            'user_agent' => substr((string) Request::userAgent(), 0, 300),
        ]);
    }

    public static function logRaw(
        string $action,
        string $modelType,
        ?int   $modelId,
        ?array $data = null,
    ): void {
        $user     = Auth::user();
        $schoolId = $user?->school_id;

        ActivityLog::create([
            'school_id'  => $schoolId,
            'user_id'    => $user?->id,
            'action'     => $action,
            'model_type' => $modelType,
            'model_id'   => $modelId,
            'new_values' => $data ? static::strip($data) : null,
            'ip_address' => Request::ip(),
            'user_agent' => substr((string) Request::userAgent(), 0, 300),
        ]);
    }

    private static function strip(array $data): array
    {
        return array_filter(
            $data,
            fn($key) => !in_array($key, static::$redacted, true),
            ARRAY_FILTER_USE_KEY
        );
    }
}
