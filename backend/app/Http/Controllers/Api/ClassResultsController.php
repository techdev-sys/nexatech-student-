<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SchoolClass;
use App\Services\AcademicResultService;
use Illuminate\Http\Request;

class ClassResultsController extends Controller
{
    public function __construct(private AcademicResultService $resultService) {}

    public function index(Request $request)
    {
        $request->validate([
            'class_id'      => 'required|integer',
            'term'          => 'required|integer|between:1,3',
            'academic_year' => 'required|string|max:9',
        ]);

        $schoolId = $request->user()->school_id;

        $class = SchoolClass::withoutGlobalScope('tenant')
            ->where('id', $request->class_id)
            ->where('school_id', $schoolId)
            ->firstOrFail();

        $results = $this->resultService->classResults(
            $schoolId,
            $class->id,
            (int) $request->term,
            $request->academic_year
        );

        return response()->json([
            'class'         => ['id' => $class->id, 'name' => $class->name],
            'term'          => (int) $request->term,
            'academic_year' => $request->academic_year,
            'results'       => $results,
        ]);
    }
}
