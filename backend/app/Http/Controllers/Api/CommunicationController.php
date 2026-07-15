<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Communication;
use App\Models\CommunicationDelivery;
use App\Services\ActivityLogger;
use App\Services\CommunicationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CommunicationController extends Controller
{
    public function __construct(private CommunicationService $commService) {}

    public function index(Request $request)
    {
        $request->validate([
            'channel'      => 'nullable|in:sms,email',
            'status'       => 'nullable|in:draft,scheduled,queued,processing,completed,failed,cancelled',
            'audience_type'=> 'nullable|in:all,parents,teachers,staff,class,grade,custom',
            'from_date'    => 'nullable|date',
            'to_date'      => 'nullable|date|after_or_equal:from_date',
            'search'       => 'nullable|string|max:100',
            'per_page'     => 'nullable|integer|min:1|max:100',
        ]);

        $communications = Communication::with(['createdBy', 'template'])
            ->whereNotIn('channel', ['announcement'])
            ->when($request->channel,       fn($q) => $q->where('channel',       $request->channel))
            ->when($request->status,        fn($q) => $q->where('status',        $request->status))
            ->when($request->audience_type, fn($q) => $q->where('audience_type', $request->audience_type))
            ->when($request->from_date,     fn($q) => $q->whereDate('created_at', '>=', $request->from_date))
            ->when($request->to_date,       fn($q) => $q->whereDate('created_at', '<=', $request->to_date))
            ->when($request->search, fn($q) => $q->where(function ($sub) use ($request) {
                $sub->where('subject', 'like', "%{$request->search}%")
                    ->orWhere('body',   'like', "%{$request->search}%");
            }))
            ->orderBy('created_at', 'desc')
            ->paginate((int) ($request->per_page ?? 20));

        return response()->json($communications);
    }

    public function dashboard(Request $request)
    {
        $schoolId = $request->user()->school_id;
        $today    = now()->toDateString();

        $smsSentToday = DB::table('communications')
            ->where('school_id', $schoolId)
            ->where('channel', 'sms')
            ->whereDate('sent_at', $today)
            ->whereNull('deleted_at')
            ->count();

        $emailSentToday = DB::table('communications')
            ->where('school_id', $schoolId)
            ->where('channel', 'email')
            ->whereDate('sent_at', $today)
            ->whereNull('deleted_at')
            ->count();

        $now = now();
        $activeAnnouncements = DB::table('communications')
            ->where('school_id', $schoolId)
            ->where('channel', 'announcement')
            ->where('status', 'completed')
            ->whereNull('deleted_at')
            ->where(fn($q) => $q->whereNull('published_at')->orWhere('published_at', '<=', $now))
            ->where(fn($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', $now))
            ->count();

        $deliveryStats = DB::table('communications')
            ->where('school_id', $schoolId)
            ->whereIn('status', ['completed', 'failed'])
            ->whereNull('deleted_at')
            ->selectRaw('COALESCE(SUM(successful_deliveries), 0) as total_successful, COALESCE(SUM(failed_deliveries), 0) as total_failed')
            ->first();

        $totalSent   = ($deliveryStats->total_successful ?? 0) + ($deliveryStats->total_failed ?? 0);
        $successRate = $totalSent > 0 ? round(($deliveryStats->total_successful / $totalSent) * 100) : 0;

        $deliveryBreakdown = DB::table('communication_deliveries')
            ->where('school_id', $schoolId)
            ->selectRaw('delivery_status, COUNT(*) as count')
            ->groupBy('delivery_status')
            ->get()
            ->pluck('count', 'delivery_status');

        $volumeByDay = DB::table('communications')
            ->where('school_id', $schoolId)
            ->whereNotNull('sent_at')
            ->whereNull('deleted_at')
            ->where('sent_at', '>=', now()->subDays(7))
            ->selectRaw('DATE(sent_at) as date, channel, COUNT(*) as count')
            ->groupByRaw('DATE(sent_at), channel')
            ->orderBy('date')
            ->get();

        $recentCommunications = Communication::with('createdBy')
            ->whereNotIn('channel', ['announcement'])
            ->orderBy('created_at', 'desc')
            ->limit(8)
            ->get();

        return response()->json([
            'sms_sent_today'        => $smsSentToday,
            'emails_sent_today'     => $emailSentToday,
            'active_announcements'  => $activeAnnouncements,
            'failed_deliveries'     => (int) ($deliveryStats->total_failed ?? 0),
            'success_rate'          => $successRate,
            'delivery_breakdown'    => $deliveryBreakdown,
            'volume_by_day'         => $volumeByDay,
            'recent_communications' => $recentCommunications,
        ]);
    }

    public function store(Request $request)
    {
        $schoolId = $request->user()->school_id;

        $data = $request->validate([
            'channel'                    => 'required|in:sms,email',
            'audience_type'              => 'required|in:all,parents,teachers,staff,class,grade,custom',
            'audience_filter'            => 'nullable|array',
            'audience_filter.class_id'   => ['nullable', 'integer', Rule::exists('classes', 'id')->where('school_id', $schoolId)],
            'audience_filter.grade_level'=> 'nullable|string|max:50',
            'audience_filter.user_ids'   => 'nullable|array',
            'subject'                    => 'nullable|string|max:255',
            'body'                       => 'required|string|max:3000',
            'template_id'                => ['nullable', Rule::exists('communication_templates', 'id')->where('school_id', $schoolId)],
            'scheduled_at'               => 'nullable|date|after:now',
        ]);

        $comm = Communication::create([
            'school_id'           => $schoolId,
            'created_by_user_id'  => $request->user()->id,
            'template_id'         => $data['template_id'] ?? null,
            'channel'             => $data['channel'],
            'audience_type'       => $data['audience_type'],
            'audience_filter_json'=> $data['audience_filter'] ?? null,
            'subject'             => $data['subject'] ?? null,
            'body'                => $data['body'],
            'scheduled_at'        => $data['scheduled_at'] ?? null,
            'status'              => isset($data['scheduled_at']) ? 'scheduled' : 'draft',
        ]);

        // Observer handles 'created' audit log.

        return response()->json($comm->load('createdBy'), 201);
    }

    public function show(Communication $communication)
    {
        return response()->json($communication->load(['createdBy', 'template']));
    }

    public function send(Request $request, Communication $communication)
    {
        abort_if(
            $communication->school_id !== $request->user()->school_id,
            403,
            'Communication does not belong to your school.'
        );

        // Atomic status transition: only one concurrent request can win this UPDATE.
        // Two simultaneous requests both see status='draft'; the first UPDATE succeeds and
        // sets status='queued'; the second runs, finds status no longer in [draft,scheduled],
        // gets 0 rows affected, and aborts. No duplicate deliveries or jobs.
        $locked = DB::table('communications')
            ->where('id', $communication->id)
            ->whereIn('status', ['draft', 'scheduled'])
            ->update(['status' => 'queued']);

        if (!$locked) {
            abort(422, 'This communication has already been sent, is processing, or was cancelled.');
        }

        $fresh = $communication->fresh();
        $this->commService->dispatch($fresh);

        // Semantic log — observer's generic 'updated' does not capture the dispatch intent.
        ActivityLogger::log('communication.dispatched', $fresh->fresh());

        return response()->json($communication->fresh()->load('createdBy'));
    }

    public function cancel(Request $request, Communication $communication)
    {
        abort_if(
            $communication->school_id !== $request->user()->school_id,
            403
        );

        abort_if(
            in_array($communication->status, ['processing', 'completed', 'failed', 'cancelled']),
            422,
            'Cannot cancel a communication that is already processing, completed, or failed.'
        );

        $communication->update(['status' => 'cancelled']);

        // Observer handles 'updated' audit log.

        return response()->json($communication->fresh());
    }

    public function deliveries(Request $request, Communication $communication)
    {
        abort_if(
            $communication->school_id !== $request->user()->school_id,
            403
        );

        $request->validate([
            'delivery_status' => 'nullable|in:pending,queued,sent,delivered,failed,skipped',
            'channel'         => 'nullable|in:sms,email,announcement',
            'from_date'       => 'nullable|date',
            'to_date'         => 'nullable|date|after_or_equal:from_date',
            'per_page'        => 'nullable|integer|min:1|max:100',
        ]);

        $deliveries = $communication->deliveries()
            ->when($request->delivery_status, fn($q) => $q->where('delivery_status', $request->delivery_status))
            ->when($request->channel,         fn($q) => $q->where('channel',         $request->channel))
            ->when($request->from_date,       fn($q) => $q->whereDate('created_at',  '>=', $request->from_date))
            ->when($request->to_date,         fn($q) => $q->whereDate('created_at',  '<=', $request->to_date))
            ->orderBy('id', 'desc')
            ->paginate((int) ($request->per_page ?? 50));

        return response()->json($deliveries);
    }
}
