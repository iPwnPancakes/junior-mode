<?php

use App\Support\RepositoryRemoteNormalizer;

test('equivalent Git remote formats normalize to one repository identity', function (string $remote) {
    $normalizer = new RepositoryRemoteNormalizer;

    expect($normalizer->normalize($remote))->toBe('github.com/openai/codex');
})->with([
    'HTTPS' => 'https://github.com/OpenAI/Codex.git',
    'HTTPS default port' => 'https://github.com:443/openai/codex/',
    'SSH URL' => 'ssh://git@github.com/OpenAI/Codex.git',
    'SCP-like SSH' => 'git@github.com:OpenAI/Codex.git',
    'canonical value' => 'github.com/openai/codex',
]);

test('non-default ports remain part of normalized remote identity', function () {
    $normalizer = new RepositoryRemoteNormalizer;

    expect($normalizer->normalize('ssh://git@example.com:2222/team/app.git'))
        ->toBe('example.com:2222/team/app');
});

test('invalid and repository-less remotes are rejected', function (string $remote) {
    expect(fn () => (new RepositoryRemoteNormalizer)->normalize($remote))
        ->toThrow(InvalidArgumentException::class);
})->with(['', '/work/project', 'file:///work/project', 'https://github.com']);
