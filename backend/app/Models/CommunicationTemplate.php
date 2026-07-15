<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CommunicationTemplate extends Model
{
    use HasFactory, BelongsToTenant, SoftDeletes;

    // Keep template body and variable list out of generic audit log records.
    public static array $auditRedact = ['body', 'variables_json'];

    protected $fillable = [
        'school_id', 'name', 'channel', 'subject', 'body', 'variables_json', 'is_active',
    ];

    protected $casts = [
        'variables_json' => 'array',
        'is_active'      => 'boolean',
    ];

    public function communications()
    {
        return $this->hasMany(Communication::class, 'template_id');
    }
}
