<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TimetableEntry;
use App\Services\TimetableBuilderService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TimetableEntryController extends Controller
{
    private const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    private const EAGER = ['schoolClass', 'subject', 'teacher', 'room', 'period'];

    public function __construct(private TimetableBuilderService $builder) {}

    public function index(Request $request)
    {
        $request->validate([
            'class_id'        => 'nullable|integer',
            'subject_id'      => 'nullable|integer',
            'teacher_user_id' => 'nullable|integer',
            'room_id'         => 'nullable|integer',
            'period_id'       => 'nullable|integer',
            'day_of_week'     => ['nullable', Rule::in(self::DAYS)],
            'term'            => 'nullable|string|max:50',
            'academic_year'   => 'nullable|string|max:9',
            'status'          => 'nullable|in:draft,active,cancelled',
            'per_page'        => 'nullable|integer|min:1|max:100',
        ]);

        $entries = TimetableEntry::with(self::EAGER)
            ->when($request->class_id,        fn($q) => $q->where('class_id', $request->class_id))
            ->when($request->subject_id,      fn($q) => $q->where('subject_id', $request->subject_id))
            ->when($request->teacher_user_id, fn($q) => $q->where('teacher_user_id', $request->teacher_user_id))
            ->when($request->room_id,         fn($q) => $q->where('room_id', $request->room_id))
            ->when($request->period_id,       fn($q) => $q->where('period_id', $request->period_id))
            ->when($request->day_of_week,     fn($q) => $q->where('day_of_week', $request->day_of_week))
            ->when($request->term,            fn($q) => $q->where('term', $request->term))
            ->when($request->academic_year,   fn($q) => $q->where('academic_year', $request->academic_year))
            ->when($request->status,          fn($q) => $q->where('status', $request->status))
            ->orderBy('day_of_week')
            ->orderBy('period_id')
            ->paginate((int) ($request->per_page ?? 50));

        return response()->json($entries);
    }

    public function store(Request $request)
    {
        $data = $this->validatePayload($request);
        $data['school_id'] = $request->user()->school_id;
        $data['status']    = $data['status'] ?? 'active';

        $entry = $this->builder->create($data);

        return response()->json($entry->load(self::EAGER), 201);
    }

    public function show(TimetableEntry $timetableEntry)
    {
        return response()->json($timetableEntry->load(self::EAGER));
    }

    public function update(Request $request, TimetableEntry $timetableEntry)
    {
        $data = $this->validatePayload($request, partial: true);

        $entry = $this->builder->update($timetableEntry, $data);

        return response()->json($entry->load(self::EAGER));
    }

    public function destroy(TimetableEntry $timetableEntry)
    {
        $this->builder->delete($timetableEntry);

        return response()->json(['message' => 'Timetable entry deleted.']);
    }

    public function restore(int $id, Request $request)
    {
        // Tenant-scoped lookup of the trashed record.
        $entry = TimetableEntry::withTrashed()
            ->where('id', $id)
            ->where('school_id', $request->user()->school_id)
            ->firstOrFail();

        $entry = $this->builder->restore($entry);

        return response()->json($entry->load(self::EAGER));
    }

    /**
     * Tenant-scoped foreign-key validation. Every FK must belong to the caller's school;
     * teacher_user_id must additionally be a user with the teacher role.
     */
    private function validatePayload(Request $request, bool $partial = false): array
    {
        $schoolId = $request->user()->school_id;
        // On update, fields are optional ('sometimes'); on create they are 'required'.
        $lead = $partial ? ['sometimes'] : ['required'];

        return $request->validate([
            'class_id'        => [...$lead, Rule::exists('classes', 'id')->where('school_id', $schoolId)],
            'subject_id'      => [...$lead, Rule::exists('subjects', 'id')->where('school_id', $schoolId)],
            'teacher_user_id' => [...$lead, Rule::exists('users', 'id')->where('school_id', $schoolId)->where('role', 'teacher')],
            'room_id'         => ['nullable', Rule::exists('timetable_rooms', 'id')->where('school_id', $schoolId)],
            'period_id'       => [...$lead, Rule::exists('timetable_periods', 'id')->where('school_id', $schoolId)],
            'day_of_week'     => [...$lead, Rule::in(self::DAYS)],
            'academic_year'   => [...$lead, 'string', 'max:9'],
            'term'            => [...$lead, 'string', 'max:50'],
            'status'          => 'nullable|in:draft,active,cancelled',
            'notes'           => 'nullable|string|max:1000',
        ]);
    }
}
