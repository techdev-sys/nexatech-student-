<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Invoice extends Model
{
    use BelongsToTenant, SoftDeletes;

    protected $fillable = [
        'school_id', 'student_id', 'fee_structure_id',
        'invoice_number', 'total_amount', 'paid_amount',
        'balance_amount', 'status', 'due_date',
    ];

    protected $casts = [
        'total_amount'   => 'decimal:2',
        'paid_amount'    => 'decimal:2',
        'balance_amount' => 'decimal:2',
        'due_date'       => 'date',
    ];

    public static function generateNumber(int $schoolId): string
    {
        $year  = now()->year;
        $count = static::withoutGlobalScopes()
            ->where('school_id', $schoolId)
            ->whereYear('created_at', $year)
            ->count() + 1;

        return sprintf('INV-%d-%04d', $year, $count);
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function feeStructure()
    {
        return $this->belongsTo(FeeStructure::class);
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }
}
