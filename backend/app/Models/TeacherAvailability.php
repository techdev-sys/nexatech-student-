<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class TeacherAvailability extends Model
{
    use HasFactory, BelongsToTenant, SoftDeletes;

    protected $table = 'teacher_availabilities';

    // Reason may contain personal context (e.g. medical) — keep out of audit log records.
    public static array $auditRedact = ['reason'];

    protected $fillable = [
        'school_id', 'teacher_user_id', 'day_of_week',
        'period_id', 'availability_status', 'reason',
    ];

    public function teacher()
    {
        return $this->belongsTo(User::class, 'teacher_user_id');
    }

    public function period()
    {
        return $this->belongsTo(TimetablePeriod::class, 'period_id');
    }
}
