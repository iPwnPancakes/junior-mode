<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateMentorCoachingSettingsRequest;
use Illuminate\Http\RedirectResponse;

class MentorCoachingSettingsController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(UpdateMentorCoachingSettingsRequest $request): RedirectResponse
    {
        $request->user()->update($request->validated());

        return back()->with('success', 'Default priority duration updated.');
    }
}
