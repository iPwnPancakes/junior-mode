<?php

namespace App\Actions;

use App\Models\EnrolledRepository;
use App\Support\RepositoryRemoteNormalizer;
use Illuminate\Validation\ValidationException;

class UpdateEnrolledRepository
{
    public function __construct(private RepositoryRemoteNormalizer $remoteNormalizer) {}

    /** @param array{display_name: string, remote_url?: string|null, local_path?: string|null} $attributes */
    public function handle(EnrolledRepository $repository, array $attributes): EnrolledRepository
    {
        $normalizedRemote = isset($attributes['remote_url'])
            ? $this->remoteNormalizer->normalize($attributes['remote_url'])
            : null;
        $remoteFingerprint = $normalizedRemote === null
            ? null
            : $this->remoteNormalizer->fingerprint($normalizedRemote);

        $remoteBelongsToAnotherRepository = $remoteFingerprint !== null
            && EnrolledRepository::query()
                ->where('learner_id', $repository->learner_id)
                ->where('remote_fingerprint', $remoteFingerprint)
                ->whereKeyNot($repository->id)
                ->exists();

        if ($remoteBelongsToAnotherRepository) {
            throw ValidationException::withMessages([
                'remote_url' => __('That Git remote already identifies another repository for this Learner.'),
            ]);
        }

        $repository->update([
            'display_name' => $attributes['display_name'],
            'normalized_remote' => $normalizedRemote,
            'remote_fingerprint' => $remoteFingerprint,
            'local_path' => $attributes['local_path'] ?? null,
        ]);

        return $repository;
    }
}
