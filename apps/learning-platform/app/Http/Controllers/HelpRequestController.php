<?php

namespace App\Http\Controllers;

use App\Models\HelpRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class HelpRequestController extends Controller
{
    public function index(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();
        $snapshots = HelpRequest::query()
            ->when($user->isLearner(), fn ($query) => $query->where('learner_id', $user->id),
                fn ($query) => $query->where('mentor_id', $user->id)->whereNotNull('shared_at')
                    ->whereHas('learner', fn ($query) => $query->where('mentor_id', $user->id)))
            ->with('learner:id,name')
            ->latest()->limit(50)->get()
            ->map(fn (HelpRequest $snapshot): array => [
                'id' => $snapshot->id,
                'title' => data_get($snapshot->payload, 'facts.task.title'),
                'learnerName' => $snapshot->learner->name,
                'shared' => $snapshot->shared_at !== null,
                'createdAt' => $snapshot->created_at->toFormattedDateString(),
            ]);

        return Inertia::render('help-requests/index', ['helpRequests' => $snapshots]);
    }

    public function show(Request $request, HelpRequest $helpRequest): Response
    {
        Gate::authorize('view', $helpRequest);
        /** @var User $user */
        $user = $request->user();
        $mentor = $helpRequest->learner->mentor;
        $canShare = $user->id === $helpRequest->learner_id && $helpRequest->shared_at === null && $mentor?->isMentor();
        $previewToken = $canShare ? Str::random(64) : null;
        if ($canShare) {
            $request->session()->put('help_request_previews.'.$helpRequest->id, [
                'token' => $previewToken,
                'fingerprint' => $helpRequest->fingerprint,
                'mentor_id' => $mentor->id,
            ]);
        }

        return Inertia::render('help-requests/show', [
            'helpRequest' => ['id' => $helpRequest->id, 'payload' => $helpRequest->payload, 'sharedAt' => $helpRequest->shared_at?->toFormattedDateString()],
            'learnerName' => $helpRequest->learner->name,
            'canShare' => (bool) $canShare,
            'mentorName' => $mentor?->name,
            'previewToken' => $previewToken,
        ]);
    }

    public function share(Request $request, HelpRequest $helpRequest): RedirectResponse
    {
        Gate::authorize('share', $helpRequest);
        $data = $request->validate(['preview_token' => ['required', 'string'], 'reviewed' => ['accepted']]);
        $preview = $request->session()->get('help_request_previews.'.$helpRequest->id);
        abort_unless(is_array($preview) && hash_equals($preview['token'], $data['preview_token'])
            && hash_equals($preview['fingerprint'], $helpRequest->fingerprint), 403, 'Review this Help Request before sharing it.');

        DB::transaction(function () use ($helpRequest, $preview): void {
            $locked = HelpRequest::query()->lockForUpdate()->findOrFail($helpRequest->id);
            $learner = User::query()->lockForUpdate()->findOrFail($locked->learner_id);
            abort_unless($learner->mentor_id === $preview['mentor_id'] && $learner->mentor?->isMentor(), 403, 'The Mentor relationship changed. Review the Help Request again.');
            if ($locked->shared_at === null) {
                $locked->update(['mentor_id' => $learner->mentor_id, 'shared_at' => now()]);
            }
        });

        return to_route('help-requests.show', $helpRequest);
    }
}
