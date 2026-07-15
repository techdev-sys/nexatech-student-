<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Communication extends Model
{
    use HasFactory, BelongsToTenant, SoftDeletes;

    // Keep bulk message body and filter details out of audit log records.
    public static array $auditRedact = ['body', 'audience_filter_json'];

    protected $fillable = [
        'school_id', 'created_by_user_id', 'template_id',
        'channel', 'audience_type', 'audience_filter_json',
        'subject', 'body', 'scheduled_at', 'sent_at', 'status',
        'published_at', 'expires_at',
        'total_recipients', 'successful_deliveries', 'failed_deliveries',
    ];

    protected $casts = [
        'audience_filter_json' => 'array',
        'scheduled_at'         => 'datetime',
        'sent_at'              => 'datetime',
        'published_at'         => 'datetime',
        'expires_at'           => 'datetime',
        'total_recipients'     => 'integer',
        'successful_deliveries'=> 'integer',
        'failed_deliveries'    => 'integer',
    ];

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function template()
    {
        return $this->belongsTo(CommunicationTemplate::class, 'template_id');
    }

    public function deliveries()
    {
        return $this->hasMany(CommunicationDelivery::class);
    }
}
