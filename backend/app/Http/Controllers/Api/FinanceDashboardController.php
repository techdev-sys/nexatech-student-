<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FinanceDashboardController extends Controller
{
    public function index(Request $request)
    {
        // All queries are explicitly scoped to the caller's school_id — raw DB
        // queries bypass Eloquent global scopes, so the filter is mandatory here.
        $schoolId = $request->user()->school_id;
        $today    = now()->toDateString();
        $monthStart = now()->startOfMonth()->toDateString();

        $cashbook = fn() => DB::table('cashbook_entries')->where('school_id', $schoolId);

        $incomeToday = (float) $cashbook()
            ->where('entry_type', 'income')
            ->whereDate('transaction_date', $today)
            ->sum('amount');

        $incomeMonth = (float) $cashbook()
            ->where('entry_type', 'income')
            ->whereDate('transaction_date', '>=', $monthStart)
            ->sum('amount');

        $expensesMonth = (float) $cashbook()
            ->where('entry_type', 'expense')
            ->whereDate('transaction_date', '>=', $monthStart)
            ->sum('amount');

        $totals = $cashbook()
            ->selectRaw("COALESCE(SUM(CASE WHEN entry_type='income' THEN amount ELSE 0 END),0) as income")
            ->selectRaw("COALESCE(SUM(CASE WHEN entry_type='expense' THEN amount ELSE 0 END),0) as expense")
            ->first();

        $outstanding = DB::table('invoices')
            ->where('school_id', $schoolId)
            ->whereNull('deleted_at')
            ->where('status', '!=', 'paid')
            ->selectRaw('COUNT(*) as count, COALESCE(SUM(balance_amount),0) as total')
            ->first();

        return response()->json([
            'income_today'         => $incomeToday,
            'income_this_month'    => $incomeMonth,
            'expenses_this_month'  => $expensesMonth,
            'outstanding_invoices' => [
                'count' => (int) ($outstanding->count ?? 0),
                'total' => (float) ($outstanding->total ?? 0),
            ],
            'net_cash_position'    => (float) ($totals->income ?? 0) - (float) ($totals->expense ?? 0),
        ]);
    }
}
