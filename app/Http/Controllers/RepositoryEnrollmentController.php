<?php

namespace App\Http\Controllers;

use App\Actions\SetRepositoryEnrollment;
use App\Models\EnrolledRepository;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class RepositoryEnrollmentController extends Controller
{
    public function store(
        User $learner,
        EnrolledRepository $enrolledRepository,
        SetRepositoryEnrollment $setRepositoryEnrollment,
    ): RedirectResponse {
        Gate::authorize('update', $enrolledRepository);
        $setRepositoryEnrollment->handle($enrolledRepository, true);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Repository re-enrolled for Junior Mode.'),
        ]);

        return to_route('enrolled-repositories.index');
    }

    public function destroy(
        User $learner,
        EnrolledRepository $enrolledRepository,
        SetRepositoryEnrollment $setRepositoryEnrollment,
    ): RedirectResponse {
        Gate::authorize('delete', $enrolledRepository);
        $setRepositoryEnrollment->handle($enrolledRepository, false);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Repository unenrolled. Existing learning evidence was preserved.'),
        ]);

        return to_route('enrolled-repositories.index');
    }
}
