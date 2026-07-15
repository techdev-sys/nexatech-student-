<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class BehaviourIncidentType extends Model
{
    use HasFactory, BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'school_id', 'name', 'description', 'default_points',
        'severity', 'category', 'notify_parent', 'is_active',
    ];

    protected $casts = [
        'default_points' => 'integer',
        'notify_parent'  => 'boolean',
        'is_active'      => 'boolean',
    ];

    public function incidents()
    {
        return $this->hasMany(BehaviourIncident::class, 'incident_type_id');
    }
}
