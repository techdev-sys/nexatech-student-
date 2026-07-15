<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class FeeStructure extends Model
{
    use BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'school_id', 'title', 'academic_year', 'term',
        'amount', 'currency', 'class_id',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'term'   => 'integer',
    ];

    public function schoolClass()
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }
}
