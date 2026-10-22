<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\DemoAccessCodeMail;
use App\Mail\DemoRequestReceivedMail;
use App\Models\DemoRequest;
use App\Models\School;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class DemoRequestController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'institution' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'nullable|string|max:40',
            'role' => 'nullable|string|max:120',
            'country' => 'nullable|string|max:120',
        ]);
        $data['email'] = Str::lower($data['email']);

        $demoRequest = DemoRequest::create($data + ['status' => 'pending']);

        $notificationRecipients = collect(preg_split(
            '/[,;]/',
            (string) config('demo.request_notification_email'),
            -1,
            PREG_SPLIT_NO_EMPTY,
        ))
            ->map(fn (string $email) => trim($email))
            ->filter(fn (string $email) => filter_var($email, FILTER_VALIDATE_EMAIL))
            ->unique();

        if ($notificationRecipients->isEmpty()) {
            $notificationRecipients = User::query()
                ->where('role', 'platform_admin')
                ->pluck('email')
                ->filter(fn (string $email) => filter_var($email, FILTER_VALIDATE_EMAIL))
                ->unique();
        }

        foreach ($notificationRecipients as $recipient) {
            Mail::to($recipient)->queue(new DemoRequestReceivedMail($demoRequest));
        }

        return response()->json([
            'message' => 'Demo request received.',
            'request' => $this->shape($demoRequest),
        ], 201);
    }

    public function redeem(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email|max:255',
            'access_code' => 'required|string|min:12|max:80',
            'role' => ['required', Rule::in(config('demo.roles'))],
        ]);

        $result = DB::transaction(function () use ($data) {
            $demoRequest = DemoRequest::query()
                ->where('email', Str::lower($data['email']))
                ->where('access_code_hash', DemoRequest::hashAccessCode($data['access_code']))
                ->lockForUpdate()
                ->first();

            if (! $demoRequest || $demoRequest->status !== 'approved') {
                throw ValidationException::withMessages([
                    'access_code' => ['The demo access details are invalid.'],
                ]);
            }

            if ($demoRequest->redeemed_at) {
                throw ValidationException::withMessages([
                    'access_code' => ['This demo access code has already been used.'],
                ]);
            }

            if (! $demoRequest->access_code_expires_at || $demoRequest->access_code_expires_at->isPast()) {
                throw ValidationException::withMessages([
                    'access_code' => ['This demo access code has expired.'],
                ]);
            }

            $school = School::query()
                ->where('is_demo', true)
                ->where('is_active', true)
                ->where('email', config('demo.school_email'))
                ->first();

            $user = $school
                ? User::query()
                    ->where('school_id', $school->id)
                    ->where('is_demo', true)
                    ->where('role', $data['role'])
                    ->first()
                : null;

            if (! $user) {
                abort(503, 'The demo environment is not available.');
            }

            $expiresAt = now()->addMinutes(config('demo.session_lifetime_minutes'));
            $token = $user->createToken('demo-session', ['demo:read'], $expiresAt)->plainTextToken;

            $demoRequest->update([
                'redeemed_at' => now(),
                'redeemed_by_user_id' => $user->id,
            ]);

            return compact('user', 'token', 'expiresAt');
        });

        return response()->json([
            'user' => $result['user']->load('school'),
            'expires_at' => $result['expiresAt']->toIso8601String(),
        ])->cookie(
            config('auth_cookie.name'),
            $result['token'],
            config('demo.session_lifetime_minutes'),
            '/',
            config('auth_cookie.domain'),
            config('auth_cookie.secure'),
            true,
            false,
            config('auth_cookie.same_site'),
        );
    }

    public function index(Request $request)
    {
        $status = $request->query('status');

        $requests = DemoRequest::query()
            ->when($status, fn ($query) => $query->where('status', $status))
            ->with('reviewer:id,name,email')
            ->orderByDesc('created_at')
            ->paginate(min((int) $request->query('per_page', 30), 100));

        return response()->json($requests->through(fn ($demoRequest) => $this->shape($demoRequest)));
    }

    public function approve(Request $request, DemoRequest $demoRequest)
    {
        $data = $request->validate([
            'review_notes' => 'nullable|string|max:1000',
        ]);

        if ($demoRequest->status !== 'pending') {
            return response()->json(['message' => 'This request has already been reviewed.'], 409);
        }

        $plainCode = strtoupper(Str::random(8)).'-'.strtoupper(Str::random(8));
        $expiresAt = now()->addMinutes(config('demo.access_code_lifetime_minutes'));

        $demoRequest->update([
            'status' => 'approved',
            'access_code' => null,
            'access_code_hash' => DemoRequest::hashAccessCode($plainCode),
            'access_code_expires_at' => $expiresAt,
            'redeemed_at' => null,
            'redeemed_by_user_id' => null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'review_notes' => $data['review_notes'] ?? null,
        ]);

        Mail::to($demoRequest->email)->queue(
            new DemoAccessCodeMail($demoRequest, $plainCode, $expiresAt)
        );

        return response()->json([
            'message' => 'Approved. A single-use access code has been queued for email delivery.',
            'request' => $this->shape($demoRequest->fresh('reviewer')),
        ]);
    }

    public function reject(Request $request, DemoRequest $demoRequest)
    {
        $data = $request->validate([
            'review_notes' => 'nullable|string|max:1000',
        ]);

        $demoRequest->update([
            'status' => 'rejected',
            'access_code' => null,
            'access_code_hash' => null,
            'access_code_expires_at' => null,
            'redeemed_at' => null,
            'redeemed_by_user_id' => null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'review_notes' => $data['review_notes'] ?? null,
        ]);

        return response()->json(['request' => $this->shape($demoRequest->fresh('reviewer'))]);
    }

    private function shape(DemoRequest $demoRequest): array
    {
        return [
            'id' => $demoRequest->id,
            'name' => $demoRequest->name,
            'institution' => $demoRequest->institution,
            'email' => $demoRequest->email,
            'phone' => $demoRequest->phone,
            'role' => $demoRequest->role,
            'country' => $demoRequest->country,
            'status' => $demoRequest->status,
            'access_code_expires_at' => $demoRequest->access_code_expires_at?->toIso8601String(),
            'redeemed_at' => $demoRequest->redeemed_at?->toIso8601String(),
            'reviewer' => $demoRequest->reviewer?->only(['id', 'name', 'email']),
            'reviewed_at' => $demoRequest->reviewed_at?->toDateTimeString(),
            'review_notes' => $demoRequest->review_notes,
            'created_at' => $demoRequest->created_at?->toDateTimeString(),
        ];
    }
}
