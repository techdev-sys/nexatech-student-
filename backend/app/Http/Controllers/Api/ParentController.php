<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use Illuminate\Http\Request;

class ParentController extends Controller
{
    public function overview(Request $request)
    {
        $user    = $request->user();
        $student = $user->student()->with(['school'])->first();

        if (!$student) {
            return response()->json(['error' => 'No student linked to this account.'], 404);
        }

        // ── Attendance summary ───────────────────────────────────────────────
        $attendanceRecords = Attendance::withoutGlobalScope('tenant')
            ->where('student_id', $student->id)
            ->orderByDesc('date')
            ->get();

        $total   = $attendanceRecords->count();
        $present = $attendanceRecords->where('status', 'present')->count();
        $absent  = $attendanceRecords->where('status', 'absent')->count();
        $late    = $attendanceRecords->where('status', 'late')->count();
        $excused = $attendanceRecords->where('status', 'excused')->count();

        $attendanceSummary = [
            'total'      => $total,
            'present'    => $present,
            'absent'     => $absent,
            'late'       => $late,
            'excused'    => $excused,
            'percentage' => $total > 0 ? round(($present / $total) * 100, 1) : null,
            'recent'     => $attendanceRecords->take(10)->map(fn($a) => [
                'date'    => $a->date->format('Y-m-d'),
                'status'  => $a->status,
                'subject' => $a->subject?->name,
                'remarks' => $a->remarks,
            ])->values(),
        ];

        // ── Invoices ─────────────────────────────────────────────────────────
        $invoices = $student->invoices()
            ->with('feeStructure')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($inv) => [
                'id'             => $inv->id,
                'invoice_number' => $inv->invoice_number,
                'term_label'     => 'Term ' . ($inv->feeStructure?->term ?? '?') . ' ' . ($inv->feeStructure?->academic_year ?? ''),
                'currency'       => $inv->feeStructure?->currency ?? 'USD',
                'total_amount'   => $inv->total_amount,
                'paid_amount'    => $inv->paid_amount,
                'balance_amount' => $inv->balance_amount,
                'status'         => $inv->status,
                'due_date'       => $inv->due_date?->format('Y-m-d'),
            ]);

        return response()->json([
            'student' => [
                'id'             => $student->id,
                'name'           => $student->first_name . ' ' . $student->last_name,
                'student_number' => $student->student_number,
                'grade_level'    => $student->grade_level,
                'section'        => $student->section,
                'status'         => $student->status,
                'school_name'    => $student->school->name,
            ],
            'attendance' => $attendanceSummary,
            'invoices'   => $invoices->values(),
        ]);
    }
}
