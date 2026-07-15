<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ExamTimetable extends Model
{
    use BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'school_id', 'exam_session_id', 'class_id', 'subject_id',
        'room_id', 'exam_date', 'start_time', 'end_time',
        'supervisor_user_id', 'notes',
    ];

    protected $casts = [
        'exam_date' => 'date',
    ];

    public function examSession()
    {
        return $this->belongsTo(ExamSession::class);
    }

    public function schoolClass()
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function room()
    {
        return $this->belongsTo(TimetableRoom::class, 'room_id');
    }

    public function supervisor()
    {
        return $this->belongsTo(User::class, 'supervisor_user_id');
    }
}
