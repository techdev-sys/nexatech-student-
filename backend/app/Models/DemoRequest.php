<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DemoRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'institution',
        'email',
        'phone',
        'role',
        'country',
        'status',
        'access_code_hash',
        'access_code_expires_at',
        'redeemed_at',
        'redeemed_by_user_id',
        'reviewed_by',
        'reviewed_at',
        'review_notes',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
        'access_code_expires_at' => 'datetime',
        'redeemed_at' => 'datetime',
    ];

    protected $hidden = ['access_code', 'access_code_hash'];

    public static function hashAccessCode(string $code): string
    {
        $normalized = strtoupper(preg_replace('/[^A-Z0-9]/i', '', $code));

        return hash_hmac('sha256', $normalized, (string) config('app.key'));
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function redeemedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'redeemed_by_user_id');
    }
}
