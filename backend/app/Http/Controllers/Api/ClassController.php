<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SchoolClass;
use App\Models\Subject;
use Illuminate\Http\Request;

class ClassController extends Controller
{
    public function index(Request $request)
    {
        $classes = SchoolClass::where('school_id', $request->user()->school_id)
            ->orderBy('grade_level')
            ->orderBy('section')
            ->get(['id', 'name', 'grade_level', 'section']);

        return response()->json($classes);
    }

    public function subjects(Request $request, SchoolClass $class)
    {
        abort_if($class->school_id !== $request->user()->school_id, 403);

        $subjects = Subject::where('school_id', $request->user()->school_id)
            ->where('grade_level', $class->grade_level)
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        return response()->json($subjects);
    }
}
