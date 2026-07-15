<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CommunicationTemplate;
use App\Services\TemplateService;
use Illuminate\Http\Request;

class CommunicationTemplateController extends Controller
{
    public function __construct(private TemplateService $templates) {}

    public function index(Request $request)
    {
        $request->validate([
            'search'    => 'nullable|string|max:100',
            'channel'   => 'nullable|in:sms,email,announcement',
            'is_active' => 'nullable|boolean',
            'per_page'  => 'nullable|integer|min:1|max:100',
        ]);

        $templates = CommunicationTemplate::query()
            ->when($request->search,              fn($q) => $q->where('name', 'like', "%{$request->search}%"))
            ->when($request->channel,             fn($q) => $q->where('channel', $request->channel))
            ->when($request->filled('is_active'), fn($q) => $q->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN)))
            ->orderBy('channel')
            ->orderBy('name')
            ->paginate((int) ($request->per_page ?? 50));

        return response()->json($templates);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'           => 'required|string|max:150',
            'channel'        => 'required|in:sms,email,announcement',
            'subject'        => 'nullable|string|max:255',
            'body'           => 'required|string',
            'variables_json' => 'nullable|array',
            'is_active'      => 'boolean',
        ]);

        if (empty($data['variables_json'])) {
            $data['variables_json'] = $this->templates->extractVariables($data['body']);
        }

        $template = CommunicationTemplate::create($data);

        // Observer handles 'created' audit log.

        return response()->json($template, 201);
    }

    public function show(CommunicationTemplate $communicationTemplate)
    {
        return response()->json($communicationTemplate);
    }

    public function update(Request $request, CommunicationTemplate $communicationTemplate)
    {
        $data = $request->validate([
            'name'           => 'sometimes|string|max:150',
            'channel'        => 'sometimes|in:sms,email,announcement',
            'subject'        => 'nullable|string|max:255',
            'body'           => 'sometimes|string',
            'variables_json' => 'nullable|array',
            'is_active'      => 'boolean',
        ]);

        if (isset($data['body'])) {
            $data['variables_json'] = $this->templates->extractVariables($data['body']);
        }

        $communicationTemplate->update($data);

        // Observer handles 'updated' audit log.

        return response()->json($communicationTemplate->fresh());
    }

    public function destroy(CommunicationTemplate $communicationTemplate)
    {
        // Observer handles 'deleted' audit log.
        $communicationTemplate->delete();

        return response()->json(['message' => 'Template deleted.']);
    }

    public function restore(int $id, Request $request)
    {
        $template = CommunicationTemplate::withTrashed()
            ->where('id', $id)
            ->where('school_id', $request->user()->school_id)
            ->firstOrFail();

        $template->restore();

        // Observer handles 'restored' audit log.

        return response()->json($template);
    }
}
