<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BehaviourIncident;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BehaviourReportController extends Controller
{
    public function classReport(Request $request)
    {
        $request->validate([
            'class_id'      => 'nullable|integer',
            'term'          => 'nullable|string|max:50',
            'academic_year' => 'nullable|string|max:10',
            'from_date'     => 'nullable|date',
            'to_date'       => 'nullable|date|after_or_equal:from_date',
        ]);

        $schoolId     = $request->user()->school_id;
        $classId      = $request->class_id;
        $term         = $request->term;
        $academicYear = $request->academic_year;
        $fromDate     = $request->from_date;
        $toDate       = $request->to_date;

        // SQL-level aggregation — avoids loading all incidents into PHP memory
        $rows = DB::table('behaviour_incidents as bi')
            ->join('students as s', 'bi.student_id', '=', 's.id')
            ->where('bi.school_id', $schoolId)
            ->whereNull('bi.deleted_at')
            ->when($classId,      fn($q) => $q->where('bi.class_id',     $classId))
            ->when($term,         fn($q) => $q->where('bi.term',         $term))
            ->when($academicYear, fn($q) => $q->where('bi.academic_year',$academicYear))
            ->when($fromDate,     fn($q) => $q->whereDate('bi.incident_date', '>=', $fromDate))
            ->when($toDate,       fn($q) => $q->whereDate('bi.incident_date', '<=', $toDate))
            ->select([
                's.id as student_id',
                's.first_name',
                's.last_name',
                's.grade_level',
                's.section',
                's.student_number',
                DB::raw('COUNT(*) as incident_count'),
                DB::raw('COALESCE(SUM(bi.points), 0) as total_points'),
                DB::raw('COALESCE(SUM(CASE WHEN bi.points > 0 THEN bi.points ELSE 0 END), 0) as positive_points'),
                DB::raw('COALESCE(SUM(CASE WHEN bi.points < 0 THEN bi.points ELSE 0 END), 0) as negative_points'),
            ])
            ->groupBy('bi.student_id', 's.id', 's.first_name', 's.last_name', 's.grade_level', 's.section', 's.student_number')
            ->orderBy('total_points')
            ->get()
            ->map(fn($row) => [
                'student' => [
                    'id'             => $row->student_id,
                    'first_name'     => $row->first_name,
                    'last_name'      => $row->last_name,
                    'grade_level'    => $row->grade_level,
                    'section'        => $row->section,
                    'student_number' => $row->student_number,
                ],
                'incident_count'  => (int) $row->incident_count,
                'total_points'    => (int) $row->total_points,
                'positive_points' => (int) $row->positive_points,
                'negative_points' => (int) $row->negative_points,
                'standing'        => $this->standing((int) $row->total_points),
            ]);

        return response()->json(['data' => $rows]);
    }

    public function studentReport(Request $request)
    {
        $request->validate([
            'student_id'    => 'nullable|integer',
            'term'          => 'nullable|string|max:50',
            'academic_year' => 'nullable|string|max:10',
            'from_date'     => 'nullable|date',
            'to_date'       => 'nullable|date|after_or_equal:from_date',
            'per_page'      => 'nullable|integer|min:1|max:100',
        ]);

        $schoolId = $request->user()->school_id;

        $incidents = BehaviourIncident::where('school_id', $schoolId)
            ->when($request->student_id,   fn($q) => $q->where('student_id',   $request->student_id))
            ->when($request->term,         fn($q) => $q->where('term',         $request->term))
            ->when($request->academic_year,fn($q) => $q->where('academic_year',$request->academic_year))
            ->when($request->from_date,    fn($q) => $q->whereDate('incident_date', '>=', $request->from_date))
            ->when($request->to_date,      fn($q) => $q->whereDate('incident_date', '<=', $request->to_date))
            ->with(['student', 'incidentType', 'reportedBy'])
            ->orderBy('incident_date', 'desc')
            ->paginate((int) ($request->per_page ?? 50));

        return response()->json($incidents);
    }

    public function incidentTypeReport(Request $request)
    {
        $request->validate([
            'term'          => 'nullable|string|max:50',
            'academic_year' => 'nullable|string|max:10',
            'from_date'     => 'nullable|date',
            'to_date'       => 'nullable|date|after_or_equal:from_date',
        ]);

        $schoolId = $request->user()->school_id;

        $rows = BehaviourIncident::where('behaviour_incidents.school_id', $schoolId)
            ->when($request->term,         fn($q) => $q->where('term',         $request->term))
            ->when($request->academic_year,fn($q) => $q->where('academic_year',$request->academic_year))
            ->when($request->from_date,    fn($q) => $q->whereDate('incident_date', '>=', $request->from_date))
            ->when($request->to_date,      fn($q) => $q->whereDate('incident_date', '<=', $request->to_date))
            ->join('behaviour_incident_types', 'behaviour_incidents.incident_type_id', '=', 'behaviour_incident_types.id')
            ->select(
                'behaviour_incident_types.id',
                'behaviour_incident_types.name',
                'behaviour_incident_types.category',
                'behaviour_incident_types.severity',
                DB::raw('COUNT(*) as incident_count'),
                DB::raw('SUM(behaviour_incidents.points) as total_points'),
                DB::raw('COUNT(DISTINCT behaviour_incidents.student_id) as affected_students')
            )
            ->groupBy(
                'behaviour_incident_types.id',
                'behaviour_incident_types.name',
                'behaviour_incident_types.category',
                'behaviour_incident_types.severity',
            )
            ->orderByDesc('incident_count')
            ->get();

        return response()->json(['data' => $rows]);
    }

    private function standing(int $points): string
    {
        if ($points >= 50)  return 'Excellent';
        if ($points >= 10)  return 'Good';
        if ($points >= -20) return 'Watchlist';
        return 'Critical';
    }
}
