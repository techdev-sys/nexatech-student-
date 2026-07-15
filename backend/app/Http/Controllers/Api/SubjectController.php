<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Subject;
use Illuminate\Http\Request;

class SubjectController extends Controller
{
    public function index()
    {
        return response()->json(Subject::orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'        => 'required|string|max:100',
            'code'        => 'nullable|string|max:20',
            'grade_level' => 'nullable|string|max:50',
            'description' => 'nullable|string',
        ]);

        $subject = Subject::create($data);

        return response()->json($subject, 201);
    }

    public function show(Subject $subject)
    {
        return response()->json($subject);
    }

    public function update(Request $request, Subject $subject)
    {
        $data = $request->validate([
            'name'        => 'sometimes|string|max:100',
            'code'        => 'nullable|string|max:20',
            'grade_level' => 'nullable|string|max:50',
            'description' => 'nullable|string',
        ]);

        $subject->update($data);

        return response()->json($subject);
    }

    public function destroy(Subject $subject)
    {
        $subject->delete();

        return response()->json(['message' => 'Subject deleted.']);
    }
}
