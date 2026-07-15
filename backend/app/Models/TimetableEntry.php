<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class TimetableEntry extends Model
{
    use HasFactory, BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'school_id', 'class_id', 'subject_id', 'teacher_user_id',
        'room_id', 'period_id', 'day_of_week', 'academic_year',
        'term', 'status', 'notes',
    ];

    public function schoolClass()
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_user_id');
    }

    public function room()
    {
        return $this->belongsTo(TimetableRoom::class, 'room_id');
    }

    public function period()
    {
        return $this->belongsTo(TimetablePeriod::class, 'period_id');
    }
}
