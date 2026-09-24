<?php

namespace App\Actions;

use App\Models\EnrolledRepository;
use App\Models\User;
use App\Support\RepositoryRemoteNormalizer;
use Illuminate\Support\Str;

class EnrollRepository
{
    public function __construct(private RepositoryRemoteNormalizer $remoteNormalizer) {}

    /** @param array{display_name: string, remote_url?: string|null, local_path?: string|null} $attributes */
    public function handle(User $learner, array $attributes): EnrolledRepository
    {
        $normalizedRemote = isset($attributes['remote_url'])
            ? $this->remoteNormalizer->normalize($attributes['remote_url'])
            : null;
        $remoteFingerprint = $normalizedRemote === null
            ? null
            : $this->remoteNormalizer->fingerprint($normalizedRemote);

        $repository = $remoteFingerprint === null
            ? new EnrolledRepository(['identity' => (string) Str::uuid()])
            : EnrolledRepository::query()->firstOrNew([
                'learner_id' => $learner->id,
                'remote_fingerprint' => $remoteFingerprint,
            ], ['identity' => (string) Str::uuid()]);

        $repository->fill([
            'learner_id' => $learner->id,
            'display_name' => $attributes['display_name'],
            'normalized_remote' => $normalizedRemote,
            'remote_fingerprint' => $remoteFingerprint,
            'local_path' => $attributes['local_path'] ?? null,
            'enrolled_at' => now(),
            'unenrolled_at' => null,
        ])->save();

        return $repository;
    }
}
