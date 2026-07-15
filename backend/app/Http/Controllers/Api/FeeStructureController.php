<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FeeStructure;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FeeStructureController extends Controller
{
    public function index(Request $request)
    {
        $fees = FeeStructure::with('schoolClass')
            ->when($request->academic_year, fn($q) => $q->where('academic_year', $request->academic_year))
            ->when($request->term,          fn($q) => $q->where('term',          $request->term))
            ->when($request->currency,      fn($q) => $q->where('currency',      $request->currency))
            ->orderBy('academic_year', 'desc')
            ->orderBy('term')
            ->get();

        return response()->json($fees);
    }

    public function store(Request $request)
    {
        $schoolId = $request->user()->school_id;

        $data = $request->validate([
            'title'         => 'required|string|max:150',
            'academic_year' => 'required|string|max:10',
            'term'          => 'required|integer|in:1,2,3',
            'amount'        => 'required|numeric|min:0',
            'currency'      => 'required|in:USD,ZAR,ZiG',
            'class_id'      => ['nullable', Rule::exists('classes', 'id')->where('school_id', $schoolId)],
        ]);

        return response()->json(FeeStructure::create($data), 201);
    }

    public function show(FeeStructure $feeStructure)
    {
        return response()->json($feeStructure->load('schoolClass'));
    }

    public function update(Request $request, FeeStructure $feeStructure)
    {
        $schoolId = $request->user()->school_id;

        $data = $request->validate([
            'title'         => 'sometimes|string|max:150',
            'academic_year' => 'sometimes|string|max:10',
            'term'          => 'sometimes|integer|in:1,2,3',
            'amount'        => 'sometimes|numeric|min:0',
            'currency'      => 'sometimes|in:USD,ZAR,ZiG',
            'class_id'      => ['nullable', Rule::exists('classes', 'id')->where('school_id', $schoolId)],
        ]);

        $feeStructure->update($data);

        return response()->json($feeStructure);
    }

    public function destroy(FeeStructure $feeStructure)
    {
        $feeStructure->delete(); // soft delete
        return response()->json(['message' => 'Fee structure deleted.']);
    }

    public function restore(int $id, Request $request)
    {
        $fee = FeeStructure::withTrashed()
            ->where('id', $id)
            ->where('school_id', $request->user()->school_id)
            ->firstOrFail();

        $fee->restore();

        return response()->json($fee);
    }
}
