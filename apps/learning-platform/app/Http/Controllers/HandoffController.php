<?php

namespace App\Http\Controllers;

use App\Models\HandoffSnapshot;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class HandoffController extends Controller
{
    public function index(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();
        $snapshots = HandoffSnapshot::query()
            ->when($user->isLearner(), fn ($query) => $query->where('learner_id', $user->id),
                fn ($query) => $query->where('mentor_id', $user->id)->whereNotNull('shared_at')
                    ->whereHas('learner', fn ($query) => $query->where('mentor_id', $user->id)))
            ->latest()->limit(50)->get()
            ->map(fn (HandoffSnapshot $snapshot): array => [
                'id' => $snapshot->id,
                'title' => data_get($snapshot->payload, 'facts.task.title'),
                'shared' => $snapshot->shared_at !== null,
                'createdAt' => $snapshot->created_at->toDateTimeString(),
            ]);

        return Inertia::render('handoffs/index', ['handoffs' => $snapshots]);
    }

    public function show(Request $request, HandoffSnapshot $handoff): Response
    {
        Gate::authorize('view', $handoff);
        /** @var User $user */
        $user = $request->user();
        $mentor = $handoff->learner->mentor;
        $canShare = $user->id === $handoff->learner_id && $handoff->shared_at === null && $mentor?->isMentor();
        $previewToken = $canShare ? Str::random(64) : null;
        if ($canShare) {
            $request->session()->put('handoff_previews.'.$handoff->id, [
                'token' => $previewToken,
                'fingerprint' => $handoff->fingerprint,
                'mentor_id' => $mentor->id,
            ]);
        }

        return Inertia::render('handoffs/show', [
            'handoff' => ['id' => $handoff->id, 'payload' => $handoff->payload, 'sharedAt' => $handoff->shared_at?->toDateTimeString()],
            'canShare' => (bool) $canShare,
            'mentorName' => $mentor?->name,
            'previewToken' => $previewToken,
        ]);
    }

    public function share(Request $request, HandoffSnapshot $handoff): RedirectResponse
    {
        Gate::authorize('share', $handoff);
        $data = $request->validate(['preview_token' => ['required', 'string'], 'reviewed' => ['accepted']]);
        $preview = $request->session()->get('handoff_previews.'.$handoff->id);
        abort_unless(is_array($preview) && hash_equals($preview['token'], $data['preview_token'])
            && hash_equals($preview['fingerprint'], $handoff->fingerprint), 403, 'Review this handoff before sharing it.');

        DB::transaction(function () use ($handoff, $preview): void {
            $locked = HandoffSnapshot::query()->lockForUpdate()->findOrFail($handoff->id);
            $learner = User::query()->lockForUpdate()->findOrFail($locked->learner_id);
            abort_unless($learner->mentor_id === $preview['mentor_id'] && $learner->mentor?->isMentor(), 403, 'The Mentor relationship changed. Review the handoff again.');
            if ($locked->shared_at === null) {
                $locked->update(['mentor_id' => $learner->mentor_id, 'shared_at' => now()]);
            }
        });

        return to_route('handoffs.show', $handoff);
    }
}
