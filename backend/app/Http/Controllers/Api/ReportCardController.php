<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Services\ActivityLogger;
use App\Services\PortalAccessService;
use App\Services\ReportCardService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

class ReportCardController extends Controller
{
    public function __construct(
        private ReportCardService   $service,
        private PortalAccessService $access,
    ) {}

    public function show(Request $request, int $studentId)
    {
        $request->validate([
            'term'          => 'required|integer|between:1,3',
            'academic_year' => 'required|string|max:9',
        ]);

        $schoolId = $request->user()->school_id;
        $this->authorizeStudentAccess($request, $studentId, $schoolId);

        $data = $this->service->compile(
            $studentId,
            (int) $request->term,
            $request->academic_year,
            $schoolId
        );

        return response()->json($data);
    }

    public function pdf(Request $request, int $studentId)
    {
        $request->validate([
            'term'          => 'required|integer|between:1,3',
            'academic_year' => 'required|string|max:9',
        ]);

        $schoolId = $request->user()->school_id;
        $this->authorizeStudentAccess($request, $studentId, $schoolId);

        $data = $this->service->compile(
            $studentId,
            (int) $request->term,
            $request->academic_year,
            $schoolId
        );

        ActivityLogger::logRaw('report_card_generated', Student::class, $studentId, [
            'term'          => $data['term'],
            'academic_year' => $data['academic_year'],
            'student_name'  => $data['student']['name'],
        ]);

        $pdf = Pdf::loadView('pdf.report_card', compact('data'))
            ->setPaper('a4', 'portrait');

        $filename = sprintf(
            'report_card_%s_term%s_%s.pdf',
            str_replace(' ', '_', strtolower($data['student']['name'])),
            $data['term'],
            $data['academic_year']
        );

        return $pdf->download($filename);
    }

    // ── Authorization ─────────────────────────────────────────────────────────

    private function authorizeStudentAccess(Request $request, int $studentId, ?int $schoolId): void
    {
        $user = $request->user();

        // Platform admins have no school_id — fail closed
        abort_if(!$schoolId, 403, 'No school context.');

        $student = Student::withoutGlobalScope('tenant')
            ->where('id', $studentId)
            ->where('school_id', $schoolId)
            ->firstOrFail();

        // Admin/teacher: access any student in their school (already scoped by school_id above)
        if (in_array($user->role, ['admin', 'super_admin', 'teacher'])) {
            return;
        }

        // Parent: only their linked child (pivot-first, legacy fallback)
        if ($user->role === 'parent') {
            abort_unless($this->access->isParentOf($user, $student), 403, 'Access denied to this student record.');
            return;
        }

        abort(403, 'Unauthorized.');
    }
}
