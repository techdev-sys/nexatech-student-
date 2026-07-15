<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Grade extends Model
{
    use BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'school_id', 'student_id', 'subject_id', 'assessment_id', 'teacher_id',
        'term', 'academic_year', 'score', 'weighted_score', 'grade_letter', 'remarks',
    ];

    protected $casts = [
        'score'          => 'decimal:2',
        'weighted_score' => 'decimal:2',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function assessment()
    {
        return $this->belongsTo(Assessment::class);
    }
}
