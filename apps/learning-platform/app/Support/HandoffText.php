<?php

namespace App\Support;

class HandoffText
{
    public function clean(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        if (preg_match('/```|<\?php|-----BEGIN|(?:^|\n)\s*(?:import\s|export\s|function\s|class\s|def\s|const\s|let\s|namespace\s)|(?:^|\n)\s*(?:user|assistant|system|developer):|\b(?:hidden notes?|raw transcript|lazy|stupid|incompetent|bad at coding|emotionally|frustrated|anxious)\b/i', $value)) {
            return '[Excluded: private conversation, source content, or personal judgment]';
        }

        $value = preg_replace('/\b(?:Bearer\s+\S+|(?:sk|ghp|github_pat|jm)[_-][A-Za-z0-9_-]{12,}|AKIA[A-Z0-9]{16})\b/i', '[redacted]', $value) ?? '';
        $value = preg_replace('/\b(?:password|passwd|secret|token|api[_ -]?key|authorization)\s*[:=]\s*[^\r\n]+/i', '[redacted credential]', $value) ?? '';
        $value = preg_replace_callback('~https?://[^\s<>]+~i', function (array $match): string {
            $parts = parse_url($match[0]);

            if (! is_array($parts) || ! isset($parts['host'])) {
                return '[redacted URL]';
            }

            return ($parts['scheme'] ?? 'https').'://'.$parts['host'].(isset($parts['port']) ? ':'.$parts['port'] : '').($parts['path'] ?? '');
        }, $value) ?? '';

        return mb_substr($value, 0, 800);
    }

    /** @param array<int, string> $values
     * @return array<int, string>
     */
    public function lines(array $values): array
    {
        return array_map(fn (string $value): string => $this->clean($value) ?? '', array_slice($values, 0, 10));
    }
}
