<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class SchoolClass extends Model
{
    use BelongsToTenant;

    protected $table = 'classes';

    protected $fillable = ['school_id', 'name', 'grade_level', 'section'];

    public function feeStructures()
    {
        return $this->hasMany(FeeStructure::class, 'class_id');
    }
}
