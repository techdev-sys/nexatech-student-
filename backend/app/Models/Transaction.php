<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'school_id', 'invoice_id', 'transaction_reference',
        'gateway_reference', 'gateway', 'amount', 'currency',
        'status', 'payer_phone_or_email', 'gateway_raw_response', 'settled_at',
    ];

    protected $casts = [
        'amount'               => 'decimal:2',
        'gateway_raw_response' => 'array',
        'settled_at'           => 'datetime',
    ];

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }
}
