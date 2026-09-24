<?php

namespace App\Support;

use Illuminate\Support\Str;
use InvalidArgumentException;

class RepositoryRemoteNormalizer
{
    public function normalize(string $remote): string
    {
        $remote = trim($remote);

        if ($remote === '') {
            throw new InvalidArgumentException('A Git remote cannot be empty.');
        }

        if (! Str::contains($remote, '://')
            && preg_match('/^(?:[^@\/:\s]+@)?(?<host>[^\/:\s]+):(?<path>[^\s]+)$/', $remote, $matches) === 1) {
            return $this->format($matches['host'], null, $matches['path']);
        }

        if (! Str::contains($remote, '://')
            && preg_match('/^(?<host>[^\/\s]+)\/(?<path>[^\s]+)$/', $remote, $matches) === 1) {
            return $this->format($matches['host'], null, $matches['path']);
        }

        $parts = parse_url($remote);

        if (! is_array($parts) || ! isset($parts['scheme'], $parts['host'], $parts['path'])) {
            throw new InvalidArgumentException('The Git remote must be an SSH, HTTPS, HTTP, or Git URL.');
        }

        $scheme = Str::lower($parts['scheme']);

        if (! in_array($scheme, ['git', 'http', 'https', 'ssh'], true)) {
            throw new InvalidArgumentException('The Git remote must use SSH, HTTPS, HTTP, or Git.');
        }

        $port = $parts['port'] ?? null;
        $defaultPort = match ($scheme) {
            'http' => 80,
            'https' => 443,
            'ssh' => 22,
            default => null,
        };

        return $this->format($parts['host'], $port === $defaultPort ? null : $port, $parts['path']);
    }

    public function fingerprint(string $normalizedRemote): string
    {
        return hash('sha256', $normalizedRemote);
    }

    private function format(string $host, ?int $port, string $path): string
    {
        $normalizedPath = Str::of($path)
            ->before('?')
            ->before('#')
            ->trim('/')
            ->replaceEnd('.git', '')
            ->trim('/')
            ->lower()
            ->toString();

        if ($normalizedPath === '') {
            throw new InvalidArgumentException('The Git remote must identify a repository path.');
        }

        $normalizedHost = Str::lower($host);

        return $normalizedHost.($port === null ? '' : ':'.$port).'/'.$normalizedPath;
    }
}
