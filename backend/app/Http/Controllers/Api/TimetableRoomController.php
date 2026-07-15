<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TimetableRoom;
use Illuminate\Http\Request;

class TimetableRoomController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'search'    => 'nullable|string|max:100',
            'room_type' => 'nullable|string|max:50',
            'is_active' => 'nullable|boolean',
            'per_page'  => 'nullable|integer|min:1|max:100',
        ]);

        $rooms = TimetableRoom::query()
            ->when($request->search,              fn($q) => $q->where('name', 'like', "%{$request->search}%"))
            ->when($request->room_type,           fn($q) => $q->where('room_type', $request->room_type))
            ->when($request->filled('is_active'), fn($q) => $q->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN)))
            ->orderBy('name')
            ->paginate((int) ($request->per_page ?? 50));

        return response()->json($rooms);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'      => 'required|string|max:150',
            'code'      => 'nullable|string|max:50',
            'capacity'  => 'nullable|integer|min:1',
            'room_type' => 'nullable|string|max:50',
            'is_active' => 'boolean',
        ]);

        $room = TimetableRoom::create($data);

        // Observer handles 'created' audit log.

        return response()->json($room, 201);
    }

    public function show(TimetableRoom $timetableRoom)
    {
        return response()->json($timetableRoom);
    }

    public function update(Request $request, TimetableRoom $timetableRoom)
    {
        $data = $request->validate([
            'name'      => 'sometimes|string|max:150',
            'code'      => 'nullable|string|max:50',
            'capacity'  => 'nullable|integer|min:1',
            'room_type' => 'nullable|string|max:50',
            'is_active' => 'boolean',
        ]);

        $timetableRoom->update($data);

        // Observer handles 'updated' audit log.

        return response()->json($timetableRoom->fresh());
    }

    public function destroy(TimetableRoom $timetableRoom)
    {
        // Observer handles 'deleted' audit log.
        $timetableRoom->delete();

        return response()->json(['message' => 'Room deleted.']);
    }

    public function restore(int $id, Request $request)
    {
        $room = TimetableRoom::withTrashed()
            ->where('id', $id)
            ->where('school_id', $request->user()->school_id)
            ->firstOrFail();

        $room->restore();

        // Observer handles 'restored' audit log.

        return response()->json($room);
    }
}
