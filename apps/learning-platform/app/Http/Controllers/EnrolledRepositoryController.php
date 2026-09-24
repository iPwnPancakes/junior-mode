<?php

namespace App\Http\Controllers;

use App\Actions\EnrollRepository;
use App\Actions\UpdateEnrolledRepository;
use App\Http\Requests\StoreEnrolledRepositoryRequest;
use App\Http\Requests\UpdateEnrolledRepositoryRequest;
use App\Models\EnrolledRepository;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class EnrolledRepositoryController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', EnrolledRepository::class);

        /** @var User $user */
        $user = $request->user();

        if ($user->isLearner()) {
            return Inertia::render('enrolled-repositories/index', [
                'viewerRole' => $user->role->value,
                'learner' => $this->serializeLearner($user),
                'learners' => [],
            ]);
        }

        return Inertia::render('enrolled-repositories/index', [
            'viewerRole' => $user->role->value,
            'learner' => null,
            'learners' => $user->learners()
                ->with('enrolledRepositories')
                ->latest()
                ->get()
                ->map(fn (User $learner): array => $this->serializeLearner($learner)),
        ]);
    }

    public function store(
        StoreEnrolledRepositoryRequest $request,
        User $learner,
        EnrollRepository $enrollRepository,
    ): RedirectResponse {
        $enrollRepository->handle($learner, $request->repositoryAttributes());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Repository enrolled for Junior Mode.'),
        ]);

        return to_route('enrolled-repositories.index');
    }

    public function update(
        UpdateEnrolledRepositoryRequest $request,
        User $learner,
        EnrolledRepository $enrolledRepository,
        UpdateEnrolledRepository $updateEnrolledRepository,
    ): RedirectResponse {
        $updateEnrolledRepository->handle($enrolledRepository, $request->repositoryAttributes());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Repository details updated.'),
        ]);

        return to_route('enrolled-repositories.index');
    }

    /** @return array{id: int, name: string, email: string, repositories: array<int, array<string, mixed>>} */
    private function serializeLearner(User $learner): array
    {
        $learner->loadMissing('enrolledRepositories');

        return [
            'id' => $learner->id,
            'name' => $learner->name,
            'email' => $learner->email,
            'repositories' => $learner->enrolledRepositories
                ->map(fn (EnrolledRepository $repository): array => $this->serializeRepository($repository))
                ->values()
                ->all(),
        ];
    }

    /** @return array{id: int, identity: string, displayName: string, normalizedRemote: string|null, localPath: string|null, status: string, enrolledAt: string, unenrolledAt: string|null} */
    private function serializeRepository(EnrolledRepository $repository): array
    {
        return [
            'id' => $repository->id,
            'identity' => $repository->identity,
            'displayName' => $repository->display_name,
            'normalizedRemote' => $repository->normalized_remote,
            'localPath' => $repository->local_path,
            'status' => $repository->isEnrolled() ? 'enrolled' : 'unenrolled',
            'enrolledAt' => $repository->enrolled_at->toDateString(),
            'unenrolledAt' => $repository->unenrolled_at?->toDateString(),
        ];
    }
}
