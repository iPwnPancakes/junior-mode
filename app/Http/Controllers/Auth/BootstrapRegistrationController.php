<?php

namespace App\Http\Controllers\Auth;

use App\Actions\Fortify\CreateNewUser;
use App\Http\Controllers\Controller;
use App\Http\Requests\BootstrapRegistrationRequest;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class BootstrapRegistrationController extends Controller
{
    public function create(): Response
    {
        abort_if(User::query()->exists(), 404);

        return Inertia::render('auth/register', [
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
        ]);
    }

    public function store(
        BootstrapRegistrationRequest $request,
        CreateNewUser $createNewUser,
    ): RedirectResponse {
        abort_if(User::query()->exists(), 404);

        $user = $createNewUser->create($request->validated());

        event(new Registered($user));
        Auth::login($user);
        $request->session()->regenerate();

        return to_route('dashboard');
    }
}
