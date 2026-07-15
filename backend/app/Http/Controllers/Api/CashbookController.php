<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashbookEntry;
use Illuminate\Http\Request;

class CashbookController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'entry_type' => 'nullable|in:income,expense',
            'from_date'  => 'nullable|date',
            'to_date'    => 'nullable|date|after_or_equal:from_date',
            'per_page'   => 'nullable|integer|min:1|max:100',
        ]);

        $entries = CashbookEntry::with('createdBy')
            ->when($request->entry_type, fn($q) => $q->where('entry_type', $request->entry_type))
            ->when($request->from_date,  fn($q) => $q->whereDate('transaction_date', '>=', $request->from_date))
            ->when($request->to_date,    fn($q) => $q->whereDate('transaction_date', '<=', $request->to_date))
            ->orderByDesc('transaction_date')
            ->orderByDesc('id')
            ->paginate((int) ($request->per_page ?? 50));

        return response()->json($entries);
    }
}
