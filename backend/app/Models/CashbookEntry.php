<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CashbookEntry extends Model
{
    use HasFactory, BelongsToTenant;

    // Append-only ledger — no SoftDeletes by design.
    protected $fillable = [
        'school_id', 'entry_type', 'reference_type', 'reference_id',
        'transaction_date', 'amount', 'description', 'created_by_user_id',
    ];

    protected $casts = [
        'transaction_date' => 'date',
        'amount'           => 'decimal:2',
    ];

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}
