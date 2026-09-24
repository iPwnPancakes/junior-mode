<?php

namespace App\Support;

use Illuminate\Validation\ValidationException;

class LearningContract
{
    /** @param array<mixed> $data */
    public static function hash(array $data): string
    {
        return hash('sha256', json_encode(self::canonicalize($data), JSON_THROW_ON_ERROR));
    }

    /**
     * @param  array<mixed>  $data
     * @return array<mixed>
     */
    private static function canonicalize(array $data): array
    {
        if (! array_is_list($data)) {
            ksort($data);
        }
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $data[$key] = self::canonicalize($value);
            }
        }

        return $data;
    }

    /** @param array<mixed> $data */
    public static function validateSummaries(array $data): void
    {
        array_walk_recursive($data, function (mixed $value): void {
            if (is_string($value) && preg_match('/```|-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:sk-|gh[pousr]_|github_pat_|jm_)[A-Za-z0-9_-]{20,}|\bBearer\s+[A-Za-z0-9._-]{12,}|(?:password|api[_-]?key|access[_-]?token)\s*[:=]\s*\S+/i', $value)) {
                throw ValidationException::withMessages(['evidence' => 'Use concise factual summaries without code blocks, credentials or raw conversations.']);
            }
        });
    }
}
