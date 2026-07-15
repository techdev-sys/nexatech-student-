<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Services\ExpenseService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ExpenseController extends Controller
{
    private const EAGER = ['category', 'createdBy'];

    public function __construct(private ExpenseService $expenses) {}

    public function index(Request $request)
    {
        $request->validate([
            'expense_category_id' => 'nullable|integer',
            'status'              => 'nullable|in:draft,approved,paid,cancelled',
            'from_date'           => 'nullable|date',
            'to_date'             => 'nullable|date|after_or_equal:from_date',
            'search'              => 'nullable|string|max:100',
            'per_page'            => 'nullable|integer|min:1|max:100',
        ]);

        $expenses = Expense::with(self::EAGER)
            ->when($request->expense_category_id, fn($q) => $q->where('expense_category_id', $request->expense_category_id))
            ->when($request->status,              fn($q) => $q->where('status', $request->status))
            ->when($request->from_date,           fn($q) => $q->whereDate('expense_date', '>=', $request->from_date))
            ->when($request->to_date,             fn($q) => $q->whereDate('expense_date', '<=', $request->to_date))
            ->when($request->search, fn($q) => $q->where(function ($sub) use ($request) {
                $sub->where('vendor_name', 'like', "%{$request->search}%")
                    ->orWhere('reference_number', 'like', "%{$request->search}%")
                    ->orWhere('description', 'like', "%{$request->search}%");
            }))
            ->orderByDesc('expense_date')
            ->orderByDesc('id')
            ->paginate((int) ($request->per_page ?? 50));

        return response()->json($expenses);
    }

    public function store(Request $request)
    {
        $schoolId = $request->user()->school_id;

        $data = $request->validate([
            'expense_category_id' => ['required', Rule::exists('expense_categories', 'id')->where('school_id', $schoolId)],
            'expense_date'        => 'required|date',
            'reference_number'    => 'nullable|string|max:100',
            'vendor_name'         => 'nullable|string|max:150',
            'amount'              => 'required|numeric|min:0.01',
            'payment_method'      => 'nullable|string|max:50',
            'description'         => 'nullable|string',
            'status'              => 'nullable|in:draft,approved',
        ]);

        $data['school_id']          = $schoolId;
        $data['created_by_user_id'] = $request->user()->id;
        $data['status']             = $data['status'] ?? 'draft';

        $expense = $this->expenses->create($data);

        return response()->json($expense->load(self::EAGER), 201);
    }

    public function show(Expense $expense)
    {
        return response()->json($expense->load(self::EAGER));
    }

    public function update(Request $request, Expense $expense)
    {
        $schoolId = $request->user()->school_id;

        $data = $request->validate([
            'expense_category_id' => ['sometimes', Rule::exists('expense_categories', 'id')->where('school_id', $schoolId)],
            'expense_date'        => 'sometimes|date',
            'reference_number'    => 'nullable|string|max:100',
            'vendor_name'         => 'nullable|string|max:150',
            'amount'              => 'sometimes|numeric|min:0.01',
            'payment_method'      => 'nullable|string|max:50',
            'description'         => 'nullable|string',
        ]);

        return response()->json($this->expenses->update($expense, $data)->load(self::EAGER));
    }

    public function destroy(Expense $expense)
    {
        $this->expenses->delete($expense);

        return response()->json(['message' => 'Expense deleted.']);
    }

    public function restore(int $id, Request $request)
    {
        $expense = Expense::withTrashed()
            ->where('id', $id)
            ->where('school_id', $request->user()->school_id)
            ->firstOrFail();

        $expense->restore();

        return response()->json($expense->load(self::EAGER));
    }

    public function approve(Expense $expense)
    {
        return response()->json($this->expenses->approve($expense)->load(self::EAGER));
    }

    public function markPaid(Expense $expense)
    {
        return response()->json($this->expenses->markPaid($expense)->load(self::EAGER));
    }

    public function cancel(Expense $expense)
    {
        return response()->json($this->expenses->cancel($expense)->load(self::EAGER));
    }
}
