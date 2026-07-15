<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth;

trait BelongsToTenant
{
    protected static function bootBelongsToTenant(): void
    {
        static::addGlobalScope('tenant', function (Builder $query) {
            if (!Auth::check()) {
                return;
            }

            $schoolId = Auth::user()->school_id;

            if ($schoolId) {
                $query->where($query->getModel()->getTable() . '.school_id', $schoolId);
            } else {
                // Fail closed: users with no school_id (e.g. platform_admin) see no tenant records.
                // Use ::withoutTenantScope() for intentional platform-wide queries.
                $query->whereRaw('1 = 0');
            }
        });

        static::creating(function ($model) {
            if (!$model->school_id && Auth::check()) {
                $model->school_id = Auth::user()->school_id;
            }
        });
    }

    /**
     * Returns a query builder with the tenant scope removed.
     * Use only for deliberate cross-school platform-admin operations.
     */
    public static function withoutTenantScope(): Builder
    {
        return static::withoutGlobalScope('tenant');
    }

    public function school()
    {
        return $this->belongsTo(\App\Models\School::class);
    }
}
