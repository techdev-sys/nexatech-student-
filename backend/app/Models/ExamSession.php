<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ExamSession extends Model
{
    use BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'school_id', 'name', 'academic_year', 'term',
        'start_date', 'end_date', 'status', 'description',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date'   => 'date',
        'term'       => 'integer',
    ];

    public function timetables()
    {
        return $this->hasMany(ExamTimetable::class);
    }

    public function assessments()
    {
        return $this->hasMany(Assessment::class);
    }
}
