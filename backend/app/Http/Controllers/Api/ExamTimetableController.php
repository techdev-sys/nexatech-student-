<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ExamTimetable;
use App\Services\ExamConflictService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ExamTimetableController extends Controller
{
    public function __construct(private ExamConflictService $conflicts) {}

    public function index(Request $request)
    {
        $entries = ExamTimetable::with(['schoolClass', 'subject', 'room', 'supervisor', 'examSession'])
            ->when($request->exam_session_id, fn($q) => $q->where('exam_session_id', $request->exam_session_id))
            ->when($request->class_id,        fn($q) => $q->where('class_id',        $request->class_id))
            ->when($request->exam_date,       fn($q) => $q->where('exam_date',       $request->exam_date))
            ->orderBy('exam_date')
            ->orderBy('start_time')
            ->get();

        return response()->json($entries);
    }

    public function store(Request $request)
    {
        $schoolId = $request->user()->school_id;

        $data = $request->validate([
            'exam_session_id'    => ['required', Rule::exists('exam_sessions', 'id')->where('school_id', $schoolId)],
            'class_id'           => ['required', Rule::exists('classes',       'id')->where('school_id', $schoolId)],
            'subject_id'         => ['required', Rule::exists('subjects',      'id')->where('school_id', $schoolId)],
            'room_id'            => ['nullable', Rule::exists('timetable_rooms','id')->where('school_id', $schoolId)],
            'supervisor_user_id' => ['nullable', Rule::exists('users',         'id')->where('school_id', $schoolId)],
            'exam_date'          => 'required|date',
            'start_time'         => 'required|date_format:H:i',
            'end_time'           => 'required|date_format:H:i|after:start_time',
            'notes'              => 'nullable|string|max:1000',
        ]);

        $data['school_id'] = $schoolId;

        $this->conflicts->assertNoConflicts($data);

        $entry = ExamTimetable::create($data);

        return response()->json(
            $entry->load(['schoolClass', 'subject', 'room', 'supervisor', 'examSession']),
            201
        );
    }

    public function show(ExamTimetable $examTimetable)
    {
        return response()->json(
            $examTimetable->load(['schoolClass', 'subject', 'room', 'supervisor', 'examSession'])
        );
    }

    public function update(Request $request, ExamTimetable $examTimetable)
    {
        $schoolId = $request->user()->school_id;

        $data = $request->validate([
            'exam_session_id'    => ['sometimes', Rule::exists('exam_sessions',  'id')->where('school_id', $schoolId)],
            'class_id'           => ['sometimes', Rule::exists('classes',         'id')->where('school_id', $schoolId)],
            'subject_id'         => ['sometimes', Rule::exists('subjects',        'id')->where('school_id', $schoolId)],
            'room_id'            => ['nullable',  Rule::exists('timetable_rooms', 'id')->where('school_id', $schoolId)],
            'supervisor_user_id' => ['nullable',  Rule::exists('users',           'id')->where('school_id', $schoolId)],
            'exam_date'          => 'sometimes|date',
            'start_time'         => 'sometimes|date_format:H:i',
            'end_time'           => 'sometimes|date_format:H:i|after:start_time',
            'notes'              => 'nullable|string|max:1000',
        ]);

        $merged = array_merge($examTimetable->toArray(), $data, ['school_id' => $schoolId]);
        $this->conflicts->assertNoConflicts($merged, $examTimetable->id);

        $examTimetable->update($data);

        return response()->json(
            $examTimetable->load(['schoolClass', 'subject', 'room', 'supervisor', 'examSession'])
        );
    }

    public function destroy(ExamTimetable $examTimetable)
    {
        $examTimetable->delete();
        return response()->json(['message' => 'Exam timetable entry deleted.']);
    }

    public function restore(int $id, Request $request)
    {
        $entry = ExamTimetable::withTrashed()
            ->where('id', $id)
            ->where('school_id', $request->user()->school_id)
            ->firstOrFail();

        $merged = array_merge($entry->toArray(), ['school_id' => $entry->school_id]);
        $this->conflicts->assertNoConflicts($merged, $entry->id);

        $entry->restore();

        return response()->json($entry->load(['schoolClass', 'subject', 'room', 'supervisor', 'examSession']));
    }
}
