<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GradeBoundary;
use App\Models\GradingSystem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GradingSystemController extends Controller
{
    public function index(Request $request)
    {
        $systems = GradingSystem::with('boundaries')
            ->where('school_id', $request->user()->school_id)
            ->get();

        return response()->json($systems);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'                          => 'required|string|max:100',
            'is_default'                    => 'boolean',
            'boundaries'                    => 'required|array|min:1',
            'boundaries.*.letter_grade'     => 'required|string|max:5',
            'boundaries.*.label'            => 'required|string|max:50',
            'boundaries.*.min_score'        => 'required|numeric|min:0|max:100',
            'boundaries.*.max_score'        => 'required|numeric|min:0|max:100',
            'boundaries.*.is_pass'          => 'boolean',
            'boundaries.*.points'           => 'nullable|integer|min:1',
        ]);

        $system = DB::transaction(function () use ($data, $request) {
            if (!empty($data['is_default'])) {
                GradingSystem::where('school_id', $request->user()->school_id)
                    ->update(['is_default' => false]);
            }

            $system = GradingSystem::create([
                'school_id'  => $request->user()->school_id,
                'name'       => $data['name'],
                'is_default' => $data['is_default'] ?? false,
            ]);

            foreach ($data['boundaries'] as $b) {
                $system->boundaries()->create($b);
            }

            return $system->load('boundaries');
        });

        return response()->json($system, 201);
    }

    public function show(GradingSystem $gradingSystem)
    {
        return response()->json($gradingSystem->load('boundaries'));
    }

    public function update(Request $request, GradingSystem $gradingSystem)
    {
        $data = $request->validate([
            'name'       => 'sometimes|string|max:100',
            'is_default' => 'boolean',
        ]);

        DB::transaction(function () use ($data, $gradingSystem, $request) {
            if (!empty($data['is_default'])) {
                GradingSystem::where('school_id', $request->user()->school_id)
                    ->where('id', '!=', $gradingSystem->id)
                    ->update(['is_default' => false]);
            }
            $gradingSystem->update($data);
        });

        return response()->json($gradingSystem->load('boundaries'));
    }

    public function destroy(GradingSystem $gradingSystem)
    {
        $gradingSystem->delete();
        return response()->json(['message' => 'Grading system deleted.']);
    }

    // ── Boundary sub-resource ─────────────────────────────────────────────────

    public function storeBoundary(Request $request, GradingSystem $gradingSystem)
    {
        $data = $request->validate([
            'letter_grade' => 'required|string|max:5',
            'label'        => 'required|string|max:50',
            'min_score'    => 'required|numeric|min:0|max:100',
            'max_score'    => 'required|numeric|min:0|max:100',
            'is_pass'      => 'boolean',
            'points'       => 'nullable|integer|min:1',
        ]);

        $boundary = $gradingSystem->boundaries()->create($data);
        return response()->json($boundary, 201);
    }

    public function updateBoundary(Request $request, GradingSystem $gradingSystem, GradeBoundary $boundary)
    {
        // Verify the boundary belongs to this grading system (prevents ID-swapping attacks)
        abort_if($boundary->grading_system_id !== $gradingSystem->id, 403);

        $data = $request->validate([
            'letter_grade' => 'string|max:5',
            'label'        => 'string|max:50',
            'min_score'    => 'numeric|min:0|max:100',
            'max_score'    => 'numeric|min:0|max:100',
            'is_pass'      => 'boolean',
            'points'       => 'nullable|integer|min:1',
        ]);

        $boundary->update($data);
        return response()->json($boundary);
    }

    public function destroyBoundary(GradingSystem $gradingSystem, GradeBoundary $boundary)
    {
        abort_if($boundary->grading_system_id !== $gradingSystem->id, 403);
        $boundary->delete();
        return response()->json(['message' => 'Boundary deleted.']);
    }
}
