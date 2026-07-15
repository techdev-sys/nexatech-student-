<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Assessment extends Model
{
    use BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'school_id', 'subject_id', 'grading_system_id', 'exam_session_id',
        'name', 'type', 'academic_year', 'term', 'weightage', 'max_marks',
    ];

    protected $casts = [
        'weightage'  => 'decimal:2',
        'max_marks'  => 'decimal:2',
        'term'       => 'integer',
    ];

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function gradingSystem()
    {
        return $this->belongsTo(GradingSystem::class);
    }

    public function examSession()
    {
        return $this->belongsTo(ExamSession::class);
    }

    public function grades()
    {
        return $this->hasMany(Grade::class);
    }

    public function effectiveGradingSystem(): ?GradingSystem
    {
        if ($this->grading_system_id) {
            return $this->gradingSystem()->with('boundaries')->first();
        }

        return GradingSystem::where('school_id', $this->school_id)
            ->where('is_default', true)
            ->with('boundaries')
            ->first();
    }
}
