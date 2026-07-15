<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BehaviourIncidentType;
use Illuminate\Http\Request;

class BehaviourIncidentTypeController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'search'    => 'nullable|string|max:100',
            'category'  => 'nullable|in:positive,negative,neutral',
            'severity'  => 'nullable|in:low,medium,high,critical',
            'is_active' => 'nullable|boolean',
            'per_page'  => 'nullable|integer|min:1|max:100',
        ]);

        $types = BehaviourIncidentType::query()
            ->when($request->search,              fn($q) => $q->where('name', 'like', "%{$request->search}%"))
            ->when($request->category,            fn($q) => $q->where('category', $request->category))
            ->when($request->severity,            fn($q) => $q->where('severity', $request->severity))
            ->when($request->filled('is_active'), fn($q) => $q->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN)))
            ->orderBy('category')
            ->orderBy('name')
            ->paginate((int) ($request->per_page ?? 50));

        return response()->json($types);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'           => 'required|string|max:150',
            'description'    => 'nullable|string',
            'default_points' => 'required|integer',
            'severity'       => 'required|in:low,medium,high,critical',
            'category'       => 'required|in:positive,negative,neutral',
            'notify_parent'  => 'boolean',
            'is_active'      => 'boolean',
        ]);

        $type = BehaviourIncidentType::create($data);

        // Observer handles audit 'created' log.

        return response()->json($type, 201);
    }

    public function show(BehaviourIncidentType $behaviourIncidentType)
    {
        return response()->json($behaviourIncidentType);
    }

    public function update(Request $request, BehaviourIncidentType $behaviourIncidentType)
    {
        $data = $request->validate([
            'name'           => 'sometimes|string|max:150',
            'description'    => 'nullable|string',
            'default_points' => 'sometimes|integer',
            'severity'       => 'sometimes|in:low,medium,high,critical',
            'category'       => 'sometimes|in:positive,negative,neutral',
            'notify_parent'  => 'boolean',
            'is_active'      => 'boolean',
        ]);

        $behaviourIncidentType->update($data);

        // Observer handles audit 'updated' log.

        return response()->json($behaviourIncidentType->fresh());
    }

    public function destroy(BehaviourIncidentType $behaviourIncidentType)
    {
        // Observer handles audit 'deleted' log.
        $behaviourIncidentType->delete();

        return response()->json(['message' => 'Incident type deleted.']);
    }

    public function restore(int $id, Request $request)
    {
        $type = BehaviourIncidentType::withTrashed()
            ->where('id', $id)
            ->where('school_id', $request->user()->school_id)
            ->firstOrFail();

        $type->restore();

        // Observer handles audit 'restored' log.

        return response()->json($type);
    }
}
