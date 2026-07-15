<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class GradingSystem extends Model
{
    use BelongsToTenant;

    protected $fillable = ['school_id', 'name', 'is_default'];

    protected $casts = ['is_default' => 'boolean'];

    public function boundaries()
    {
        return $this->hasMany(GradeBoundary::class)->orderByDesc('min_score');
    }

    public function school()
    {
        return $this->belongsTo(School::class);
    }

    public function resolve(float $percentage): ?GradeBoundary
    {
        return $this->boundaries
            ->first(fn($b) => $percentage >= $b->min_score && $percentage <= $b->max_score);
    }
}
