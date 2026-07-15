<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class TimetablePeriod extends Model
{
    use HasFactory, BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'school_id', 'name', 'starts_at', 'ends_at',
        'sort_order', 'is_break', 'is_active',
    ];

    protected $casts = [
        'sort_order' => 'integer',
        'is_break'   => 'boolean',
        'is_active'  => 'boolean',
    ];

    public function availabilities()
    {
        return $this->hasMany(TeacherAvailability::class, 'period_id');
    }
}
