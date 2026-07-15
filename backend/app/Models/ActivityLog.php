<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    public $timestamps  = false;
    public $incrementing = true;

    protected $fillable = [
        'school_id', 'user_id', 'action',
        'model_type', 'model_id',
        'old_values', 'new_values',
        'ip_address', 'user_agent',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'created_at' => 'datetime',
    ];

    // No BelongsToTenant — logs must persist even when the school is filtered.
    // Queries are always explicitly scoped with where('school_id', ...).

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
