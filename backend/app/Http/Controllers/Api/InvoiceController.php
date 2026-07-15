<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FeeStructure;
use App\Models\Invoice;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $invoices = Invoice::with(['student', 'feeStructure'])
            ->when($request->student_id,       fn($q) => $q->where('student_id',       $request->student_id))
            ->when($request->status,           fn($q) => $q->where('status',           $request->status))
            ->when($request->fee_structure_id, fn($q) => $q->where('fee_structure_id', $request->fee_structure_id))
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($invoices);
    }

    public function generate(Request $request)
    {
        $schoolId = $request->user()->school_id;

        $request->validate([
            'fee_structure_id' => ['required', Rule::exists('fee_structures', 'id')->where('school_id', $schoolId)],
            'due_date'         => 'required|date',
            'student_ids'      => 'nullable|array',
            'student_ids.*'    => [Rule::exists('students', 'id')->where('school_id', $schoolId)],
        ]);

        $fee = FeeStructure::findOrFail($request->fee_structure_id);

        $query = Student::where('status', 'active');
        if ($request->student_ids) {
            $query->whereIn('id', $request->student_ids);
        }
        $students = $query->get();

        $created = DB::transaction(function () use ($students, $fee, $schoolId, $request) {
            $invoices = [];
            foreach ($students as $student) {
                $exists = Invoice::withoutGlobalScopes()
                    ->where('student_id', $student->id)
                    ->where('fee_structure_id', $fee->id)
                    ->whereNull('deleted_at')
                    ->exists();

                if ($exists) continue;

                $invoices[] = Invoice::create([
                    'school_id'        => $schoolId,
                    'student_id'       => $student->id,
                    'fee_structure_id' => $fee->id,
                    'invoice_number'   => Invoice::generateNumber($schoolId),
                    'total_amount'     => $fee->amount,
                    'paid_amount'      => 0,
                    'balance_amount'   => $fee->amount,
                    'status'           => 'unpaid',
                    'due_date'         => $request->due_date,
                ]);
            }
            return $invoices;
        });

        return response()->json([
            'generated' => count($created),
            'skipped'   => $students->count() - count($created),
        ], 201);
    }

    public function show(Invoice $invoice)
    {
        return response()->json($invoice->load(['student', 'feeStructure', 'transactions']));
    }

    public function destroy(Invoice $invoice)
    {
        // Only allow soft-delete if invoice has no successful transactions.
        // Financial records with payments attached must be archived, not deleted.
        $hasPaidTransactions = $invoice->transactions()
            ->where('status', 'successful')
            ->exists();

        if ($hasPaidTransactions) {
            return response()->json([
                'error' => 'Cannot delete an invoice that has successful payments. Use status management instead.',
            ], 422);
        }

        $invoice->delete(); // soft delete
        return response()->json(['message' => 'Invoice deleted.']);
    }

    public function restore(int $id, Request $request)
    {
        $invoice = Invoice::withTrashed()
            ->where('id', $id)
            ->where('school_id', $request->user()->school_id)
            ->firstOrFail();

        $invoice->restore();

        return response()->json($invoice->load(['student', 'feeStructure']));
    }
}
