<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Student extends Model
{
    use HasFactory, BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'school_id', 'parent_user_id', 'first_name', 'last_name', 'student_number',
        'email', 'phone', 'date_of_birth', 'grade_level', 'section',
        'parent_name', 'parent_phone', 'parent_email',
        'enrollment_date', 'status',
    ];

    protected $casts = [
        'date_of_birth'   => 'date',
        'enrollment_date' => 'date',
    ];

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }

    public function parentUser()
    {
        return $this->belongsTo(User::class, 'parent_user_id');
    }

    // Many-to-many via pivot (Phase 5B hardening)
    public function parents()
    {
        return $this->belongsToMany(User::class, 'parent_student', 'student_id', 'parent_user_id')
            ->withPivot('relationship', 'is_primary_contact', 'can_receive_sms', 'can_receive_email')
            ->withTimestamps()
            ->wherePivotNull('deleted_at');
    }

    public function parentLinks()
    {
        return $this->hasMany(ParentStudent::class);
    }

    public function grades()
    {
        return $this->hasMany(Grade::class);
    }

    public function attendance()
    {
        return $this->hasMany(Attendance::class);
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }

    public function behaviourIncidents()
    {
        return $this->hasMany(BehaviourIncident::class);
    }
}
