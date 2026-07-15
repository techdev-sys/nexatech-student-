<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class Subject extends Model
{
    use BelongsToTenant;

    protected $fillable = ['school_id', 'name', 'code', 'grade_level', 'description'];

    public function grades()
    {
        return $this->hasMany(Grade::class);
    }

    public function attendance()
    {
        return $this->hasMany(Attendance::class);
    }
}
