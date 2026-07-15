<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Pivot model for the parent ↔ student many-to-many relationship.
 *
 * Replaces the legacy 1-to-1 students.parent_user_id FK for new links.
 * The old FK is kept in sync with the primary contact for backward compatibility.
 */
class ParentStudent extends Model
{
    use BelongsToTenant, SoftDeletes;

    protected $table = 'parent_student';

    protected $fillable = [
        'school_id',
        'parent_user_id',
        'student_id',
        'relationship',
        'is_primary_contact',
        'can_receive_sms',
        'can_receive_email',
    ];

    protected $casts = [
        'is_primary_contact' => 'boolean',
        'can_receive_sms'    => 'boolean',
        'can_receive_email'  => 'boolean',
    ];

    public function parent()
    {
        return $this->belongsTo(User::class, 'parent_user_id');
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }
}
