<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        $attendance = Attendance::with(['student', 'subject', 'teacher'])
            ->when($request->student_id, fn($q) => $q->where('student_id', $request->student_id))
            ->when($request->subject_id, fn($q) => $q->where('subject_id', $request->subject_id))
            ->when($request->date,       fn($q) => $q->where('date',       $request->date))
            ->when($request->status,     fn($q) => $q->where('status',     $request->status))
            ->orderBy('date', 'desc')
            ->paginate(min((int) ($request->per_page ?? 20), 500));

        return response()->json($attendance);
    }

    public function store(Request $request)
    {
        $schoolId = $request->user()->school_id;

        $data = $request->validate([
            'student_id' => ['required', Rule::exists('students', 'id')->where('school_id', $schoolId)],
            'subject_id' => ['required', Rule::exists('subjects', 'id')->where('school_id', $schoolId)],
            'date'       => 'required|date',
            'status'     => 'required|in:present,absent,late,excused',
            'remarks'    => 'nullable|string',
        ]);

        $data['teacher_id'] = $request->user()->id;

        $record = Attendance::updateOrCreate(
            [
                'school_id'  => $schoolId,
                'student_id' => $data['student_id'],
                'subject_id' => $data['subject_id'],
                'date'       => $data['date'],
            ],
            $data
        );

        return response()->json($record->load(['student', 'subject', 'teacher']), 201);
    }

    public function bulkStore(Request $request)
    {
        $schoolId = $request->user()->school_id;

        $request->validate([
            'subject_id'           => ['required', Rule::exists('subjects', 'id')->where('school_id', $schoolId)],
            'date'                 => 'required|date',
            'records'              => 'required|array|min:1',
            'records.*.student_id' => ['required', Rule::exists('students', 'id')->where('school_id', $schoolId)],
            'records.*.status'     => 'required|in:present,absent,late,excused',
            'records.*.remarks'    => 'nullable|string',
        ]);

        $teacherId = $request->user()->id;

        $created = DB::transaction(function () use ($request, $schoolId, $teacherId) {
            $results = [];
            foreach ($request->records as $record) {
                $results[] = Attendance::updateOrCreate(
                    [
                        'school_id'  => $schoolId,
                        'student_id' => $record['student_id'],
                        'subject_id' => $request->subject_id,
                        'date'       => $request->date,
                    ],
                    [
                        'teacher_id' => $teacherId,
                        'status'     => $record['status'],
                        'remarks'    => $record['remarks'] ?? null,
                    ]
                );
            }
            return $results;
        });

        return response()->json(['saved' => count($created), 'records' => $created], 201);
    }

    public function show(Attendance $attendance)
    {
        return response()->json($attendance->load(['student', 'subject', 'teacher']));
    }

    public function update(Request $request, Attendance $attendance)
    {
        $data = $request->validate([
            'status'  => 'sometimes|in:present,absent,late,excused',
            'remarks' => 'nullable|string',
        ]);

        $attendance->update($data);

        return response()->json($attendance->load(['student', 'subject', 'teacher']));
    }

    public function destroy(Attendance $attendance)
    {
        $attendance->delete(); // soft delete
        return response()->json(['message' => 'Attendance record deleted.']);
    }

    public function restore(int $id, Request $request)
    {
        $record = Attendance::withTrashed()
            ->where('id', $id)
            ->where('school_id', $request->user()->school_id)
            ->firstOrFail();

        $record->restore();

        return response()->json($record->load(['student', 'subject', 'teacher']));
    }
}
