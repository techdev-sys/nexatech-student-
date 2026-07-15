<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CommunicationDelivery extends Model
{
    use HasFactory;

    // No BelongsToTenant — always queried through communication_id which is already school-scoped.
    protected $fillable = [
        'school_id', 'communication_id', 'recipient_user_id', 'recipient_name',
        'recipient_phone', 'recipient_email', 'channel',
        'delivery_status', 'provider_reference', 'error_message',
        'sent_at', 'delivered_at', 'failed_at',
    ];

    protected $casts = [
        'sent_at'      => 'datetime',
        'delivered_at' => 'datetime',
        'failed_at'    => 'datetime',
    ];

    public function communication()
    {
        return $this->belongsTo(Communication::class);
    }

    public function recipientUser()
    {
        return $this->belongsTo(User::class, 'recipient_user_id');
    }
}
