<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = ['school_id', 'name', 'email', 'password', 'role', 'is_demo'];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
            'is_demo'           => 'boolean',
        ];
    }

    public function school()
    {
        return $this->belongsTo(School::class);
    }

    // Legacy 1-to-1 link (kept for backward compatibility — use children() for new code)
    public function student()
    {
        return $this->hasOne(Student::class, 'parent_user_id');
    }

    // Many-to-many via pivot (Phase 5B hardening)
    public function children()
    {
        return $this->belongsToMany(Student::class, 'parent_student', 'parent_user_id', 'student_id')
            ->withPivot('relationship', 'is_primary_contact', 'can_receive_sms', 'can_receive_email')
            ->withTimestamps()
            ->wherePivotNull('deleted_at');
    }

    public function parentLinks()
    {
        return $this->hasMany(ParentStudent::class, 'parent_user_id');
    }

    public function isAdmin(): bool
    {
        return in_array($this->role, ['admin', 'super_admin']);
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    public function isParent(): bool
    {
        return $this->role === 'parent';
    }

    public function isPlatformAdmin(): bool
    {
        return $this->role === 'platform_admin';
    }

    public function isAccountant(): bool
    {
        return $this->role === 'accountant';
    }

    // Roles permitted to operate the finance / accounting module.
    public function isFinance(): bool
    {
        return in_array($this->role, ['admin', 'super_admin', 'accountant']);
    }
}
