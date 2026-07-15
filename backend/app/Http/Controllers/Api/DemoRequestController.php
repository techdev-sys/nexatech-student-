<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DemoRequest;
use Illuminate\Http\Request;

class DemoRequestController extends Controller
{
    private const ACCESS_CODE = 'NEXATECH-DEMO';

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'institution' => 'required|string|max:255',
            'email'       => 'required|email|max:255',
            'phone'       => 'nullable|string|max:40',
            'role'        => 'nullable|string|max:120',
            'country'     => 'nullable|string|max:120',
        ]);

        $demoRequest = DemoRequest::create($data + ['status' => 'pending']);

        return response()->json([
            'message' => 'Demo request received.',
            'request' => $this->shape($demoRequest),
        ], 201);
    }

    public function index(Request $request)
    {
        $status = $request->query('status');

        $requests = DemoRequest::query()
            ->when($status, fn ($q) => $q->where('status', $status))
            ->with('reviewer:id,name,email')
            ->orderByDesc('created_at')
            ->paginate((int) $request->query('per_page', 30));

        return response()->json($requests->through(fn ($demoRequest) => $this->shape($demoRequest)));
    }

    public function approve(Request $request, DemoRequest $demoRequest)
    {
        $data = $request->validate([
            'review_notes' => 'nullable|string|max:1000',
        ]);

        $demoRequest->update([
            'status'       => 'approved',
            'access_code'  => self::ACCESS_CODE,
            'reviewed_by'  => $request->user()->id,
            'reviewed_at'  => now(),
            'review_notes' => $data['review_notes'] ?? null,
        ]);

        return response()->json(['request' => $this->shape($demoRequest->fresh('reviewer'))]);
    }

    public function reject(Request $request, DemoRequest $demoRequest)
    {
        $data = $request->validate([
            'review_notes' => 'nullable|string|max:1000',
        ]);

        $demoRequest->update([
            'status'       => 'rejected',
            'access_code'  => null,
            'reviewed_by'  => $request->user()->id,
            'reviewed_at'  => now(),
            'review_notes' => $data['review_notes'] ?? null,
        ]);

        return response()->json(['request' => $this->shape($demoRequest->fresh('reviewer'))]);
    }

    private function shape(DemoRequest $demoRequest): array
    {
        return [
            'id'          => $demoRequest->id,
            'name'        => $demoRequest->name,
            'institution' => $demoRequest->institution,
            'email'       => $demoRequest->email,
            'phone'       => $demoRequest->phone,
            'role'        => $demoRequest->role,
            'country'     => $demoRequest->country,
            'status'      => $demoRequest->status,
            'access_code' => $demoRequest->access_code,
            'reviewer'    => $demoRequest->reviewer?->only(['id', 'name', 'email']),
            'reviewed_at' => $demoRequest->reviewed_at?->toDateTimeString(),
            'review_notes'=> $demoRequest->review_notes,
            'created_at'  => $demoRequest->created_at?->toDateTimeString(),
        ];
    }
}
