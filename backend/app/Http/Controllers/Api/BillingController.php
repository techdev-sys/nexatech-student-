<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use Illuminate\Http\Request;

class BillingController extends Controller
{
    public function invoices(Request $request)
    {
        $schoolId = $request->user()->school_id;

        $invoices = Invoice::where('school_id', $schoolId)
            ->with(['feeStructure', 'student'])
            ->when($request->student_id, fn($q) => $q->where('student_id', $request->student_id))
            ->orderBy('created_at', 'desc')
            ->get();

        $currency = $invoices->first()?->feeStructure?->currency ?? 'USD';

        $summary = [
            'total_billed'        => number_format($invoices->sum('total_amount'), 2, '.', ''),
            'total_paid'          => number_format($invoices->sum('paid_amount'), 2, '.', ''),
            'outstanding_balance' => number_format($invoices->sum('balance_amount'), 2, '.', ''),
            'currency'            => $currency,
        ];

        $invoiceData = $invoices->map(fn($inv) => [
            'id'             => $inv->id,
            'invoice_number' => $inv->invoice_number,
            'student_name'   => trim(($inv->student?->first_name ?? '') . ' ' . ($inv->student?->last_name ?? '')),
            'student_number' => $inv->student?->student_number,
            'term_label'     => 'Term ' . ($inv->feeStructure?->term ?? '?') . ' ' . ($inv->feeStructure?->academic_year ?? ''),
            'currency'       => $inv->feeStructure?->currency ?? $currency,
            'total_amount'   => $inv->total_amount,
            'paid_amount'    => $inv->paid_amount,
            'balance_amount' => $inv->balance_amount,
            'status'         => $inv->status,
            'due_date'       => $inv->due_date?->format('Y-m-d'),
            'created_at'     => $inv->created_at->format('Y-m-d'),
        ]);

        return response()->json([
            'summary'  => $summary,
            'invoices' => $invoiceData->values(),
        ]);
    }
}
