<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TimetablePeriod;
use Illuminate\Http\Request;

class TimetablePeriodController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'search'    => 'nullable|string|max:100',
            'is_active' => 'nullable|boolean',
            'per_page'  => 'nullable|integer|min:1|max:100',
        ]);

        $periods = TimetablePeriod::query()
            ->when($request->search,              fn($q) => $q->where('name', 'like', "%{$request->search}%"))
            ->when($request->filled('is_active'), fn($q) => $q->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN)))
            ->orderBy('sort_order')
            ->orderBy('starts_at')
            ->paginate((int) ($request->per_page ?? 50));

        return response()->json($periods);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'       => 'required|string|max:150',
            'starts_at'  => 'required|date_format:H:i',
            'ends_at'    => 'required|date_format:H:i|after:starts_at',
            'sort_order' => 'nullable|integer|min:0',
            'is_break'   => 'boolean',
            'is_active'  => 'boolean',
        ]);

        $period = TimetablePeriod::create($data);

        // Observer handles 'created' audit log.

        return response()->json($period, 201);
    }

    public function show(TimetablePeriod $timetablePeriod)
    {
        return response()->json($timetablePeriod);
    }

    public function update(Request $request, TimetablePeriod $timetablePeriod)
    {
        $data = $request->validate([
            'name'       => 'sometimes|string|max:150',
            'starts_at'  => 'sometimes|date_format:H:i',
            'ends_at'    => 'sometimes|date_format:H:i',
            'sort_order' => 'nullable|integer|min:0',
            'is_break'   => 'boolean',
            'is_active'  => 'boolean',
        ]);

        // Ensure end stays after start when either is supplied
        $start = $data['starts_at'] ?? $timetablePeriod->starts_at;
        $end   = $data['ends_at']   ?? $timetablePeriod->ends_at;
        if (strtotime($end) <= strtotime($start)) {
            abort(422, 'The end time must be after the start time.');
        }

        $timetablePeriod->update($data);

        // Observer handles 'updated' audit log.

        return response()->json($timetablePeriod->fresh());
    }

    public function destroy(TimetablePeriod $timetablePeriod)
    {
        // Observer handles 'deleted' audit log.
        $timetablePeriod->delete();

        return response()->json(['message' => 'Period deleted.']);
    }

    public function restore(int $id, Request $request)
    {
        $period = TimetablePeriod::withTrashed()
            ->where('id', $id)
            ->where('school_id', $request->user()->school_id)
            ->firstOrFail();

        $period->restore();

        // Observer handles 'restored' audit log.

        return response()->json($period);
    }
}
