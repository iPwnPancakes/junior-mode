<?php

namespace App\Rules;

use App\Support\RepositoryRemoteNormalizer;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;
use InvalidArgumentException;

class GitRemote implements ValidationRule
{
    public function __construct(private RepositoryRemoteNormalizer $normalizer) {}

    /**
     * Run the validation rule.
     *
     * @param  Closure(string, ?string=): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            $fail('The :attribute must be a valid Git remote.');

            return;
        }

        try {
            $this->normalizer->normalize($value);
        } catch (InvalidArgumentException) {
            $fail('The :attribute must be a valid SSH, HTTPS, HTTP, or Git remote.');
        }
    }
}
