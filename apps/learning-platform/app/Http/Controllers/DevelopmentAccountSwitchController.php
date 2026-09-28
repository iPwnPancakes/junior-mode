<?php

namespace App\Http\Controllers;

use App\Actions\SwitchDevelopmentAccount;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DevelopmentAccountSwitchController extends Controller
{
    /**
     * Switch between a Mentor and their paired Learner without a password.
     * Only local installations expose this.
     */
    public function __invoke(Request $request, SwitchDevelopmentAccount $switchDevelopmentAccount): RedirectResponse
    {
        abort_unless(app()->isLocal(), 404);

        Auth::login($switchDevelopmentAccount->handle($request->user()));
        $request->session()->regenerate();

        return to_route('dashboard');
    }
}
