<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GradeBoundary extends Model
{
    protected $fillable = [
        'grading_system_id', 'letter_grade', 'label',
        'min_score', 'max_score', 'is_pass', 'points',
    ];

    protected $casts = [
        'min_score' => 'decimal:2',
        'max_score' => 'decimal:2',
        'is_pass'   => 'boolean',
    ];

    public function gradingSystem()
    {
        return $this->belongsTo(GradingSystem::class);
    }
}
