<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class BehaviourIncident extends Model
{
    use HasFactory, BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'school_id', 'student_id', 'incident_type_id', 'reported_by_user_id',
        'reviewed_by_user_id',
        'class_id', 'subject_id', 'term', 'academic_year',
        'points', 'incident_date', 'description', 'action_taken',
        'parent_notified_at', 'status',
        'reviewed_at', 'resolved_at', 'escalated_at',
    ];

    protected $casts = [
        'points'             => 'integer',
        'incident_date'      => 'date',
        'parent_notified_at' => 'datetime',
        'reviewed_at'        => 'datetime',
        'resolved_at'        => 'datetime',
        'escalated_at'       => 'datetime',
    ];

    // Excluded from AuditObserver logs to minimize exposure of sensitive details.
    public static array $auditRedact = ['description', 'action_taken'];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function incidentType()
    {
        return $this->belongsTo(BehaviourIncidentType::class, 'incident_type_id');
    }

    public function reportedBy()
    {
        return $this->belongsTo(User::class, 'reported_by_user_id');
    }

    public function schoolClass()
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }
}
