<?php

namespace App\Http\Requests;

use App\Models\EnrolledRepository;
use App\Rules\GitRemote;
use App\Support\RepositoryRemoteNormalizer;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateEnrolledRepositoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        $repository = $this->route('enrolledRepository');

        return $repository instanceof EnrolledRepository
            && $this->user()?->can('update', $repository) === true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'display_name' => ['required', 'string', 'max:120'],
            'remote_url' => ['nullable', 'string', 'max:2048', new GitRemote(new RepositoryRemoteNormalizer)],
            'local_path' => ['nullable', 'string', 'max:4096'],
        ];
    }

    /** @return array{display_name: string, remote_url: string|null, local_path: string|null} */
    public function repositoryAttributes(): array
    {
        $validated = $this->validated();

        return [
            'display_name' => $this->string('display_name')->value(),
            'remote_url' => is_string($validated['remote_url'] ?? null) ? $validated['remote_url'] : null,
            'local_path' => is_string($validated['local_path'] ?? null) ? $validated['local_path'] : null,
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'remote_url' => $this->string('remote_url')->trim()->value() ?: null,
            'local_path' => $this->string('local_path')->trim()->value() ?: null,
        ]);
    }
}
