<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IncomeCategory;
use Illuminate\Http\Request;

class IncomeCategoryController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'search'    => 'nullable|string|max:100',
            'is_active' => 'nullable|boolean',
            'per_page'  => 'nullable|integer|min:1|max:100',
        ]);

        $categories = IncomeCategory::query()
            ->when($request->search,              fn($q) => $q->where('name', 'like', "%{$request->search}%"))
            ->when($request->filled('is_active'), fn($q) => $q->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN)))
            ->orderBy('name')
            ->paginate((int) ($request->per_page ?? 50));

        return response()->json($categories);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'        => 'required|string|max:150',
            'code'        => 'nullable|string|max:50',
            'description' => 'nullable|string',
            'is_active'   => 'boolean',
        ]);

        return response()->json(IncomeCategory::create($data), 201);
    }

    public function show(IncomeCategory $incomeCategory)
    {
        return response()->json($incomeCategory);
    }

    public function update(Request $request, IncomeCategory $incomeCategory)
    {
        $data = $request->validate([
            'name'        => 'sometimes|string|max:150',
            'code'        => 'nullable|string|max:50',
            'description' => 'nullable|string',
            'is_active'   => 'boolean',
        ]);

        $incomeCategory->update($data);

        return response()->json($incomeCategory->fresh());
    }

    public function destroy(IncomeCategory $incomeCategory)
    {
        $incomeCategory->delete();

        return response()->json(['message' => 'Income category deleted.']);
    }

    public function restore(int $id, Request $request)
    {
        $category = IncomeCategory::withTrashed()
            ->where('id', $id)
            ->where('school_id', $request->user()->school_id)
            ->firstOrFail();

        $category->restore();

        return response()->json($category);
    }
}
