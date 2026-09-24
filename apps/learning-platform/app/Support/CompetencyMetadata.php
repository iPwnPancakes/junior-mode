<?php

namespace App\Support;

use Illuminate\Support\Arr;
use Illuminate\Support\Str;

class CompetencyMetadata
{
    /**
     * @param  array<string, mixed>  $data
     * @return array{prerequisites: array<int, string>|null, work_opportunities: array<int, string>|null, technologies: array<int, string>|null}
     */
    public static function fromForm(array $data): array
    {
        return [
            'prerequisites' => self::parse(Arr::get($data, 'prerequisites')),
            'work_opportunities' => self::parse(Arr::get($data, 'work_opportunities')),
            'technologies' => self::parse(Arr::get($data, 'technologies')),
        ];
    }

    /** @return array<int, string>|null */
    private static function parse(mixed $value): ?array
    {
        if (! is_string($value) || Str::of($value)->trim()->isEmpty()) {
            return null;
        }

        $entries = Str::of($value)
            ->explode(',')
            ->map(fn (string $entry): string => Str::of($entry)->trim()->toString())
            ->filter()
            ->unique()
            ->values()
            ->all();

        return $entries === [] ? null : $entries;
    }
}
