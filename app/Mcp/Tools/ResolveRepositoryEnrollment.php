<?php

namespace App\Mcp\Tools;

use App\Models\EnrolledRepository;
use App\Models\User;
use App\Rules\GitRemote;
use App\Support\CurrentClientConnection;
use App\Support\RepositoryRemoteNormalizer;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\ResponseFactory;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[Description('Resolve whether the connected Learner has explicitly enrolled the current repository for Junior Mode. Contract version: 1.')]
#[IsReadOnly]
class ResolveRepositoryEnrollment extends Tool
{
    public function __construct(
        private CurrentClientConnection $currentClientConnection,
        private RepositoryRemoteNormalizer $remoteNormalizer,
    ) {}

    public function handle(Request $request): Response|ResponseFactory
    {
        $learner = $request->user();
        $clientConnection = $this->currentClientConnection->get();

        if (! $learner instanceof User
            || ! $learner->isLearner()
            || $clientConnection === null
            || $clientConnection->learner_id !== $learner->id) {
            return Response::error('The authenticated client connection could not be resolved.');
        }

        $validated = $request->validate([
            'contract_version' => ['required', 'string', 'in:1'],
            'repository_identity' => ['nullable', 'uuid', 'required_without:remote_url'],
            'remote_url' => [
                'nullable',
                'string',
                'max:2048',
                'required_without:repository_identity',
                new GitRemote($this->remoteNormalizer),
            ],
        ]);

        $normalizedRemote = isset($validated['remote_url'])
            ? $this->remoteNormalizer->normalize($validated['remote_url'])
            : null;
        $repository = $this->resolveRepository(
            $learner,
            $validated['repository_identity'] ?? null,
            $normalizedRemote,
        );

        if ($repository !== null
            && $normalizedRemote !== null
            && $repository->normalized_remote !== null
            && $repository->normalized_remote !== $normalizedRemote) {
            return Response::error('The repository identity and normalized remote refer to different repositories.');
        }

        return Response::structured([
            'contract_version' => '1',
            'enrolled' => $repository?->isEnrolled() ?? false,
            'normalized_remote' => $normalizedRemote,
            'repository' => $repository === null ? null : [
                'identity' => $repository->identity,
                'display_name' => $repository->display_name,
                'local_path' => $repository->local_path,
                'enrolled_at' => $repository->enrolled_at->toAtomString(),
                'unenrolled_at' => $repository->unenrolled_at?->toAtomString(),
            ],
        ]);
    }

    private function resolveRepository(
        User $learner,
        ?string $repositoryIdentity,
        ?string $normalizedRemote,
    ): ?EnrolledRepository {
        if ($repositoryIdentity !== null) {
            return $learner->enrolledRepositories()
                ->where('identity', $repositoryIdentity)
                ->first();
        }

        if ($normalizedRemote === null) {
            return null;
        }

        return $learner->enrolledRepositories()
            ->where('remote_fingerprint', $this->remoteNormalizer->fingerprint($normalizedRemote))
            ->first();
    }

    /**
     * Get the tool's input schema.
     *
     * @return array<string, Type>
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'contract_version' => $schema->string()
                ->enum(['1'])
                ->description('Repository enrollment contract version. Use 1.')
                ->required(),
            'repository_identity' => $schema->string()
                ->description('Stable generated repository UUID returned by Junior Mode, required when no remote is available.')
                ->nullable(),
            'remote_url' => $schema->string()
                ->description('The Git remote URL reported by the local clone, if available.')
                ->nullable(),
        ];
    }
}
